# Data Room Checklist

- 기준일: 2026-03-05 (최종 업데이트)
- 상태 값: `todo` | `in_progress` | `done` | `blocked`

## 1) 01~03 상업 증빙
- [x] `01-contracts` 계약 현황 문서 작성 (`done` 2026-03-05 — 유료 0건, 클릭-스루 모델 기록 → `contract-list.md`)
- [x] `02-billing-reconciliation` 청구/수금 대사표 작성 (`done` 2026-03-05 — 테스트 모드 현황 → `billing-reconciliation-2026-03.md`)
- [x] `03-refund-termination` 환불/해지 로그 작성 (`done` 2026-03-05 — 0건 기록 → `refund-termination-log.md`)
- [ ] MRR 계산식과 원장(raw) 일치 검증 (`blocked` — 실결제 전환 후 가능)

## 2) 05 정책 버전
- [x] `05-policy-versioning` 약관/개인정보처리방침 최신 버전 확정 (`done` 2026-03-04 — v1.0)
- [x] 동의 문구 변경 이력(버전/시행일) 정리 (`done` 2026-03-04 — v1.0 시행일 2026-02-25)
- [x] 환불/해지 프로세스 문서와 실제 처리 로그 매핑 (`done` 2026-03-05 — 0건 일치 확인)

## 3) 04 보안 운영
- [x] `04-security-operations` 최신 보안 스모크 결과 첨부 (`done` 2026-03-05 — verify:premerge 3회 + verify:release)
- [x] 권한/RLS 정책 변경 이력 정리 (`done` 2026-03-04 — `rls-policy-index_v1.md`)
- [x] 주요 보안 이슈 대응 로그 첨부 (`done` 2026-03-04 — `incident-history_v1.md`)

## 4) 06 투자자 공유 패키지
- [ ] 민감정보 비식별 처리(redaction) 완료 (`todo`)
- [x] `06-investor-pack` 외부 공유본 인덱스 생성 (`done` 2026-03-04 — `investor-pack-index_v1.md`)
- [ ] 공유 전 법무/운영 검토 완료 (`todo`)
