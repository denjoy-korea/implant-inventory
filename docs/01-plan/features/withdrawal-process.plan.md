# Plan: 법령 준수 회원 탈퇴/계정 관리 (withdrawal-process)

## 메타
- **Feature**: withdrawal-process
- **작성일**: 2026-02-23
- **우선순위**: High
- **레벨**: Dynamic
- **상태**: Plan
- **선행 Feature**: member-management (Phase 1 완료)

---

## 1. 배경 및 목적

### 1-1. 법령 요건 (2026-02-23 조사 기준)

| 법령 | 핵심 의무 | 위반 시 제재 |
|------|-----------|------------|
| **개인정보보호법 제21조** | 탈퇴·목적 달성 시 **지체 없이 파기** (원칙: 5일 이내) | 과징금 (매출액 3% 이하) |
| **개인정보보호법 제29조** | 접속기록 최소 1년 보관 (고유식별정보 처리 시 2년) | 과태료 3천만원 이하 |
| **전자상거래법** | 탈퇴 절차를 가입보다 복잡하게 설계 금지 | 시정명령·과태료 |
| **전자상거래법** | 계약·청약철회 기록 5년, 대금결제 기록 5년 보존 | 과태료 |

> **의료법 시행규칙 제15조 (수술기록 10년 등)**: 의료기관(병원) 본인에게 부과되는 의무. DenJOY는 의료기관이 아닌 재고 관리 SaaS이므로 **직접 적용 안 됨**. 병원은 자체 EMR에서 이행. DenJOY 수술기록의 수집 목적은 임플란트 재고 통계이며, 개인정보보호법 §21 목적 제한 원칙에 따라 목적 달성 후 파기가 적절.

### 1-2. 현재 구현의 문제점

```
현재 delete_my_account RPC 흐름:
  ① withdrawal_reasons INSERT (탈퇴 사유 저장)
  ② notify-withdrawal Edge Function (Slack 알림)
  ③ hospitals DELETE (병원 전체 삭제) ← ⚠️ 수술기록 포함 즉시 삭제
  ④ auth.users DELETE → CASCADE → profiles 삭제

문제:
  - profiles PII(이름, 전화번호)가 익명화 없이 CASCADE 삭제됨
  - 수술기록(임플란트 사용 통계용)이 보존 정책 없이 즉시 삭제됨
  - master 탈퇴 시 admin에게 알림 없이 병원 데이터 소멸
  - paused 상태 사용자가 서비스에 계속 접근 가능
  - 탈퇴/비활성화에 대한 operation_logs 감사 기록 없음
  - admin 강제 삭제도 동일한 문제
```

### 1-3. 목적

법령 준수를 유지하면서 회원 탈퇴·계정 비활성화를 안전하게 처리하는 프로세스를 구축한다.

---

## 2. 범위

### 2-1. 회원 자발적 탈퇴 처리 개선

**현황**: `delete_my_account` RPC → 즉시 완전 삭제
**개선**: 탈퇴 처리를 **즉시 파기 대상**과 **분리 보관 대상**으로 분리

| 데이터 | 처리 방법 | 근거 |
|--------|-----------|------|
| 이름, 전화번호, 이메일 (profiles) | **즉시 파기** (NULL 처리) | 개인정보보호법 §21 |
| 수술기록 내 환자 PII (이름, 차트번호) | **즉시 익명화** (NULL 처리) | 개인정보보호법 §21 |
| 수술기록 통계 데이터 (품목, 수량, 날짜) | **탈퇴 후 최대 2년 보관** 후 삭제 | 수집 목적(재고 통계) 달성 기준, 개인정보보호법 §21 |
| 결제/구독 기록 (hospitals.plan 이력) | **5년 보관** | 전자상거래법 |
| 탈퇴 사유 (withdrawal_reasons) | **3년 보관** (email 컬럼 익명화) | 내부 정책 (분쟁 해결 목적) |
| auth.users | **즉시 삭제** | 개인정보보호법 §21 |

> **수술기록 보존 기준 근거**: DenJOY 수술기록의 수집 목적은 임플란트 재고 통계(최대 2년 참고)이며, 의료법 §15 적용 주체(의료기관)가 아닌 SaaS 플랫폼 기준으로 처리. 목적 달성 후 보존은 개인정보보호법 §21 위반.

### 2-2. paused 상태 서비스 접근 차단

