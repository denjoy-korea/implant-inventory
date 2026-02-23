# Design: 법령 준수 회원 탈퇴/계정 관리 (withdrawal-process)

## 메타
- **Feature**: withdrawal-process
- **작성일**: 2026-02-23
- **Phase**: Phase 1
- **선행 문서**: `docs/01-plan/features/withdrawal-process.plan.md`

---

## 1. 코드베이스 현황 분석

### 1-1. 기존 구현 재검토 (Plan 이후 정밀 분석)

```
delete_my_account() RPC 현재 흐름:
  ① profiles에서 _hospital_id 조회
  ② hospitals DELETE (master_admin_id = _user_id) ← CASCADE로 surgery_records 삭제
  ③ auth.users DELETE ← CASCADE로 profiles 삭제 (name, phone 포함)
```

| 데이터 | 현재 처리 | 개인정보보호법 §21 준수? |
|--------|-----------|----------------------|
| profiles.name, profiles.phone | auth.users CASCADE 삭제 | ✅ |
| surgery_records.patient_info | hospitals CASCADE 삭제 | ✅ |
| auth.users (이메일 등) | 직접 삭제 | ✅ |
| withdrawal_reasons | 5년 보관 (email 필드) | ✅ 보존 목적 유지 |

**결론**: 탈퇴 시 PII 삭제 자체는 CASCADE로 정상 처리됨. 추가 익명화 RPC 수정 불필요.

### 1-2. 수술기록 보존 정책 (이미 구현됨)

`supabase/030_surgery_retention.sql`:
- 활성 병원: 최대 24개월 보관 → pg_cron 매일 03:00 KST 자동 파기 ✅
- 병원/계정 삭제 시: CASCADE 즉시 파기 ✅
- Plan 문서의 "2년 보관 후 파기" 요건 이미 충족됨

### 1-3. 실제 갭 (3가지)

| 갭 | 위치 | 우선순위 |
|----|------|---------|
| **G-1**: paused 사용자가 서비스에 계속 접근 가능 | `useAppState.ts`, `types.ts`, UI | High |
| **G-2**: 비활성화/재활성화에 감사 로그 없음 | `SystemAdminDashboard.tsx` | Medium |
| **G-3**: admin 강제 삭제에 감사 로그 없음 | `admin-delete-user/index.ts` | Medium |

---

## 2. DB 스키마 현황

### 2-1. operation_logs 테이블

```sql
CREATE TABLE operation_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,  -- ⚠️ NOT NULL
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  TEXT NOT NULL,
  user_name   TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**제약사항**: `hospital_id NOT NULL` → admin이 타 병원 사용자를 비활성화할 때, 대상 user의 hospital_id를 사용해 기록 가능 (admin은 자신의 hospital_id가 없음)

**설계 결정**: Phase 1에서 hospital_id 스키마 변경 없이, **대상 사용자의 hospital_id**를 사용해 기록.
- 대상 hospital_id가 없는 경우(pending 상태 등): operation_logs 기록 생략, withdrawal_reasons로 대체

### 2-2. surgery_records 테이블 구조

```sql
CREATE TABLE surgery_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id  UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  date         DATE,
  patient_info TEXT,   -- 환자명 + 차트번호 (단일 필드)
  tooth_number TEXT,
  quantity     INTEGER DEFAULT 1,
  ...
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

`patient_info`: 환자 식별 정보 단일 TEXT 필드. hospitals 삭제 시 CASCADE 자동 파기.

### 2-3. View 타입 (types.ts:153)

```typescript
export type View = 'landing' | 'login' | 'signup' | 'invite' | 'dashboard'
  | 'admin_panel' | 'pricing' | 'contact' | 'value' | 'analyze'
  | 'notices' | 'mfa_otp' | 'reviews';
// 추가 필요: 'suspended'
```

---

## 3. 구현 명세

### G-1: paused 접근 차단

#### 3-1-A. `types.ts` — View 타입 확장

```typescript
// types.ts:153 수정
export type View = 'landing' | 'login' | 'signup' | 'invite' | 'dashboard'
  | 'admin_panel' | 'pricing' | 'contact' | 'value' | 'analyze'
  | 'notices' | 'mfa_otp' | 'reviews' | 'suspended';  // 추가
```

#### 3-1-B. `hooks/useAppState.ts` — loadHospitalData 차단 로직

