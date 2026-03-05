# 투자자 제출 패키지 인덱스 (Investor Package Index)

> **문서 ID**: I-01
> **버전**: v1.3
> **작성일**: 2026-03-04
> **최종 업데이트**: 2026-03-05
> **담당**: PMO
> **상태**: I-02 공유본 완료 / I-01 원본 패키지 대기

---

## 1. 제출 목적

DenJOY SaaS 밸류에이션 검토를 위해 상업·법무·보안 증빙을 하나의 패키지로 정리합니다.

---

## 2. 폴더 구조

```
docs/05-dataroom/
├── README.md                                 ← 데이터룸 전체 안내
├── evidence-collection-checklist-2026-03-04.md ← 수집 진행 상태 체크리스트
├── execution-tracker-2026-03-04.md          ← 실행 계획 추적
│
├── 01-contracts/                            ← C-01, C-02 (계약 원본 · 개정이력)
├── 02-billing-reconciliation/               ← B-01, B-02, B-03 (청구·수금·대사)
├── 03-refund-termination/                   ← R-01, R-02, R-03 (환불·해지)
├── 04-security-operations/                  ← S-01, S-02, S-03 (보안 운영)
│   ├── 2026-03-04_security_verify-release-run_v1.md   ← S-01 ✅
│   ├── 2026-03-04_security_rls-policy-index_v1.md     ← S-02 ✅
│   └── 2026-03-04_security_incident-history_v1.md     ← S-03 ✅
│
├── 05-policy-versioning/                    ← L-01, L-02, L-03 (약관 버전)
│   ├── 2026-03-04_terms-of-service_v1.md   ← L-01 ✅
│   ├── 2026-03-04_privacy-policy_v1.md     ← L-02 ✅
│   └── 2026-03-04_refund-policy_v1.md      ← L-03 ✅
│
└── 06-investor-pack/                        ← I-01, I-02 (제출 패키지)
    ├── README.md
    ├── 2026-03-04_investor-pack-index_v1.md ← 이 문서
    ├── original/                            ← 원본 패키지 (수동 집계 필요)
    └── redacted/                            ← 요약본 (민감정보 가림, 수동 작성 필요)
```

---

## 3. 수집 현황 요약

| 영역 | ID | 항목 | 상태 | 담당 | 마감 |
|------|-----|------|------|------|------|
| 계약 | C-01 | 고객별 계약서 원본 | TODO | BizOps | 2026-03-12 |
| 계약 | C-02 | 계약 개정 이력 | TODO | BizOps | 2026-03-12 |
| 청구 | B-01 | 월별 청구서 목록 | TODO | BizOps | 2026-03-12 |
| 수금 | B-02 | 결제 성공 증빙 | TODO | Finance | 2026-03-12 |
| 대사 | B-03 | 청구-수금-환불 대사표 | TODO | Finance | 2026-03-12 |
| 환불 | R-01 | 환불 요청 원문 | TODO | CS | 2026-03-14 |
| 환불 | R-02 | 환불 승인 근거 | TODO | CS | 2026-03-14 |
| 해지 | R-03 | 해지 처리 근거 | TODO | CS | 2026-03-14 |
| 보안 | S-01 | 스모크 테스트 결과 | **DONE** | SRE | 2026-03-16 |
| 보안 | S-02 | 권한 정책 증빙 | **DONE** | SRE | 2026-03-16 |
| 보안 | S-03 | 사고 대응 기록 | **DONE** | SRE | 2026-03-16 |
| 법무 | L-01 | 이용약관 버전 | **DONE** | Legal | 2026-03-14 |
| 법무 | L-02 | 개인정보 처리방침 | **DONE** | Legal | 2026-03-14 |
| 법무 | L-03 | 환불정책 버전 | **DONE** | Legal | 2026-03-14 |
| 제출 | I-01 | 원본 패키지 zip | 구조 완성 | PMO | 2026-03-20 |
| 제출 | I-02 | 요약본(레드액트) 공유본 | **DONE** | PMO | 2026-03-05 |

**자동화 완료**: 6/16 항목 (S-01~S-03, L-01~L-03)
**수동 수집 필요**: 8/16 항목 (C-01~B-03, R-01~R-03)
**패키지 조립**: 2/16 항목 중 I-02 완료, I-01은 외부 파일 수집 완료 후 진행

---

## 4. 원본 패키지 조립 절차 (I-01)

마감일(2026-03-20)에 다음 순서로 조립합니다:

```bash
# 1. 모든 항목 완료 확인
#    evidence-collection-checklist-2026-03-04.md → 전 항목 DONE

# 2. 폴더 압축
zip -r "DenJOY-DataRoom-v1-YYYY-MM-DD.zip" \
  docs/05-dataroom/01-contracts/ \
  docs/05-dataroom/02-billing-reconciliation/ \
  docs/05-dataroom/03-refund-termination/ \
  docs/05-dataroom/04-security-operations/ \
  docs/05-dataroom/05-policy-versioning/ \
  docs/05-dataroom/evidence-collection-checklist-2026-03-04.md

# 3. 해시 생성 (무결성 검증용)
sha256sum "DenJOY-DataRoom-v1-YYYY-MM-DD.zip" > "DenJOY-DataRoom-v1-YYYY-MM-DD.zip.sha256"

# 4. original/ 폴더에 이동
mv "DenJOY-DataRoom-v1-*.zip" docs/05-dataroom/06-investor-pack/original/
```

---

## 5. 요약본(레드액트) 작성 절차 (I-02)

외부 공유용 PDF 요약본은 다음 정보를 제외하고 작성합니다:

| 제거 항목 | 대체 표현 |
|----------|----------|
| 고객사명, 대표자명 | "고객 A", "고객 B" |
| 계좌번호, 결제 수단 | "결제 완료" |
| 개인 이메일, 전화번호 | "[개인정보 제거]" |
| 환자 수술 기록 | "[의료 데이터 제거]" |

**형식**: PDF (최대 20페이지), 페이지 하단 워터마크 "CONFIDENTIAL - DenJOY"

**사전 점검 체크리스트**: `docs/05-dataroom/06-investor-pack/redacted/redaction-prep-checklist-2026-03-05.md`
**공유본 원문**: `docs/05-dataroom/06-investor-pack/redacted/2026-03-05_investor-pack-redacted-summary_v1.md`
**검토 로그**: `docs/05-dataroom/06-investor-pack/redacted/2026-03-05_legal-finance-review-round_v1.md`

---

## 6. 버전 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.3 | 2026-03-05 | I-02 레드액트 공유본/법무·재무 검토 로그 추가, I-02 상태 DONE 반영 |
| v1.2 | 2026-03-05 | redaction 사전 체크리스트 추가, I-02 준비 상태 명확화 |
| v1.1 | 2026-03-05 | 가격/플랜 정합성 수정 반영 (Plus/Business 명칭, 연간 월환산 기준) |
| v1.0 | 2026-03-04 | 인덱스 최초 작성, 구조 정의 |
