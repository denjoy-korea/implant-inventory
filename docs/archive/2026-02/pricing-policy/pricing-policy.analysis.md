# pricing-policy Gap 분석 보고서

> **Feature**: pricing-policy (가격정책 및 기능 게이팅)
> **Phase**: Check (Gap Analysis)
> **분석일**: 2026-02-15
> **Design 문서**: `docs/02-design/features/pricing-policy.design.md`
> **Match Rate**: 94.2%

---

## 섹션별 분석 결과

### Section 2: DB Schema (P-01) — `supabase/005_plan_schema.sql`
**Status: MATCH (100%)**

| 설계 항목 | 구현 상태 |
|-----------|:---------:|
| `plan` TEXT NOT NULL DEFAULT 'free' + CHECK | MATCH |
| `plan_expires_at` TIMESTAMPTZ | MATCH |
| `billing_cycle` TEXT + CHECK | MATCH |
| `trial_started_at` TIMESTAMPTZ | MATCH |
| `trial_used` BOOLEAN NOT NULL DEFAULT false | MATCH |
| `idx_hospitals_plan` 인덱스 | MATCH |

---

### Section 3: Types & Constants (P-02) — `types.ts`
**Status: MATCH (100%)**

13/13 항목 모두 구현 완료:
- PlanType, BillingCycle, PlanFeature(15개), PlanLimits, PlanPricing, HospitalPlanState
- PLAN_LIMITS(4플랜), PLAN_PRICING, PLAN_NAMES, PLAN_ORDER, TRIAL_DAYS(14)
- DbHospital 확장(5필드), AppState.planState

---

### Section 4: planService (P-03) — `services/planService.ts`
**Status: MATCH (100%)**

10/10 메서드 모두 구현:
- getHospitalPlan, canAccess, canAddItem, canAddUser
- getRequiredPlan, getRequiredPlanForItems, isUpgrade
- startTrial, checkAndExpireTrial, changePlan
- 추가: `_buildPlanState` 내부 헬퍼 (코드 품질 개선)

---

### Section 5: UI Components (P-04)
**Status: MATCH (98%)**

#### 5.1 FeatureGate.tsx — MATCH (100%)
- Props: feature, plan, children, fallback 모두 구현
- canAccess 체크 → children/fallback/LockedOverlay 분기 정상
- UpgradeModal 통합 완료

#### 5.2 UpgradeModal.tsx — PARTIAL (95%)
- 모든 Props 구현, 3단 카드 그리드 정상
- **차이점**: onSelectPlan 시그니처 `(plan, billing)` → 설계는 `(plan)` (기능 향상)

#### 5.3 PlanBadge.tsx — MATCH (100%)
- 플랜별 색상 정확히 구현, sm/md 사이즈 지원
- **추가**: 컬러 dot 인디케이터, border 스타일 (시각 향상)

---

### Section 6: 기존 컴포넌트 통합 (P-05)

#### 6.1 DashboardOverview — MATCH (100%)
- planState, isMaster, onStartTrial, onGoToPricing props 추가
- 플랜 상태 카드: PlanBadge + 품목 사용량 + 체험 정보
- BrandChart FeatureGate(brand_analytics) 래핑 완료
- 체험 시작/업그레이드 버튼 조건부 표시

#### 6.2 App.tsx Header — MATCH (100%)
- 하드코딩 `new Date('2027-01-15')` 제거 완료
- planState.daysUntilExpiry 동적 표시
- PlanBadge 컴포넌트 사용 (비관리자)
- loadHospitalData에서 checkAndExpireTrial 호출
- PricingPage에 currentPlan/onSelectPlan props 전달

#### 6.3 UserProfile — MATCH (100%)
- 하드코딩 subscription 객체 제거 완료
- planState props 수신, 동적 플랜 카드 렌더링
- 체험 중/무료/유료 3가지 상태 분기 처리
- 결제 정보 섹션 동적화
- onChangePlan 버튼 핸들러 연결