현재 코드 (line 66):
```typescript
if (!user.hospitalId || (user.status !== 'active' && user.status !== 'readonly')) {
  setState(prev => ({ ...prev, user, currentView: 'dashboard', ... }));
  return;
}
```

수정 후:
```typescript
// paused 상태: 서비스 접근 차단 화면으로 라우팅
if (user.status === 'paused') {
  setState(prev => ({ ...prev, user, currentView: 'suspended', isLoading: false }));
  return;
}

if (!user.hospitalId || (user.status !== 'active' && user.status !== 'readonly')) {
  setState(prev => ({ ...prev, user, currentView: 'dashboard', isLoading: false, }));
  return;
}
```

#### 3-1-C. `App.tsx` — suspended 뷰 렌더링

렌더링 분기에서 `currentView === 'suspended'` 처리 추가:

```tsx
// App.tsx — 기존 public route 분기 근처에 추가
{state.currentView === 'suspended' && (
  <AccountSuspendedScreen
    userEmail={state.user?.email}
    onSignOut={() => authService.signOut()}
  />
)}
```

#### 3-1-D. `components/AccountSuspendedScreen.tsx` — 신규 컴포넌트

```tsx
interface Props {
  userEmail?: string;
  onSignOut: () => void;
}

const AccountSuspendedScreen: React.FC<Props> = ({ userEmail, onSignOut }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {/* lock icon */}
      </div>
      <h1 className="text-xl font-bold text-slate-800 mb-2">계정이 정지되었습니다</h1>
      <p className="text-sm text-slate-500 mb-2">
        {userEmail && <span className="font-medium">{userEmail}</span>}
      </p>
      <p className="text-sm text-slate-500 mb-6">
        계정 정지에 대한 문의는 서비스 운영팀에 연락해주세요.
      </p>
      <button onClick={onSignOut} className="w-full py-2.5 rounded-lg bg-slate-800 text-white text-sm font-medium">
        로그아웃
      </button>
    </div>
  </div>
);
```

---

### G-2: 비활성화/재활성화 감사 로그 (SystemAdminDashboard.tsx)

`handleDeactivateUser` / `handleReactivateUser`에 operation_logs INSERT 추가.

Admin은 자신의 hospital_id가 없으므로 **대상 사용자의 hospital_id**를 사용.

```typescript
// handleDeactivateUser 수정 (onConfirm 내부)
async () => {
  await supabase.from('profiles').update({ status: 'paused' }).eq('id', profile.id);

  // 감사 로그 (대상 사용자의 hospital_id 사용)
  if (profile.hospital_id) {
    await supabase.from('operation_logs').insert({
      hospital_id: profile.hospital_id,
      user_id: currentAdminId,          // 실행 admin의 user_id
      user_email: currentAdminEmail,    // 실행 admin의 email
      user_name: currentAdminName,      // 실행 admin의 name
      action: 'account_deactivated',
      description: `${profile.name || profile.email} 계정 정지`,
      metadata: {
        target_user_id: profile.id,
        target_email: profile.email,
        target_role: profile.role,
      },
    });
  }

  setProfiles(prev => prev.map(p =>
    p.id === profile.id ? { ...p, status: 'paused' as const } : p
  ));
}
```

```typescript
// handleReactivateUser 수정 (동일 패턴)
action: 'account_reactivated',
description: `${profile.name || profile.email} 계정 복구`,
```

**admin 정보 취득 방법**: `SystemAdminDashboard.tsx`에서 이미 사용자 정보(user prop 또는 state)를 보유 중 → currentAdminId, email, name을 props/state에서 참조.

---

### G-3: admin 강제 삭제 감사 로그 (admin-delete-user Edge Function)

삭제 성공 후 `operation_logs` INSERT. Edge Function은 service role key를 사용하므로 RLS bypass 가능.

```typescript
// admin-delete-user/index.ts — 삭제 성공 후 추가
const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId);
if (deleteError) { ... }

// 감사 로그 기록 (삭제 성공 시점, hospital_id 있으면 기록)
if (targetProfile?.hospital_id) {
  await supabase.from('operation_logs').insert({
    hospital_id: targetProfile.hospital_id,
    user_id: caller.id,
    user_email: caller.email ?? '',
    user_name: callerProfile?.name ?? '',
    action: 'account_force_deleted',
    description: `${targetProfile.name || targetUserId} 계정 강제 삭제`,
    metadata: {
      target_user_id: targetUserId,
      target_role: targetProfile.role,
      deleted_at: new Date().toISOString(),
    },
  }).catch((e: unknown) => console.error('[admin-delete-user] audit log failed:', e));
}

return new Response(JSON.stringify({ success: true }), ...);
```

