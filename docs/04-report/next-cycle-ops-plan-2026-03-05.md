# Next Cycle Ops Plan (2026-03-05)

## 목적

2026-03-05 기준 완료된 트래커 이후, 정기성 작업(주간 점검/증빙 갱신)과 대기성 블로커(MRR raw)를 실행 가능한 단위로 고정한다.

## 실행 일정

| 순번 | 작업 | 예정일 (KST) | 실행 명령/근거 |
| --- | --- | --- | --- |
| 1 | WS3-03 session_id 주간 점검 재실행 | 2026-03-12 | `node scripts/traffic-snapshot-coverage.mjs 28 8 --end-date=2026-03-12` + `docs/04-report/traffic-kpi-daily/session-quality-check-2026-03-12.md` 작성 |
| 2 | WS5-05 보안 운영 증빙 주간 갱신 | 2026-03-12 | `npm run smoke:auto` + `npm run verify:premerge` 실행 로그 반영 (`docs/05-dataroom/04-security-operations/`) |
| 3 | MRR raw 검증 재개 여부 판단 | 실결제 전환 직후 (2026-03-12 회의에서 재확인) | `docs/05-dataroom/99-index/dataroom-checklist.md` 블로커 해제 조건 점검 |

## 블로커 관리

- 현 블로커: 실결제 전환 전 `MRR raw` 검증 불가
- 해제 조건: `billing_history`에 실결제(테스트 제외) 레코드 생성 + PG 정산 원장 수집 가능 상태

## 완료 기준

1. 2026-03-12 점검 로그 2종(session 품질/보안 운영) 생성
2. 블로커 상태(`BLOCKED` 유지 또는 해제)와 근거를 트래커에 반영