**현황**: `profiles.status = 'paused'` 설정만 되고, 실제 서비스 접근 차단 로직 없음
**개선**: 앱 초기화 시 paused 상태 확인 → 접근 차단 화면 표시

### 2-3. master 탈퇴 처리 정책

**현황**: master 탈퇴 시 병원 데이터 즉시 삭제, admin 알림 없음
**개선**:
- admin에게 이메일/Slack 알림 전송
- 병원 데이터는 30일 유예 기간 후 삭제 (또는 즉시 익명화)
- 유예 기간 중 admin이 데이터 백업/처리 가능

### 2-4. 감사 로그 (operation_logs) 통합

**현황**: 탈퇴, 비활성화, 강제 삭제에 대한 `operation_logs` 기록 없음
**개선**: 모든 계정 상태 변경에 감사 로그 기록

### 2-5. admin-manage-user Edge Function 개선

**현황**: `admin-delete-user`만 존재, 비활성화 기능 없음
**개선**: 비활성화(paused), 재활성화(active), 삭제를 통합한 Edge Function 또는 비활성화 전용 기능 추가

---

## 3. 사용자 스토리

| ID | 역할 | 스토리 | 우선순위 |
|----|------|--------|---------|
| US-01 | 모든 회원 | 탈퇴 시 즉시 파기 대상과 보존 대상을 안내받는다 | Must |
| US-02 | 모든 회원 | 탈퇴 처리가 완료되면 로그아웃되고 접근이 차단된다 | Must |
| US-03 | master | 탈퇴 전에 병원 데이터 처리 방안을 선택할 수 있다 | Must |
| US-04 | master | 탈퇴 시 admin에게 자동으로 알림이 발송된다 | Should |
| US-05 | admin | paused 사용자가 서비스에 접근하면 차단 화면을 본다 | Must |
| US-06 | admin | 계정 비활성화/재활성화 시 감사 로그가 기록된다 | Should |
| US-07 | admin | 강제 삭제 전 의료 기록 보존 처리가 먼저 실행된다 | Must |
| US-08 | 시스템 | 탈퇴 5일 이내에 개인식별정보가 파기된다 | Must |

---

## 4. 현재 구현 갭 분석

| 항목 | 현황 | 갭 | 우선순위 |
|------|------|-----|---------|
| PII 즉시 파기 | ❌ auth.users 삭제만 (profiles 익명화 없음) | 개인정보보호법 §21 위반 위험 | High |
| 수술기록 환자 PII 익명화 | ❌ surgeries 전체 즉시 삭제됨 | 개인정보보호법 §21 위반 위험 | High |
| paused 접근 차단 | ❌ 상태만 설정, 차단 로직 없음 | UX 결함 + 보안 이슈 | High |
| master 탈퇴 admin 알림 | ❌ 없음 | 운영 사각지대 | Medium |
| 탈퇴 감사 로그 | ❌ operation_logs 미기록 | 안전성 확보조치 위반 | Medium |
| 계정 비활성화 감사 로그 | ❌ operation_logs 미기록 | 안전성 확보조치 위반 | Medium |
| admin 강제 삭제 개선 | ⚠️ 수술기록 통계 데이터도 즉시 삭제됨 | 서비스 데이터 손실 | Medium |

---

## 5. 구현 우선순위

### Phase 1 — 법령 준수 핵심 (이번 스프린트)

#### P1-1: paused 접근 차단 (UI)
- `App.tsx` 또는 `AuthContext` 초기화 시 `profiles.status` 확인
- `paused`이면 "계정 정지" 안내 화면 렌더링, 서비스 접근 불가

#### P1-2: 감사 로그 통합
- `admin-delete-user` Edge Function → 삭제 전 `operation_logs` INSERT
- `SystemAdminDashboard.tsx` handleDeactivateUser/handleReactivateUser → `operation_logs` INSERT

#### P1-3: 탈퇴 시 PII 익명화 플로우 개선
- `delete_my_account` RPC 수정: profiles + surgeries 환자 PII 즉시 익명화 후 auth.users 삭제
  - profiles: `name = NULL`, `phone = NULL`
  - surgeries: `patient_name = NULL`, `chart_number = NULL` (통계 데이터는 보존)
  - auth.users: 즉시 삭제 (이메일 함께 삭제)
- 수술기록 통계 데이터(품목, 수량)는 hospital 삭제 후 최대 2년 보존 후 자동 삭제

