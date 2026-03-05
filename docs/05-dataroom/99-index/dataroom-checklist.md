# Data Room Checklist

- 기준일: 2026-03-05 (최종 업데이트)
- 상태 값: `todo` | `in_progress` | `done` | `blocked`

## 1) 01~03 상업 증빙
- [x] `01-contracts` 계약 현황 문서 작성 (`done` 2026-03-05 — 유료 0건, 클릭-스루 모델 기록 → `contract-list.md`)
- [x] `02-billing-reconciliation` 청구/수금 대사표 작성 (`done` 2026-03-05 — 테스트 모드 현황 → `billing-reconciliation-2026-03.md`)
- [x] 가격/플랜 표기 코드 기준 정합성 반영 (`done` 2026-03-05 — Plus/Business 명칭 및 연간 월환산 가격 기준으로 정정, 구표기 제거)
- [x] `03-refund-termination` 환불/해지 로그 작성 (`done` 2026-03-05 — 0건 기록 → `refund-termination-log.md`)
- [x] C/B/R 원본 증빙 레저 정리 (`done` 2026-03-05 — `01-contracts/2026-03-05_contract-evidence-ledger_v1.md`, `02-billing-reconciliation/2026-03-05_billing-evidence-ledger_v1.md`, `03-refund-termination/2026-03-05_refund-termination-evidence-ledger_v1.md`)
- [ ] MRR 계산식과 원장(raw) 일치 검증 (`blocked` — 실결제 전환 후 가능, 책임: Finance(denjoy)/Engineering(맹준호), 해제 플랜: `02-billing-reconciliation/mrr-raw-unblock-plan-2026-03-05.md`, 최신 점검: `02-billing-reconciliation/mrr-raw-unblock-check-2026-03-05.md`, 재확인 2026-03-12 KST, 재실행: `npm run report:mrr:unblock-check`)

## 2) 05 정책 버전
- [x] `05-policy-versioning` 약관/개인정보처리방침 최신 버전 확정 (`done` 2026-03-04 — v1.0)
- [x] 동의 문구 변경 이력(버전/시행일) 정리 (`done` 2026-03-04 — v1.0 시행일 2026-02-25)
- [x] 환불/해지 프로세스 문서와 실제 처리 로그 매핑 (`done` 2026-03-05 — 0건 일치 확인)

## 3) 04 보안 운영
- [x] `04-security-operations` 최신 보안 스모크 결과 첨부 (`done` 2026-03-05 — verify:premerge 3회 + verify:release)
- [x] 권한/RLS 정책 변경 이력 정리 (`done` 2026-03-04 — `rls-policy-index_v1.md`)
- [x] 주요 보안 이슈 대응 로그 첨부 (`done` 2026-03-04 — `incident-history_v1.md`)
- [x] 보안 운영 주간 업데이트 기록 (`done` 2026-03-05 — `04-security-operations/2026-03-05_security-operations-weekly-update_v1.md`)
- [x] 보안 운영 증빙 최신화 패키지 작성 (`done` 2026-03-05 — `04-security-operations/2026-03-05_security-operations-evidence-refresh_v1.md`)
- [x] 간헐 build resolve 경고 재검증 및 종결 (`done` 2026-03-05 — `docs/04-report/release-build-resolve-confirmation-2026-03-05.md`)

## 4) 06 투자자 공유 패키지
- [x] 비식별(redaction) 작업 체크리스트 작성 (`done` 2026-03-05 — `06-investor-pack/redacted/redaction-prep-checklist-2026-03-05.md`)
- [x] 민감정보 비식별 처리(redaction) 완료 (`done` 2026-03-05 — `06-investor-pack/redacted/2026-03-05_investor-pack-redacted-summary_v1.md`)
- [x] `06-investor-pack` 외부 공유본 인덱스 생성 (`done` 2026-03-04 — `investor-pack-index_v1.md`)
- [x] 공유 전 법무/재무 검토 라운드 반영 (`done` 2026-03-05 — `06-investor-pack/redacted/2026-03-05_legal-finance-review-round_v1.md`)
- [x] I-01 원본 패키지 ZIP/SHA 생성 (`done` 2026-03-05 — `06-investor-pack/original/DenJOY-DataRoom-v1-2026-03-05.zip`, `06-investor-pack/original/DenJOY-DataRoom-v1-2026-03-05.zip.sha256`)
