# Traffic KPI Daily Ops

- 작성일: 2026-03-04
- 목적: Workstream 3의 일별 퍼널 스냅샷 운영 표준

## Daily Commands
```bash
npm run report:traffic:daily
npm run report:traffic:coverage
```

## Output
- 일별 스냅샷: `docs/04-report/traffic-kpi-daily/traffic-kpi-snapshot-YYYY-MM-DD.md`
- 커버리지 리포트: `docs/04-report/traffic-kpi-coverage.md`

## 운영 규칙
1. 매일 KST 23:50~23:59 사이 1회 실행
2. 실패 시 다음날 오전 09:30 이전 재실행
3. 월간 리포트 작성 전 커버리지 기준(`28일 중 27일`) 충족 확인

## 실패 대응
1. `.env.local`에 `VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 확인
2. 키가 없으면 임시로 `--allow-anon-fallback` 사용 가능 (단, RLS로 집계 누락 가능)
3. 커버리지 부족 시 누락 날짜를 개별 백필
```bash
node scripts/admin-traffic-snapshot.mjs 30 --daily --snapshot-date=YYYY-MM-DD
```
