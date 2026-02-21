# Gap Analysis: product-strategy

**Date**: 2026-02-22
**Overall Match Rate**: 72% → Target: 90%+

---

## 섹션별 점수

| 섹션 | 점수 | 상태 |
|------|:----:|:----:|
| 1. 결제 플로우 | 88% | Warning |
| 2. 온보딩 위자드 | 82% | Warning |
| 3. 넛지 시스템 | 62% | Critical |
| 4. 데이터 모델 | 33% | Critical (P1 제외 시 50%) |
| **전체** | **72%** | **Warning** |

---

## 주요 갭 목록

### High Priority
| # | 항목 | 내용 |
|---|------|------|
| G1 | T1 `data_expiry_warning` 미구현 | 데이터 보관 만료 D-7 넛지 — `retentionDaysLeft` 필드 없음 |
| G2 | T3 `upload_limit` 미구현 | 업로드 한도 초과 넛지 — 업로드 횟수 추적 없음 |

### Medium Priority
| # | 항목 | 내용 |
|---|------|------|
| G3 | Step4 GIF/샘플 없음 | 덴트웹 내보내기 GIF 애니메이션, 엑셀 샘플 다운로드 미포함 |
| G4 | `PlanLimitToast.tsx` 미생성 | 디자인 스펙에만 존재 |
| G5 | `TrialCountdown.tsx` 미생성 | 사이드바 인라인으로 대체됨 |
| G6 | 모달 너비 | `max-w-lg` vs 설계 `max-w-2xl` |

### Low Priority (즉시 수정 가능)
| # | 항목 | 내용 |
|---|------|------|
| G7 | VAT 레이블 | 요금 카드: "부가세 별도" → "VAT 별도" |
| G8 | 슬라이드 애니메이션 | 스텝 전환 시 slide-in 없음 |

### 의도적 변경 (설계 문서 업데이트 필요)
| # | 항목 | 결정 |
|---|------|------|
| D1 | IBS 브랜드명 | Magicore C3/S3 → "IBS Implant" (실제 덴트웹 데이터 기준) |
| D2 | 브랜드 3개 추가 | 메가젠, Straumann, 덴티스 추가 |
| D3 | localStorage 사용 | `onboarding_completed_at` DB 컬럼 대신 localStorage 사용 |

---

## 수정 계획

### 즉시 수정 (G6, G7, G8)
- 모달 너비 `max-w-2xl`로 변경
- VAT 레이블 통일
- 스텝 전환 애니메이션 추가

### 보류 (G1, G2 — 서버사이드 데이터 필요)
- T1: 수술기록 최초 업로드일 기준 만료일 계산 → 추후 planService 확장 시 구현
- T3: 월별 업로드 횟수 추적 → billing_history 또는 별도 테이블 필요

### 설계 문서 반영 (D1, D2, D3)
- 브랜드 목록 실제 구현 기준으로 업데이트
- localStorage 사용 결정 문서화
