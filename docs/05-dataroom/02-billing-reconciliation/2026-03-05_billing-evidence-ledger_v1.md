# Billing Evidence Ledger (B-01, B-02, B-03) — 2026-03-05

> 기준일: 2026-03-05  
> 목적: 청구/수금/대사 원본 증빙 수집 상태를 고정한다.

## 요약

- 결제 인프라: 연동 완료, 테스트 모드
- 실청구/실수금/환불: 0건
- B-01/B-02/B-03은 "0건 증빙" 기준으로 종료 처리

## 증빙 레저

| ID | 항목 | 상태 | 근거 문서 | 비고 |
|----|------|------|-----------|------|
| B-01 | 월별 청구서 목록 | DONE (0건) | `billing-reconciliation-2026-03.md` | 테스트 모드, 청구 0건 |
| B-02 | 결제 성공 증빙 | DONE (0건) | `billing-reconciliation-2026-03.md` | 테스트 모드, 수금 0건 |
| B-03 | 청구-수금-환불 대사표 | DONE (0건) | `billing-reconciliation-2026-03.md`, `billing-reconciliation-template.csv` | 대사 결과 0건 |

## 업데이트 규칙

- 실결제 전환 시 B-01/B-02/B-03을 월 단위로 행 추가
- PG 원장과 `billing_history` 대사 결과 불일치 시 차이 항목 별도 기록