---

### Section 7: PricingPage (P-06)
**Status: PARTIAL (95%)**

- currentPlan, onSelectPlan props 추가 완료
- "현재" 배지 표시 (emerald 뱃지)
- 현재 플랜 CTA 비활성화 ("현재 플랜")
- **차이점**: 상위/하위 플랜 CTA 텍스트가 "업그레이드"/"다운그레이드"가 아닌 원래 CTA 유지 (영향도 낮음)

---

### Section 8: Trial Logic (P-07)
**Status: MATCH (100%)**

- startTrial: Plus 플랜으로 변경 + trial_started_at 설정
- checkAndExpireTrial: 14일 경과 시 free 다운그레이드
- App.tsx 초기화 시 자동 체험 만료 체크
- 대시보드 체험 배너: 시작 전/중/후 3가지 상태

---

### Section 9: Feature Gating
**Status: PARTIAL (50%)**

| 게이팅 포인트 | 구현 | 상태 |
|---------------|:----:|:----:|
| BrandChart FeatureGate (brand_analytics) | O | MATCH |
| InventoryManager canAddItem 체크 | O | MATCH |
| 일괄 반영 시 품목 수 제한 슬라이싱 | O | MATCH |
| MemberManager canAddUser 체크 | X | **MISSING** |
| Sidebar auto_stock_alert FeatureGate | X | **MISSING** |
| 6개월 데이터 보관 제한 안내 | X | **MISSING** |

---

## 미구현 항목 (Gaps)

### GAP-1: MemberManager 사용자 수 제한 (영향도: Medium)
- **설계**: 멤버 초대 시 `canAddUser()` 체크 + UpgradeModal
- **현황**: MemberManager에 planState props 미전달, canAddUser 체크 없음
- **권장 조치**: MemberManager에 planState 전달 후 초대 핸들러에 체크 추가

### GAP-2: Sidebar 자동 재고 알림 FeatureGate (영향도: Low)
- **설계**: 알림 설정 메뉴에 `<FeatureGate feature="auto_stock_alert">` 래핑
- **현황**: Sidebar에 알림 설정 메뉴 자체가 현재 미구현 (미래 기능)
- **권장 조치**: 해당 기능 구현 시 함께 적용 (현재 Deferred 가능)

### GAP-3: 데이터 보관 기간 제한 (영향도: Low)
- **설계**: 수술기록 조회 시 플랜별 보관 기간 초과 데이터 제한 안내
- **현황**: 미구현 (쿼리 레벨 필터링 필요)
- **권장 조치**: Phase 2에서 서버 측 제한과 함께 구현 (Deferred 가능)

---

## Match Rate 산출

| 섹션 | 가중치 | 점수 | 가중 점수 |
|------|:------:|:----:|:---------:|
| DB Schema (P-01) | 10% | 100% | 10.0% |
| Types (P-02) | 10% | 100% | 10.0% |
| planService (P-03) | 20% | 100% | 20.0% |
| UI Components (P-04) | 15% | 98% | 14.7% |
| Dashboard Display (P-05) | 15% | 100% | 15.0% |
| PricingPage (P-06) | 10% | 95% | 9.5% |
| Trial Logic (P-07) | 10% | 100% | 10.0% |
| Feature Gating (Section 9) | 10% | 50% | 5.0% |
| **합계** | **100%** | | **94.2%** |

---

## 결론

**Overall Match Rate: 94.2% (PASS)**

핵심 인프라(DB, 타입, 서비스, UI 컴포넌트)는 설계 문서와 100% 일치합니다.
미구현 3건은 모두 Feature Gating 적용 포인트로:
- GAP-1(MemberManager)만 즉시 수정 권장
- GAP-2, GAP-3은 해당 기능 자체가 미구현/미래 기능이므로 Deferred 가능

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-02-15 | 초안 작성 (Match Rate: 94.2%) |
