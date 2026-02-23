# Design: 회원 정보 관리 (member-management)

## 메타
- **Feature**: member-management
- **작성일**: 2026-02-23
- **Plan 참조**: `docs/01-plan/features/member-management.plan.md`
- **상태**: Design

---

## 1. 데이터베이스 구조 (실제 확인)

### 1-1. `public.profiles` (핵심 회원 테이블)

```sql
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,          -- AES-GCM 암호화 (ENCv2: 접두사)
  name         TEXT NOT NULL,                 -- AES-GCM 암호화
  phone        TEXT,                          -- AES-GCM 암호화 (nullable)
  role         TEXT CHECK (role IN ('master', 'dental_staff', 'staff', 'admin')),
  hospital_id  UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  status       TEXT CHECK (status IN ('pending', 'active', 'readonly', 'paused')),
  clinic_role  TEXT,                          -- 직책 (원장/실장/팀장/스탭)
  permissions  JSONB,                         -- 세부 권한 (스태프용)
  email_hash   TEXT,                          -- SHA-256 해시 (검색용)
  phone_hash   TEXT,                          -- SHA-256 해시 (검색용)
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);
```

**상태값 의미**:
| status | 설명 |
|--------|------|
| `pending` | 가입 승인 대기 (초대 수락 후 master 승인 전) |
| `active` | 정상 활성 |
| `readonly` | 읽기 전용 (비활성화 경고 단계) |
| `paused` | 일시 정지 (soft-deactivate) |

### 1-2. `auth.users` (Supabase 관리 테이블)
- 직접 접근 불가 (SECURITY DEFINER 함수로만 접근)
- 핵심 필드: `last_sign_in_at`, `email_confirmed_at`, `updated_at`

### 1-3. `public.hospitals`
```sql
CREATE TABLE hospitals (
  id              UUID PRIMARY KEY,
  name            TEXT NOT NULL,
  master_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- master 탈퇴 시 NULL
  phone           TEXT,
  created_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ
);
```

### 1-4. `public.withdrawal_reasons`
- 탈퇴 사유 기록 테이블
- RLS: 본인 INSERT, admin SELECT

### 1-5. 관련 RPC 함수

| 함수 | 권한 | 설명 |
|------|------|------|
| `get_my_profile()` | 모든 인증 사용자 | 본인 profiles 반환 (PII 암호화된 상태) |
| `get_all_profiles()` | admin 전용 | 전체 profiles 목록 |
| `get_all_profiles_with_last_login()` | admin 전용 | profiles + auth.users.last_sign_in_at JOIN |

**발견된 갭**: `get_my_profile()`은 `last_sign_in_at`을 포함하지 않음.
→ `supabase.auth.getUser()`의 `user.last_sign_in_at` 활용 가능 (별도 RPC 불필요)

---

## 2. 서비스 레이어 현황

### 2-1. `authService.ts` (기존)

| 메서드 | 상태 | 비고 |
|--------|------|------|
| `signUp()` | 완성 | PII 암호화 포함 |
| `signIn()` | 완성 | MFA 지원 |
| `signOut()` | 완성 | |
| `getCurrentProfile()` | 완성 | RPC 경유, PII 복호화 |
| `updateProfile({name, phone})` | 완성 | 암호화 후 저장 |
| `resetPassword(email)` | 완성 | 이메일 발송 |
| `deleteAccount()` | 완성 | Edge Function 경유 |
| `saveWithdrawalReason(reason)` | 완성 | Slack 알림 포함 |
| `toggleMfa(enabled)` | 완성 | |
| `getTrustedDevices()` | 완성 | |
| `removeTrustedDevice(id)` | 완성 | |
| `getLastSignInAt()` | **미구현** | `auth.getUser()` 활용 추가 필요 |

### 2-2. `hospitalService.ts` (기존)

| 메서드 | 상태 | 비고 |
|--------|------|------|
| `getMembers(hospitalId)` | 완성 | active 스태프 목록 |
| `getPendingMembers(hospitalId)` | 완성 | 승인 대기 목록 |
| `approveMember(userId)` | 완성 | pending → active |
| `rejectMember(userId)` | 완성 | hospital_id NULL로 |
| `inviteMember(email, name, hospitalId, clinicRole)` | 완성 | Edge Function |
| `getInvitedMembers(hospitalId)` | 완성 | 초대 링크 목록 |
| `cancelInvitation(id)` | 완성 | 만료 처리 |
| `kickMember(targetUserId)` | 완성 | Edge Function |
| `leaveHospital()` | 완성 | 본인 탈퇴 |
| `updateMemberPermissions(userId, perms)` | 완성 | |
| `updateMemberRole(userId, role)` | 완성 | |
| `reactivateMember(userId)` | 완성 | paused → active |

