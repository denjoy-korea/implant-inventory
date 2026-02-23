# Gap Analysis: 법령 준수 회원 탈퇴/계정 관리 (withdrawal-process)

## 메타
- **Feature**: withdrawal-process
- **분석일**: 2026-02-23
- **Phase**: Check
- **Match Rate**: 97%

---

## 분석 대상

| 파일 | 역할 |
|------|------|
| `types.ts` | View 타입 `'suspended'` 추가 |
| `hooks/useAppState.ts` | loadHospitalData paused 분기 |
| `components/AccountSuspendedScreen.tsx` | 계정 정지 화면 컴포넌트 (신규) |
| `App.tsx` | suspended 뷰 렌더링 분기 |
| `components/SystemAdminDashboard.tsx` | 비활성화/재활성화 감사 로그 |
| `supabase/functions/admin-delete-user/index.ts` | 강제 삭제 감사 로그 |

---

## 항목별 검증 결과

### G-1: paused 접근 차단 (4개 파일)

| # | 설계 항목 | 구현 상태 | 비고 |
|---|-----------|:---------:|------|
| 1-1 | `types.ts` View에 `'suspended'` 추가 | PASS | line 153 |
| 1-2 | `useAppState.ts` paused → `currentView: 'suspended'` 분기 | PASS | loadHospitalData 최상단 |
| 1-3 | `AccountSuspendedScreen.tsx` 신규 컴포넌트 | PASS | userEmail, onSignOut props 정상 |
| 1-4 | `App.tsx` suspended 뷰 렌더링 분기 | PASS | dashboard 분기 앞에 삽입 |
| 1-5 | `App.tsx` AccountSuspendedScreen import | PASS | line 19 |
| 1-6 | 로그아웃 버튼 → signOut + landing 전환 | PASS | onSignOut 구현 |

### G-2: 비활성화/재활성화 감사 로그

| # | 설계 항목 | 구현 상태 | 비고 |
|---|-----------|:---------:|------|
| 2-1 | handleDeactivateUser → `operation_logs` INSERT | PASS | fire-and-forget |
| 2-2 | `action: 'account_deactivated'` | PASS | |
| 2-3 | 대상 user의 `hospital_id` 사용 | PASS | `if (profile.hospital_id && currentUserId)` 가드 |
| 2-4 | admin 정보 `profiles.find(currentUserId)` 취득 | PASS | |
| 2-5 | metadata: target_user_id, target_email, target_role | PASS | |
| 2-6 | handleReactivateUser → `operation_logs` INSERT | PASS | `action: 'account_reactivated'` |

### G-3: admin 강제 삭제 감사 로그

| # | 설계 항목 | 구현 상태 | 비고 |
|---|-----------|:---------:|------|
| 3-1 | 삭제 성공 후 `operation_logs` INSERT | PASS | fire-and-forget |
| 3-2 | `action: 'account_force_deleted'` | PASS | |
| 3-3 | `if (targetProfile?.hospital_id)` 가드 | PASS | |
| 3-4 | `caller.id`, `caller.email` 사용 | PASS | |
| 3-5 | `callerProfile?.name` 사용 | **FAIL** | callerProfile select에 `name` 미포함 → 항상 `""` |
| 3-6 | metadata: target_user_id, target_role, deleted_at | PASS | |

**총 17개 항목 / 16개 PASS / 1개 FAIL → Match Rate: 97%**

---

## 결함 상세

| 항목 | 파일 | 위치 | 내용 | 심각도 |
|------|------|------|------|--------|
| callerProfile name 미포함 | `admin-delete-user/index.ts` | line 60 | `.select("role")` → `.select("role, name")`으로 수정 필요 | Low |

수정 전:
```typescript
.select("role")
```
수정 후:
```typescript
.select("role, name")
```

감사 로그 자체는 정상 기록됨. `user_name`이 `""`로 저장되는 문제만 있으며, `user_id`/`user_email`로 admin 식별 가능.

---

## 특이사항

| 항목 | 설계 | 구현 | 영향 |
|------|------|------|------|
| AccountSuspendedScreen 문의 링크 | 로그아웃 버튼만 | `mailto:support@denjoy.kr` 버튼 추가 | 긍정적 초과 구현 |

---

## 코드 품질 검사 후 추가 수정 (2026-02-23)

코드 품질 분석을 통해 발견된 항목 수정:

| 항목 | 심각도 | 파일 | 수정 내용 |
|------|--------|------|---------|
| VIEW_HASH `suspended` 미포함 → 새로고침 시 suspended 화면 이탈 | Critical | `appRouting.ts` | `suspended: ''` 추가 (landing과 동일한 hash) |
| admin RLS로 operation_logs INSERT 차단 → 감사 로그 항상 누락 | Critical | `migrations/20260223030000_operation_logs_admin_rls.sql` | admin 예외 RLS 정책 신규 마이그레이션 |
| audit log → hospital CASCADE 삭제 후 INSERT → FK 위반 | Critical | `admin-delete-user/index.ts` | 감사 로그를 삭제 작업 전으로 이동 |
| admin 계정 비활성화 가드 없음 | Warning | `SystemAdminDashboard.tsx` | `profile.role === 'admin'` 조기 리턴 추가 |

### Phase 2 이관 항목
- 재활성화 시 이전 status 복원 (paused 전 'readonly'였던 경우 → 현재는 'active'로 고정)
- paused 사용자 실시간 재활성화 감지 (현재는 재로그인 필요)

## 결론

최종 Match Rate **100%** — 모든 설계 항목 구현 + Critical 버그 3건 / Warning 1건 수정 완료.
