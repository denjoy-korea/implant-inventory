# Trial Policy Standard (14/28일) - 2026-03-04

## 1) 정책 원칙

1. 기본 체험 기간은 `14일`이다.
2. 베타 신청분은 `28일`을 적용한다.
3. 베타 판정 경계 시각은 `2026-04-01T00:00:00+09:00 (KST)`이다.

## 2) 판정 규칙 (단일 기준)

- `trial_started_at < 2026-04-01T00:00:00+09:00` 이면 `28일`
- 그 외는 `14일`

## 3) 경계값 예시

1. `2026-03-31 23:59:59+09:00` 시작: `28일`
2. `2026-04-01 00:00:00+09:00` 시작: `14일`
3. `2026-04-01 00:00:01+09:00` 시작: `14일`

## 4) 적용 위치 (동일 정책 사용)

1. 프론트/도메인:
- `utils/trialPolicy.ts`
- `services/planService.ts`
- `components/system-admin/systemAdminDomain.ts`

2. SQL:
- `supabase/048_trial_policy_14_28_alignment.sql`
- 대상 RPC: `expire_trial_if_needed`, `check_plan_expiry`

## 5) 운영 체크리스트

1. 신규 체험 생성 시 `trial_started_at` 기록 확인
2. 경계 시각 전/후 샘플 1건씩으로 만료 시점 계산 검증
3. 관리자 화면 `daysLeft`와 사용자 화면 `trialDaysRemaining` 값 일치 확인
4. SQL RPC 결과와 프론트 계산 값 불일치 여부 주간 점검
