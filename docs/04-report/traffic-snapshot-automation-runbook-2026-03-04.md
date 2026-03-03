# Traffic Snapshot Automation Runbook (2026-03-04)

## 1) 일일 실행 명령

```bash
set -a; source .env.local; set +a
npm run report:traffic:daily
npm run report:traffic:coverage
```

## 2) 수동 백필(특정 기준일)

```bash
set -a; source .env.local; set +a
node scripts/admin-traffic-snapshot.mjs 30 --snapshot-date=2026-03-04 --daily
```

## 3) 출력 경로

1. 일별 스냅샷: `docs/04-report/traffic-kpi-daily/traffic-kpi-snapshot-YYYY-MM-DD.md`
2. 커버리지 보고: `docs/04-report/traffic-kpi-coverage.md`

## 4) 커버리지 기준

1. 검사기간: 최근 28일
2. 최소 생성일: 27일
3. 명령: `npm run report:traffic:coverage`
4. 판정: 커버리지 스크립트 종료코드 0이면 통과

## 5) 크론 예시 (로컬/서버)

```cron
# 매일 00:15 KST 실행
15 0 * * * cd /Users/mac/Downloads/Projects/implant-inventory && /bin/zsh -lc 'set -a; source .env.local; set +a; npm run report:traffic:daily && npm run report:traffic:coverage'
```

## 6) 장애 대응

1. `SUPABASE_SERVICE_ROLE_KEY` 누락 시 `.env.local` 확인
2. Edge/REST 응답 실패 시 네트워크/권한 점검 후 재실행
3. 커버리지 미달 시 누락 날짜를 백필로 보완
