# Data Room Structure (v1)

## 목적

밸류에이션 검토 시 필요한 상업/법무/보안 증빙을 동일 구조로 보관한다.

## 폴더 구조

1. `01-contracts`: 유료 고객 계약 원본/개정본
2. `02-billing-reconciliation`: 청구-수금-환불 대사표와 원장 근거
3. `03-refund-termination`: 환불/해지 요청과 처리 근거
4. `04-security-operations`: 보안 운영 로그/체크리스트/사고 대응 기록
5. `05-policy-versioning`: 약관/개인정보/환불정책 버전 이력
6. `06-investor-pack`: 투자자 제출용 원본/요약본(레드액트)

## 파일명 규칙

1. `YYYY-MM-DD_<category>_<customer-or-topic>_<vN>.ext`
2. 민감정보 포함 원본은 원본 폴더에만 저장
3. 외부 공유본은 `redacted` 접미사 사용

## 공통 메타데이터

1. 작성/수집일
2. 출처 시스템 (예: billing_history, contact_inquiries, slack, drive)
3. 담당자
4. 검증 상태 (`draft`, `reviewed`, `final`)
