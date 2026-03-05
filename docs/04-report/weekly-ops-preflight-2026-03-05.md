# Weekly Ops Preflight (2026-03-05)

## 목적

2026-03-12 주간 운영 작업(`WS3-03`, `WS5-05`) 실행 전, 현재 환경에서 명령/지표 생성 경로가 정상 동작하는지 사전 점검한다.

## 실행 결과

| 항목 | 명령 | 결과 |
| --- | --- | --- |
| Edge smoke | `npm run smoke:auto` | PASS (`Smoke Auto: 1 passed, 0 failed`) |
| Snapshot coverage | `node scripts/traffic-snapshot-coverage-auto.mjs 28 --launch-date=2026-02-25 --end-date=2026-03-05` | PASS (`present=9/28`, `coverage=32%`, dynamic threshold `8/28`) |

## 해석

1. `WS5-05` 보안 운영 증빙 갱신에 필요한 smoke 명령은 현재 시점에서 정상 통과.
2. `WS3-03` 주간 점검에 필요한 커버리지 계산 경로 정상 동작 확인(출시 경과일 기반 동적 임계값 반영).
3. 2026-03-12에는 동일 명령을 기준일만 갱신해 재실행하면 된다.

## 후속

- 2026-03-12 실행 시점에 다음 산출물을 갱신한다.
  - `docs/04-report/traffic-kpi-daily/session-quality-check-2026-03-12.md`
  - `docs/05-dataroom/04-security-operations/2026-03-12_security-operations-weekly-update_v1.md`