### 2-3. 추가 필요한 서비스 메서드

| 메서드 | 위치 | 내용 |
|--------|------|------|
| `getLastSignInAt()` | `authService` | `supabase.auth.getUser()` → `user.last_sign_in_at` |
| `searchProfiles(query)` | `authService` | admin용 회원 검색 (클라이언트 필터 or DB) |
| `deactivateUser(userId)` | `authService` | admin용: `profiles.status = 'paused'` |
| `reactivateUser(userId)` | `authService` | admin용: `profiles.status = 'active'` |

---

## 3. UI 컴포넌트 구조

### 3-1. 내 프로필 (`UserProfile.tsx`)

```
UserProfile (Modal, z-[110])
├── 헤더 (아바타, 이름, 역할, 플랜 뱃지)
├── 탭 네비게이션
│   ├── 내 정보 탭
│   │   ├── 개인정보 (이름/이메일/연락처/회원유형) - 수정 가능
│   │   └── 소속 정보 (병원명)
│   ├── 구독 관리 탭
│   │   ├── 플랜 카드 (그라디언트)
│   │   ├── 결제 정보
│   │   └── 플랜 변경 (인라인 피커)
│   ├── 보안 탭
│   │   ├── 비밀번호 변경 (이메일 발송)
│   │   │   └── [갭] 변경일: "30일 전" → auth.getUser().last_sign_in_at 활용
│   │   ├── 2단계 인증 토글
│   │   ├── 신뢰 기기 목록
│   │   └── 로그인 기록
│   │       └── [갭] 더미 데이터 → getLastSignInAt() 으로 대체
│   └── 내 후기 탭
└── 회원 탈퇴 버튼 (보안 탭 하단)
    └── 탈퇴 사유 모달 (체크박스 + 기타 텍스트)
```

**보안 탭 개선 설계**:
```tsx
// 현재 (더미)
{ device: 'Chrome · macOS', time: '2시간 전', active: false }

// 개선 후 (실제 데이터)
const lastSignIn = await authService.getLastSignInAt();
// → "2026-02-23 오전 11:23" 실제 표시
// 복수 기록이 없으므로 "마지막 로그인" 단일 항목 표시
```

### 3-2. 병원 스태프 관리 (`MemberManager.tsx`)

```
MemberManager (Modal)
├── 구성원 목록 (active + readonly + paused)
│   ├── 스태프 카드 (이름/역할/권한 수준)
│   ├── 권한 편집 버튼 → PermissionModal
│   └── 강제 퇴출 버튼 → kickMember()
├── 승인 대기 목록 (pending)
│   ├── 승인 버튼 → approveMember()
│   └── 거절 버튼 → rejectMember()
├── 초대 발송 폼 (이메일/이름/직책)
│   └── inviteMember() → Edge Function
└── 초대 링크 목록
    ├── 만료일 표시
    └── 취소 버튼 → cancelInvitation()
```

**현황**: 구현 완료, 별도 개선 없음.

### 3-3. 시스템 관리자 회원 관리 (`SystemAdminUsersTab.tsx`)

```
SystemAdminUsersTab
├── [신규] 검색/필터 바
│   ├── 텍스트 검색 (이름, 이메일)
│   ├── 역할 필터 (master/dental_staff/staff/admin)
│   └── 상태 필터 (active/pending/paused)
├── 회원 테이블
│   ├── 이름 (상세 버튼) → UserDetailModal
│   ├── 이메일, 연락처, 소속 병원, 플랜, 역할, 상태, 가입일, 마지막 접속
│   └── 관리 버튼
│       ├── 삭제 (기존) → onDeleteUser()
│       └── [신규] 비활성화/재활성화 → deactivateUser() / reactivateUser()
└── UserDetailModal (기존)
    └── 상세 정보 표시
```

**검색 구현 방식**: 클라이언트 사이드 필터링 (데이터는 `get_all_profiles_with_last_login()` 전체 로드)

```tsx
// 필터 상태
const [searchQuery, setSearchQuery] = useState('');
const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
const [statusFilter, setStatusFilter] = useState<string>('all');

// 필터 적용
const filteredProfiles = profiles.filter(p => {
  const matchesSearch = !searchQuery ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesRole = roleFilter === 'all' || p.role === roleFilter;
  const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
  return matchesSearch && matchesRole && matchesStatus;
});
```

