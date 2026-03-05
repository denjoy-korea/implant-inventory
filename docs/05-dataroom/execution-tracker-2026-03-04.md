# Data Room Execution Tracker (2026-03-04)

상태 코드: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`

| ID | 워크스트림 | 작업 | 담당(A/R) | 백업 | 마감 | 상태 | 산출물 경로 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WS4-01 | Release | 컴파일 블로커 제거 | 맹준호 | denjoy | 2026-03-04 | DONE | `verify:premerge` 로그 |
| WS4-02 | Release | 모바일 핵심 테스트 계약 정렬 | 맹준호 | denjoy | 2026-03-05 | DONE | `scripts/mobile-critical-flow.test.mjs` |
| WS4-03 | Release | `verify:premerge` 3연속 Green | 맹준호 | denjoy | 2026-03-10 | DONE | `docs/05-dataroom/04-security-operations/verify-premerge-log-2026-03-05.md` |
| WS4-04 | Release | `verify:release` 1회 Green | 맹준호 | denjoy | 2026-03-11 | DONE | release 실행 로그 |
| WS4-05 | Release | 리팩터링 계약 불일치 5건 긴급복구 TF 운영 | 맹준호 | denjoy | 2026-03-05 | DONE | `docs/04-report/premerge-refactor-contract-recovery-2026-03-05.md` |
| WS4-06 | Release | TF-01/02/03 후속 실행 완료 (감사+백로그+추가 2회 실행) | 맹준호 | denjoy | 2026-03-07 | DONE | `docs/04-report/contract-test-audit-2026-03-05.md`, `docs/04-report/release-warning-backlog-2026-03-05.md`, `verify-premerge-log-2026-03-05.md` |
| WS4-07 | Release | WB-01 처리 (`smoke:auto` unreachable 재시도+원인분류 로그) | 맹준호 | denjoy | 2026-03-06 | DONE | `scripts/check-edge-functions.mjs`, `docs/04-report/release-warning-backlog-2026-03-05.md` |
| WS3-01 | Funnel | 이벤트 스키마 동결 | denjoy | 맹준호 | 2026-03-05 | IN_PROGRESS | 이벤트 명세 문서 |
| WS3-02 | Funnel | 일별 스냅샷 자동화 구축 | 맹준호 | denjoy | 2026-03-11 | IN_PROGRESS | `scripts/admin-traffic-snapshot.mjs`, `scripts/traffic-snapshot-coverage.mjs` |
| WS3-03 | Funnel | session_id 누락률 주간 점검 | denjoy | 맹준호 | Weekly | TODO | KPI 점검 로그 |
| WS5-01 | Data Room | 데이터룸 구조 생성 | denjoy | 맹준호 | 2026-03-06 | DONE | `docs/05-dataroom/` |
| WS5-02 | Data Room | 증빙 수집 체크리스트 배포 | denjoy | 맹준호 | 2026-03-06 | DONE | `evidence-collection-checklist-2026-03-04.md` |
| WS5-03 | Data Room | 청구-수금-환불 대사표 작성 | denjoy | 맹준호 | 2026-03-05 | DONE | `02-billing-reconciliation/2026-03-05_billing-evidence-ledger_v1.md` |
| WS5-04 | Data Room | 법무 패키지(약관/개인정보/환불정책) | 외부 법무자문 | denjoy | 2026-03-05 | DONE | `05-policy-versioning/2026-03-05_legal-package-closeout_v1.md` |
| WS5-05 | Data Room | 보안 운영 증빙 첨부 | 맹준호 | denjoy | 2026-03-16 | IN_PROGRESS | `04-security-operations/` |
| WS5-06 | Data Room | 투자자 제출본 원본/요약본 제작 | denjoy | 맹준호 | 2026-03-20 | DONE | `06-investor-pack/`, `06-investor-pack/redacted/2026-03-05_investor-pack-redacted-summary_v1.md`, `06-investor-pack/redacted/2026-03-05_legal-finance-review-round_v1.md` |

## 오늘 기준 실행 순서 (2026-03-05 업데이트)

1. `WS5-05` 보안 운영 증빙 최신화 (이번 주 제출용)
2. `WS3-01` 이벤트 스키마 동결 마무리
3. `WS3-02` 스냅샷 자동화 마감 준비
4. `WS3-03` 주간 session_id 누락률 점검 실행

## 금주 블로커

1. 실결제 전환 전 MRR raw 검증 불가 (`dataroom-checklist` 항목)

## 업데이트 규칙

1. 상태 변경 시 변경일을 커밋 메시지 또는 PR 본문에 남긴다.
2. `DONE` 전환 시 산출물 경로를 반드시 채운다.
3. `BLOCKED`는 원인과 해소 담당자를 주간 회의에서 확정한다.
