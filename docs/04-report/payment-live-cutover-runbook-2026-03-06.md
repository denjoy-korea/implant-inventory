# Payment Live Cutover Runbook (2026-03-06)

## 목적

- 테스트 결제(`is_test_payment=true`)와 실결제(`is_test_payment=false`)를 명시적으로 분리해 MRR raw 검증 기준을 안정화한다.

## 선행 조건

1. `SUPABASE_ACCESS_TOKEN` 준비 (`supabase login` 또는 환경변수)
2. Toss live 키 준비
   - `VITE_TOSS_CLIENT_KEY=live_ck_...`
   - `TOSS_SECRET_KEY=live_sk_...` (Supabase secret)
3. 배포 권한 및 롤백 경로 확인

## 실행 순서

1. DB migration 반영

```bash
/Users/mac/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase migration list --linked
/Users/mac/.npm/_npx/aa8e5c70f9d8d161/node_modules/.bin/supabase db push --linked --include-all
```

2. 앱/함수 환경 전환
   - `VITE_PAYMENT_LIVE_MODE=true`
   - `VITE_TOSS_CLIENT_KEY` live 키 적용
   - `supabase secrets set TOSS_SECRET_KEY=live_sk_...`

3. 전환 직후 검증

```bash
set -a; source .env.local; set +a
npm run report:mrr:unblock-check
npm run report:mrr:auto-trigger
```

## 판정 기준

- `mrr-raw-unblock-check-YYYY-MM-DD.md`에서
  - live 기준: `completed + amount>0 + is_test_payment=false`
  - fetch notice 없음 (migration 적용 완료)

## 롤백

1. `VITE_PAYMENT_LIVE_MODE=false` 즉시 복원
2. `TOSS_SECRET_KEY` 테스트 키로 복원
3. 사고 로그를 `docs/04-report`에 기록
