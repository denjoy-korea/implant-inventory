# Evidence Collection Checklist (2026-03-04)

## 완료 기준

1. 유료 고객별 `계약-청구-수금` 링크 100% 추적
2. 환불/해지 건 100% 근거 문서 첨부
3. 보안/컴플라이언스 문서 최신본 날짜 명시

## 수집 항목

| ID | 영역 | 필수 산출물 | 소스/근거 | 담당 | 마감 | 상태 |
| --- | --- | --- | --- | --- | --- | --- |
| C-01 | 계약 | 고객별 계약서 원본(PDF) | 서명본/이메일 체인 | BizOps | 2026-03-05 | **DONE** 2026-03-05 (`01-contracts/2026-03-05_contract-evidence-ledger_v1.md`, 0건 증빙) |
| C-02 | 계약 | 계약 개정 이력 | 부속합의서/변경 요청서 | BizOps | 2026-03-05 | **DONE** 2026-03-05 (`01-contracts/2026-03-05_contract-evidence-ledger_v1.md`, 0건 증빙) |
| B-01 | 청구 | 월별 청구서 목록 | billing_history + 인보이스 | BizOps | 2026-03-05 | **DONE** 2026-03-05 (`02-billing-reconciliation/2026-03-05_billing-evidence-ledger_v1.md`, 0건 증빙) |
| B-02 | 수금 | 결제 성공 증빙 | PG 로그 + 정산내역 | Finance | 2026-03-05 | **DONE** 2026-03-05 (`02-billing-reconciliation/2026-03-05_billing-evidence-ledger_v1.md`, 0건 증빙) |
| B-03 | 대사 | 청구-수금-환불 대사표 | 재무 대사 시트 | Finance | 2026-03-05 | **DONE** 2026-03-05 (`02-billing-reconciliation/2026-03-05_billing-evidence-ledger_v1.md`, 0건 증빙) |
| R-01 | 환불 | 환불 요청 원문 | 문의/티켓/메일 | CS | 2026-03-05 | **DONE** 2026-03-05 (`03-refund-termination/2026-03-05_refund-termination-evidence-ledger_v1.md`, 0건 증빙) |
| R-02 | 환불 | 환불 승인 근거 | 내부 승인 로그 | CS | 2026-03-05 | **DONE** 2026-03-05 (`03-refund-termination/2026-03-05_refund-termination-evidence-ledger_v1.md`, 0건 증빙) |
| R-03 | 해지 | 해지 처리 근거 | 계정 상태/로그 | CS | 2026-03-05 | **DONE** 2026-03-05 (`03-refund-termination/2026-03-05_refund-termination-evidence-ledger_v1.md`, 0건 증빙) |
| S-01 | 보안 | 스모크 테스트 결과 | `security-smoke-test-checklist.md` 실행 로그 | SRE | 2026-03-16 | **DONE** 2026-03-05 (`04-security-operations/2026-03-05_security-operations-weekly-update_v1.md`, `04-security-operations/2026-03-05_security-operations-evidence-refresh_v1.md`, `04-security-operations/verify-premerge-log-2026-03-05.md`, `04-security-operations/verify-release-log-2026-03-05.md`) |
| S-02 | 보안 | 권한 정책 증빙 | RLS/권한 SQL 버전 | SRE | 2026-03-16 | **DONE** 2026-03-04 (`04-security-operations/2026-03-04_security_rls-policy-index_v1.md`) |
| S-03 | 보안 | 사고 대응 기록 | incident timeline | SRE | 2026-03-16 | **DONE** 2026-03-04 (`04-security-operations/2026-03-04_security_incident-history_v1.md`) |
| L-01 | 법무 | 이용약관 버전 이력 | 약관 문서 + 변경일 | Legal | 2026-03-14 | **DONE** 2026-03-04 (`05-policy-versioning/2026-03-04_terms-of-service_v1.md`) |
| L-02 | 법무 | 개인정보 처리방침 버전 | 정책 문서 + 고지 로그 | Legal | 2026-03-14 | **DONE** 2026-03-04 (`05-policy-versioning/2026-03-04_privacy-policy_v1.md`) |
| L-03 | 법무 | 환불정책 버전 | 정책 문서 + 시행일 | Legal | 2026-03-14 | **DONE** 2026-03-04 (`05-policy-versioning/2026-03-04_refund-policy_v1.md`) |
| I-01 | 제출본 | 원본 패키지 zip | 01~05 폴더 집계 | PMO | 2026-03-20 | **DONE** 2026-03-05 (`06-investor-pack/original/DenJOY-DataRoom-v1-2026-03-05.zip`, `06-investor-pack/original/DenJOY-DataRoom-v1-2026-03-05.zip.sha256`) |
| I-02 | 제출본 | 요약본(레드액트) 공유본 | 외부 공유본 | PMO | 2026-03-05 | **DONE** 2026-03-05 (`06-investor-pack/redacted/2026-03-05_investor-pack-redacted-summary_v1.md`, `06-investor-pack/redacted/2026-03-05_legal-finance-review-round_v1.md`) |