**hospital_id 없는 경우 (pending 사용자 강제 삭제)**: operation_logs 기록 생략 (hospital_id NOT NULL 제약). 향후 Phase 2에서 별도 admin_audit_logs 테이블 도입 시 처리.

---

## 4. 파일별 변경 명세

| 파일 | 변경 유형 | 변경 내용 | 갭 |
|------|---------|---------|-----|
| `types.ts` | 수정 | View 타입에 `'suspended'` 추가 | G-1 |
| `hooks/useAppState.ts` | 수정 | loadHospitalData에 paused 분기 추가 | G-1 |
| `App.tsx` | 수정 | `currentView === 'suspended'` 렌더링 분기 추가 | G-1 |
| `components/AccountSuspendedScreen.tsx` | 신규 | 계정 정지 안내 화면 컴포넌트 | G-1 |
| `components/SystemAdminDashboard.tsx` | 수정 | handleDeactivateUser/handleReactivateUser에 operation_logs INSERT | G-2 |
| `supabase/functions/admin-delete-user/index.ts` | 수정 | 삭제 성공 후 operation_logs INSERT | G-3 |

**DB 마이그레이션 불필요** — operation_logs 스키마 변경 없이 기존 테이블 활용.

---

## 5. UI 흐름

### 5-1. paused 사용자 로그인 흐름

```
사용자 로그인
  → authService.getProfileById() → status: 'paused'
  → dbToUser() → user.status = 'paused'
  → loadHospitalData(user)
  → user.status === 'paused' 분기
  → setState({ currentView: 'suspended' })
  → <AccountSuspendedScreen /> 렌더링
  → 로그아웃 버튼만 노출, 서비스 UI 전체 차단
```

### 5-2. admin 비활성화 흐름 (기존 + 감사 로그 추가)

```
SystemAdminDashboard
  → 정지 버튼 클릭
  → ConfirmModal 표시 (기존)
  → 확인 클릭
  → profiles.status = 'paused' UPDATE
  → operation_logs INSERT (audit)  ← 신규
  → 로컬 state 업데이트
  → UI 뱃지: "정지" 표시
```

---

## 6. RLS 영향 분석

| 테이블 | 정책 | paused 사용자 영향 |
|--------|------|-----------------|
| profiles | 본인 데이터 SELECT/UPDATE | paused 사용자 → 앱이 'suspended' 뷰 렌더링 → API 호출 자체 없음 |
| hospitals | hospital_id 매핑 기반 | 접근 불가 (앱 레벨 차단) |
| operation_logs | user_id = auth.uid() INSERT | admin만 실행, paused 사용자 해당 없음 |

**추가 RLS 정책 불필요**: 앱 레벨 차단으로 충분. paused 상태에서 직접 API 호출이 우려될 경우 Phase 2에서 RLS WHERE 조건에 `status != 'paused'` 추가 검토.

---

## 7. 구현 순서 (Do Phase 가이드)

```
1. types.ts — View 타입 'suspended' 추가 (1분)
2. hooks/useAppState.ts — loadHospitalData paused 분기 추가 (5분)
3. components/AccountSuspendedScreen.tsx — 신규 컴포넌트 (15분)
4. App.tsx — suspended 뷰 렌더링 분기 추가 (5분)
5. components/SystemAdminDashboard.tsx — 감사 로그 추가 (10분)
6. supabase/functions/admin-delete-user/index.ts — 감사 로그 추가 (10분)
```

총 예상 작업: 6개 파일, 신규 1개 컴포넌트

---

## 8. 비고

- **Plan §2-1 데이터 처리 표 수정 권장**: CASCADE 삭제로 이미 처리되는 항목들이 과도하게 기술됨 (Design 확인 기준으로 Plan 문서 갱신 가능)
- **Phase 2 항목**:
  - master 탈퇴 시 30일 유예 + admin 알림 Edge Function
  - pending 사용자 admin 강제 삭제 감사 로그 (admin_audit_logs 테이블 신규)
  - paused 상태 RLS 강화 (앱 레벨 우회 방지)
  - pg_cron 24개월 자동 파기 로깅 개선 (operation_logs 연동)