### Phase 2 — 운영 완성도 (다음 스프린트)
1. master 탈퇴 시 30일 유예 처리 + admin 알림 Edge Function
2. 수술기록 2년 후 자동 파기 스케줄러 (Supabase pg_cron 또는 Edge Function cron)
3. 탈퇴 확인 UI 개선 — 즉시 파기 대상 안내 표시

### Phase 3 — 선택적 개선
1. 탈퇴 후 30일 재가입 방지 정책
2. 데이터 백업 다운로드 기능 (GDPR 정보주체 권리)
3. 개인정보 처리방침 자동 버전 관리

---

## 6. 기술적 고려사항

### DB 스키마 변경 (Phase 1)

```sql
-- profiles 익명화 지원 (기존 컬럼이므로 스키마 변경 불필요)
-- delete_my_account RPC 로직만 수정:
UPDATE profiles SET
  name = NULL,           -- 또는 ENCv2: prefix 제거 후 NULL
  phone = NULL,
  clinic_role = NULL
WHERE id = auth.uid();

-- surgeries 환자 PII 익명화 (delete_my_account RPC에 추가)
UPDATE surgeries SET
  patient_name = NULL,      -- 환자 이름 즉시 파기
  chart_number = NULL       -- 차트번호 즉시 파기
WHERE hospital_id IN (
  SELECT id FROM hospitals WHERE master_admin_id = auth.uid()
);
-- 통계 데이터(품목, 수량, 날짜)는 보존 → 수집 목적 기준 최대 2년 후 자동 파기

-- surgeries 자동 파기 기준 컬럼 (Phase 2: pg_cron 연동용)
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;
ALTER TABLE surgeries ADD COLUMN IF NOT EXISTS delete_after TIMESTAMPTZ;  -- 보존 만료일 (탈퇴일 + 2년)
```

### operation_logs 감사 로그 형식

```typescript
// 탈퇴 로그 예시
{
  user_id: caller.id,          // 실행자 (admin 또는 본인)
  action: 'account_deleted',   // | 'account_deactivated' | 'account_reactivated'
  target_user_id: targetId,
  metadata: {
    reason: 'self_withdrawal' | 'admin_action',
    role: targetProfile.role,
    hospital_id: targetProfile.hospital_id,
  }
}
```

### paused 접근 차단 구현 위치

```
AuthContext.tsx 또는 App.tsx:
  ├── 로그인 성공 후 profiles.status 조회
  ├── status === 'paused'
  │     → <AccountSuspendedScreen /> 렌더링 (서비스 UI 미표시)
  └── status === 'active' | 'readonly'
        → 정상 서비스 진입
```

---

## 7. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| **법령 준수** | 개인정보 파기는 탈퇴 후 5일 이내 완료 |
| **감사 추적** | 모든 계정 상태 변경은 operation_logs에 기록 |
| **UX** | 탈퇴 시 보존/파기 대상 안내 (법적 요건 충족) |
| **보안** | paused 계정은 어떤 API 호출도 거부 (RLS에서도 차단) |
| **복구 불가 경고** | 탈퇴 최종 확인 단계에서 "복구 불가" 명시적 경고 |

---

## 8. 관련 파일

| 파일 | 역할 | 변경 유형 |
|------|------|---------|
| `supabase/functions/admin-delete-user/index.ts` | 강제 삭제 Edge Function | 수정 (감사 로그 추가) |
| `supabase/[migration].sql` | delete_my_account RPC 수정 + surgeries PII 익명화 + delete_after 컬럼 | 신규 마이그레이션 |
| `components/SystemAdminDashboard.tsx` | 비활성화/재활성화 핸들러 | 수정 (감사 로그 추가) |
| `components/UserProfile.tsx` | 탈퇴 확인 UI | 수정 (보존/파기 안내 추가) |
| `services/authService.ts` | deleteAccount 로직 | 수정 (PII 익명화 흐름) |
| `App.tsx` 또는 `AuthContext` | paused 상태 접근 차단 | 수정 (상태 체크 추가) |

---

## 9. 다음 단계

- [ ] Design: DB 스키마 변경 명세 (delete_my_account RPC 수정, surgeries 컬럼)
- [ ] Design: paused 차단 UI 흐름 상세 설계
- [ ] Design: operation_logs 감사 로그 형식 정의
- [ ] Do: Phase 1 구현 시작 (`/pdca do withdrawal-process`)