**주의**: PII 암호화로 인해 서버 검색은 `email_hash` / `phone_hash` 활용 필요.
현재 스코프: 클라이언트 사이드 필터 (복호화 후 비교). 대용량 시 서버 검색으로 전환 검토.

---

## 4. 탈퇴 처리 정책 확정

### 4-1. 사용자 자체 탈퇴 흐름 (현재 구현됨)

```
탈퇴 버튼 클릭
→ 탈퇴 사유 모달 (체크박스 선택 필수)
→ saveWithdrawalReason() → withdrawal_reasons INSERT + notify-withdrawal Slack
→ deleteAccount() → delete-account Edge Function → auth.users DELETE
→ CASCADE: profiles.id → DELETE
→ hospitals.master_admin_id → SET NULL (병원 데이터 유지!)
→ 로그아웃 + 랜딩 페이지로 이동
```

**`master` 탈퇴 시 병원 처리**:
- `hospitals.master_admin_id = NULL` (CASCADE ON DELETE SET NULL)
- 병원의 재고, 수술기록 등 데이터는 **보존** (hospital_id FK는 CASCADE가 아님)
- 병원은 "관리자 없는 상태"로 남음 → 시스템 관리자가 추후 처리
- **현재 정책**: 병원 데이터 보존, master_admin_id만 NULL → 적절한 정책으로 확정

**`dental_staff` 탈퇴 시**:
- profiles 삭제 → hospital_id가 NULL이 되지 않고 profiles 자체가 삭제
- hospital_members 역할이 profiles 기반이므로 자동 제거됨

### 4-2. 관리자 강제 삭제 (기존 구현됨)
- `SystemAdminDashboard.tsx` → `onDeleteUser()` → `admin-delete-user` Edge Function
- Service Role Key로 `auth.admin.deleteUser(userId)` 호출

### 4-3. 비활성화 (신규 설계)
- `profiles.status = 'paused'`로 변경 (데이터 보존)
- 로그인 시 `paused` 상태 감지 → 접근 차단 메시지 표시
- 재활성화: `profiles.status = 'active'`로 복구

---

## 5. RLS 정책 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| `profiles` | 본인 OR 동일 병원 | 가입 시 자동 | 본인만 (role/status 제외) | CASCADE |
| `profiles` | admin: 전체 | - | admin: 전체 | admin: 전체 |
| `hospitals` | 소속 병원만 | master only | master only | - |
| `withdrawal_reasons` | admin only | 본인 | - | - |

**보안 하드닝 (2026-02-22)**:
- `master_manage_members` 정책: role을 'admin'으로 상승시키는 UPDATE 차단
- `anyone_find_by_phone` 정책 삭제 (전체 조회 보안 취약점 제거)

---

## 6. 구현 상세 명세

### 6-1. [Phase 1] 관리자 검색/필터 — `SystemAdminUsersTab.tsx`

**변경 내용**:
```tsx
// Props 추가 없음 (profiles는 이미 전달받음)
// 컴포넌트 내부에 검색 상태 추가

interface SystemAdminUsersTabProps {
  profiles: DbProfile[];  // 기존
  // ... 기존 props
  onDeactivateUser?: (profile: DbProfile) => void;  // 신규
  onReactivateUser?: (profile: DbProfile) => void;  // 신규
}
```

**UI 레이아웃**:
```
┌─────────────────────────────────────────────────────┐
│ [🔍 이름 또는 이메일 검색...      ] [역할▾] [상태▾] │
└─────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────┐
│ 이름  이메일  연락처  소속병원  플랜  역할  상태  가입일  마지막접속  관리 │
│ ...   ...     ...     ...      ...   ...   ...   ...    ...         [상세][비활성화][삭제] │
└──────────────────────────────────────────────────────┘
```

### 6-2. [Phase 1] 로그인 이력 실제 데이터 — `UserProfile.tsx` + `authService.ts`

**authService 추가**:
```typescript
/** 현재 사용자의 마지막 로그인 시각 */
async getLastSignInAt(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.last_sign_in_at ?? null;
},
```

