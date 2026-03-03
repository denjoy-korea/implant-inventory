# Trial Policy SQL Deployment Checklist (2026-03-04)

대상 SQL: `supabase/048_trial_policy_14_28_alignment.sql`  
목적: 트라이얼 만료 계산을 `기본 14일 + 베타(경계시각 이전 시작) 28일`로 서버 기준 통일

## 1) 배포 전 확인

1. 릴리즈 게이트 통과 확인
- `npm run verify:premerge`
- `npm run verify:release`

2. 적용 파일 기준 경로 확인
- Source of Truth: `supabase/*.sql`
- 적용 파일: `supabase/048_trial_policy_14_28_alignment.sql`

3. 영향 함수 확인 (사전 스냅샷)
- `expire_trial_if_needed(UUID)`
- `check_plan_expiry(UUID)`

## 2) 적용 절차

1. 운영 DB 연결 확인
2. `048_trial_policy_14_28_alignment.sql` 실행
3. 실행 직후 함수 존재/권한 확인

검증 SQL (운영 콘솔/psql):

```sql
-- helper 함수 존재 확인
select proname, proargtypes::regtype[]
from pg_proc
where proname in ('_trial_duration_days', 'expire_trial_if_needed', 'check_plan_expiry')
order by proname;

-- authenticated 실행권한 확인
select routine_name, privilege_type
from information_schema.role_routine_grants
where grantee = 'authenticated'
  and routine_name in ('expire_trial_if_needed', 'check_plan_expiry')
order by routine_name, privilege_type;
```

## 3) 정책 검증 (경계 시각 포함)

```sql
-- 정책 확인: 2026-04-01T00:00:00+09:00 경계
select
  _trial_duration_days('2026-03-31T23:59:59+09:00'::timestamptz) as beta_eligible_28,
  _trial_duration_days('2026-04-01T00:00:00+09:00'::timestamptz) as default_14_at_boundary,
  _trial_duration_days('2026-04-01T00:00:01+09:00'::timestamptz) as default_14_after_boundary;
```

기대값:

1. `beta_eligible_28 = 28`
2. `default_14_at_boundary = 14`
3. `default_14_after_boundary = 14`

## 4) 사후 검증

1. 관리자 화면에서 trial days 계산 확인
- `systemAdminDomain`의 daysLeft와 실제 만료일 일치

2. 사용자 화면에서 trial 표시 일치 확인
- `planService._buildPlanState()` 계산값과 SQL RPC 결과 일치

3. 이상 징후 점검
- 만료 즉시 Free 전환 여부
- `billing_history` 자동 기록 여부 (만료 트리거 케이스)

## 5) 롤백/완화

1. 함수 단위 롤백: 직전 버전 SQL로 `CREATE OR REPLACE` 재적용
2. 임시 완화: 만료 배치/체크 호출 중지 후 원인 분석
3. 장애 기록: 영향 hospital_id, 시작시각, 예상/실제 만료시각, 수정 시각

## 6) 증빙 저장 위치

1. 실행 로그: `docs/05-dataroom/04-security-operations/`
2. 검증 캡처: `docs/05-dataroom/04-security-operations/`
3. 릴리즈 메모: `docs/04-report/changelog.md`