**UserProfile.tsx 보안 탭 수정**:
```tsx
// 상태 추가
const [lastSignInAt, setLastSignInAt] = useState<string | null>(null);

// 보안 탭 진입 시 로드
useEffect(() => {
  if (activeTab === 'security') {
    authService.getLastSignInAt().then(setLastSignInAt);
    loadTrustedDevices();
  }
}, [activeTab, loadTrustedDevices]);

// 로그인 기록 렌더링 (더미 → 실제)
const loginEntry = {
  device: '현재 기기',
  time: lastSignInAt
    ? new Date(lastSignInAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '알 수 없음',
  active: true,
};
```

### 6-3. [Phase 1] 비밀번호 변경일 실제 데이터

**현황**: Supabase Auth는 `password_changed_at` 필드 미제공.
**대안**:
- Option A: `profiles` 테이블에 `password_reset_at TIMESTAMPTZ` 컬럼 추가
  - `resetPassword()` 호출 시 `profiles.password_reset_at = now()` 업데이트
- Option B: "마지막 비밀번호 재설정 이메일 발송일"로 표현 변경 (텍스트 조정)

**결정**: Option B 우선 (DB 스키마 변경 최소화)
"마지막 변경: 30일 전" → "이메일로 재설정 링크 발송 시 기록됩니다"로 텍스트 변경

### 6-4. [Phase 2] 계정 비활성화 — 신규 서비스 메서드

**DB**: `profiles.status = 'paused'`로 업데이트 (기존 컬럼 활용)

**authService 추가 (admin 전용 Edge Function)**:
```typescript
async adminDeactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.functions.invoke('admin-manage-user', {
    body: { userId, action: 'deactivate' }
  });
  return error ? { success: false, error: error.message } : { success: true };
},

async adminReactivateUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.functions.invoke('admin-manage-user', {
    body: { userId, action: 'reactivate' }
  });
  return error ? { success: false, error: error.message } : { success: true };
},
```

**앱에서 paused 상태 처리**:
```typescript
// DashboardGuardedContent.tsx 또는 AuthForm.tsx
if (profile.status === 'paused') {
  // 로그인은 됐으나 서비스 접근 차단
  showError('계정이 일시 정지되었습니다. 관리자에게 문의해주세요.');
  await authService.signOut();
}
```

---

## 7. 구현 체크리스트

### Phase 1 (즉시 구현)
- [ ] `authService.getLastSignInAt()` 메서드 추가
- [ ] `UserProfile.tsx` 보안 탭 로그인 이력 실제 데이터 연동
- [ ] `UserProfile.tsx` 비밀번호 변경일 텍스트 수정
- [ ] `SystemAdminUsersTab.tsx` 검색/필터 바 추가
- [ ] `SystemAdminUsersTab.tsx` 비활성화/재활성화 버튼 추가 (UI만)

### Phase 2 (정책 확정 후)
- [ ] `admin-manage-user` Edge Function 생성 (deactivate/reactivate)
- [ ] `SystemAdminDashboard.tsx` 비활성화 로직 연결
- [ ] `master` 탈퇴 시 병원 고아 상태 처리 (admin 알림)
- [ ] 로그인 시 `paused` 상태 체크 및 차단

### Phase 3 (선택적)
- [ ] 프로필 이미지 업로드 (Supabase Storage + public assets bucket)
- [ ] 이메일 변경 기능 (Supabase Auth 이메일 변경 API)
- [ ] 관리자 이메일 재발송

---

## 8. 파일별 변경 범위 요약

| 파일 | 변경 유형 | 주요 내용 |
|------|-----------|-----------|
| `services/authService.ts` | 수정 | `getLastSignInAt()` 추가 |
| `components/UserProfile.tsx` | 수정 | 로그인 이력 실제 데이터, 비밀번호 텍스트 수정 |
| `components/system-admin/tabs/SystemAdminUsersTab.tsx` | 수정 | 검색/필터 바 + 비활성화 버튼 |
| `components/SystemAdminDashboard.tsx` | 수정 (Phase 2) | deactivate/reactivate 핸들러 |
| `supabase/functions/admin-manage-user/` | 신규 (Phase 2) | 비활성화/재활성화 Edge Function |
| `components/app/DashboardGuardedContent.tsx` | 수정 (Phase 2) | paused 상태 접근 차단 |

---

## 9. 비설계 항목 (현재 구현 유지)

- `MemberManager.tsx` — 변경 없음 (이미 완성도 높음)
- `탈퇴 처리 플로우` — 현재 구현 유지 (`master` 병원 SET NULL 정책 확정)
- `PII 암호화` — 현재 구현 유지 (AES-GCM ENCv2)
- `MFA (2단계 인증)` — 현재 구현 유지
