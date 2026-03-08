# Design: pricing-overhaul

## 개요

| 항목 | 내용 |
|------|------|
| **Feature** | pricing-overhaul |
| **Phase** | Design |
| **작성일** | 2026-03-08 |
| **Plan 참조** | `docs/01-plan/features/pricing-overhaul.plan.md` |

---

## 1. 타입 시스템 변경 (`types/plan.ts`)

### 1-1. PlanFeature enum 추가

```ts
export type PlanFeature =
  // 기존 유지
  | 'dashboard_basic'
  | 'dashboard_advanced'
  | 'excel_upload'
  | 'realtime_stock'
  | 'brand_analytics'
  | 'fail_management'
  | 'order_execution'
  | 'inventory_audit'
  | 'audit_history'
  | 'return_management'
  | 'auto_stock_alert'
  | 'monthly_report'
  | 'yearly_report'
  | 'supplier_management'
  | 'one_click_order'
  | 'ai_forecast'
  | 'role_management'
  | 'audit_log'
  | 'email_support'
  | 'priority_support'
  | 'integrations'
  // 신규 추가
  | 'surgery_chart_basic'      // 수술기록 기본 차트 (월별추세·요일별패턴) — Basic+
  | 'surgery_chart_advanced'   // 수술기록 고급 차트 전체 — Plus+
  | 'exchange_analysis'        // 교환관리 하단 4섹션 분석 — Plus+
  | 'order_optimization'       // 발주 최적화 추천 + OptimizeModal — Plus+
  | 'simple_order';            // 간편발주 (카톡 복사) — Plus+
```

### 1-2. PlanLimits 인터페이스 확장

```ts
export interface PlanLimits {
  maxItems: number;
  maxUsers: number;
  maxBaseStockEdits: number;
  retentionMonths: number;          // 실제 DB 저장 기간 (모든 플랜 24개월)
  viewMonths: number;               // 신규: 조회 가능 기간 (Free=3, Basic=12, Plus/Business=24)
  uploadFrequency: 'monthly' | 'weekly' | 'unlimited';  // 신규: 업로드 빈도
  features: PlanFeature[];
}
```

### 1-3. PLAN_LIMITS 값 변경

```ts
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxItems: 50,
    maxUsers: 1,
    maxBaseStockEdits: 0,           // 재고관리 없음
    retentionMonths: 24,            // 저장은 24개월
    viewMonths: 3,                  // 조회는 3개월
    uploadFrequency: 'monthly',
    features: ['excel_upload'],     // 재고/발주 대시보드 제거
  },
  basic: {
    maxItems: 150,
    maxUsers: 1,
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    viewMonths: 12,
    uploadFrequency: 'weekly',
    features: [
      'dashboard_basic', 'excel_upload', 'realtime_stock',
      'fail_management', 'order_execution', 'inventory_audit',
      'surgery_chart_basic',
    ],
  },
  plus: {
    maxItems: 300,
    maxUsers: 5,
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    viewMonths: 24,
    uploadFrequency: 'unlimited',
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'fail_management', 'order_execution', 'inventory_audit',
      'surgery_chart_basic', 'surgery_chart_advanced',
      'brand_analytics', 'audit_history', 'return_management',
      'auto_stock_alert', 'exchange_analysis', 'order_optimization',
      'simple_order', 'role_management', 'email_support', 'integrations',
    ],
  },
  business: {
    maxItems: Infinity,
    maxUsers: 10,                   // 기본 10명 (초과 시 별도 과금)
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    viewMonths: 24,
    uploadFrequency: 'unlimited',
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'fail_management', 'order_execution', 'inventory_audit',
      'surgery_chart_basic', 'surgery_chart_advanced',
      'brand_analytics', 'audit_history', 'return_management',
      'auto_stock_alert', 'exchange_analysis', 'order_optimization',
      'simple_order', 'one_click_order', 'monthly_report', 'yearly_report',
      'supplier_management', 'ai_forecast', 'role_management',
      'audit_log', 'email_support', 'priority_support', 'integrations',
    ],
  },
  ultimate: {
    // 기존 유지
    maxItems: Infinity,
    maxUsers: Infinity,
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    viewMonths: 24,
    uploadFrequency: 'unlimited',
    features: [ /* business와 동일 */ ],
  },
};
```

### 1-4. PLAN_PRICING 변경

```ts
export const PLAN_PRICING: Record<PlanType, PlanPricing> = {
  free:     { monthlyPrice: 0,       yearlyPrice: 0 },
  basic:    { monthlyPrice: 27000,   yearlyPrice: 21000 },  // 29,000 → 27,000
  plus:     { monthlyPrice: 59000,   yearlyPrice: 47000 },  // 69,000 → 59,000
  business: { monthlyPrice: 129000,  yearlyPrice: 103000 }, // 유지
  ultimate: { monthlyPrice: 0,       yearlyPrice: 0 },
};

/** Business 추가 사용자 단가 (월, 부가세 별도) */
export const EXTRA_USER_PRICE_PER_MONTH = 5000;
// 연간 할인 단가는 추후 비즈니스 정책 확정 시 추가
```

---

## 2. 서비스 레이어 변경 (`services/planService.ts`)

### 2-1. `canUploadSurgery` 수정

```ts
canUploadSurgery(plan: PlanType, lastUploadDate: Date | null) {
  const freq = PLAN_LIMITS[plan].uploadFrequency;

  if (freq === 'unlimited') return { allowed: true, nextAvailableDate: null };
  if (!lastUploadDate)      return { allowed: true, nextAvailableDate: null };

  const now = new Date();

  if (freq === 'monthly') {
    // Free: 캘린더 월 1회 (2/15 → 3/15)
    const next = new Date(lastUploadDate);
    next.setMonth(next.getMonth() + 1);
    return now >= next
      ? { allowed: true,  nextAvailableDate: null }
      : { allowed: false, nextAvailableDate: next };
  }

  if (freq === 'weekly') {
    // Basic: 7일 1회
    const next = new Date(lastUploadDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    return now >= next
      ? { allowed: true,  nextAvailableDate: null }
      : { allowed: false, nextAvailableDate: next };
  }

  return { allowed: true, nextAvailableDate: null };
},
```

### 2-2. `canViewData` 신규 함수

```ts
/**
 * 수술기록 조회 가능 날짜 하한선 반환
 * Free: 오늘 기준 3개월 전 / Basic: 12개월 전 / Plus+: 24개월 전
 */
canViewDataFrom(plan: PlanType): Date {
  const months = PLAN_LIMITS[plan].viewMonths;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
},
```

---

## 3. FeatureGate 컴포넌트 변경 (`components/FeatureGate.tsx`)

### 3-1. FEATURE_LOCK_CONFIG 추가

```ts
const FEATURE_LOCK_CONFIG: Partial<Record<PlanFeature, { title: string; desc: string }>> = {
  // 기존 유지 ...

  // 신규 추가
  surgery_chart_basic: {
    title: '수술 통계 차트',
    desc: '월별 추세와 요일별 식립 패턴을 분석해 진료 흐름을 파악하세요.',
  },
  surgery_chart_advanced: {
    title: '고급 수술 통계',
    desc: '전체 통계 차트로 심층 인사이트를 확인하세요.',
  },
  exchange_analysis: {
    title: '교환 심층 분석',
    desc: '전체 교환 현황, 제조사 분석, 월별 추세, 다빈도 규격을 한눈에 확인하세요.',
  },
  order_optimization: {
    title: '발주 최적화',
    desc: '소비 패턴 기반으로 최적 발주량을 자동으로 추천해드립니다.',
  },
  simple_order: {
    title: '간편발주',
    desc: '제조사별 발주 목록을 클립보드로 복사해 바로 발주하세요.',
  },
  monthly_report: {
    title: '월간 리포트',
    desc: '매월 사용 현황을 자동으로 집계해 리포트로 받아보세요.',
  },
};
```

---

## 4. 사이드바 변경 (`components/Sidebar.tsx`)

### 4-1. TAB_FEATURE_MAP 수정

```ts
const TAB_FEATURE_MAP: Partial<Record<DashboardTab, PlanFeature>> = {
  surgery_db:         undefined,          // Free도 접근 가능 (조회 범위만 제한)
  inventory_master:   'dashboard_basic',  // Basic+ — Free는 잠금
  order_management:   'order_execution',  // Basic+
  fail_management:    'fail_management',  // Basic+
  inventory_audit:    'inventory_audit',  // Basic+
  member_management:  'role_management',  // Plus+
  audit_log:          'audit_log',        // Business
};
```

> **변경 포인트**: `inventory_master` 탭이 신규로 `dashboard_basic` feature로 게이팅됨
> → Free 플랜에서 재고관리 마스터 메뉴 자물쇠 표시

---

## 5. 수술기록 DB 화면 변경 (`components/SurgeryDashboard.tsx`)

### 5-1. 조회 범위 clamp

```ts
// 데이터 필터링 시 planService.canViewDataFrom() 적용
const viewFrom = planService.canViewDataFrom(effectivePlan);
const filteredData = surgeryData.filter(row =>
  new Date(row.surgery_date) >= viewFrom
);
```

### 5-2. 차트 게이팅

```ts
// 기본 차트 (Basic+)
{planService.canAccess(effectivePlan, 'surgery_chart_basic') ? (
  <MonthlyTrendChart data={filteredData} />
) : (
  <FeatureGate feature="surgery_chart_basic" plan={effectivePlan}>
    <MonthlyTrendChart data={filteredData} />
  </FeatureGate>
)}

// 고급 차트 (Plus+)
{planService.canAccess(effectivePlan, 'surgery_chart_advanced') ? (
  <AdvancedChartsSection data={filteredData} />
) : (
  <FeatureGate feature="surgery_chart_advanced" plan={effectivePlan}>
    <AdvancedChartsSection data={filteredData} />
  </FeatureGate>
)}
```

### 5-3. 업그레이드 유도 배너 (Free 전용)

Free 플랜에서 3개월 초과 데이터가 DB에 존재할 경우:

```tsx
{effectivePlan === 'free' && hasDataBeyondView && (
  <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between">
    <p className="text-sm text-indigo-700">
      <span className="font-bold">{hiddenMonths}개월치 기록</span>이 저장되어 있습니다.
      업그레이드하면 바로 확인하실 수 있어요.
    </p>
    <button onClick={onUpgrade} className="text-xs font-bold text-indigo-600 underline">
      플랜 보기
    </button>
  </div>
)}
```

---

## 6. 교환 관리 변경 (`components/FailManager.tsx` 또는 관련 컴포넌트)

### 6-1. 하단 분석 4섹션 FeatureGate 래핑

```tsx
<FeatureGate feature="exchange_analysis" plan={effectivePlan}>
  <div className="grid grid-cols-2 gap-4">
    <ExchangeSummarySection />     {/* 전체 교환 현황 */}
    <ManufacturerAnalysis />       {/* 제조사 분석 */}
    <MonthlyExchangeTrend />       {/* 월별 교환 추세 */}
    <TopExchangeItems />           {/* 교환 다빈도 규격 */}
  </div>
</FeatureGate>
```

---

## 7. 재고관리 마스터 변경 (`components/InventoryManager.tsx`)

### 7-1. 규격별 사용량 분석 FeatureGate

```tsx
<FeatureGate feature="brand_analytics" plan={effectivePlan}>
  <UsageAnalysisPanel />
</FeatureGate>
```

---

## 8. 발주관리 변경 (`components/OrderManager.tsx` 등)

### 8-1. 반품 관리 FeatureGate (`return_management`)

현재 `ReturnManager`가 `OrderManager` 내부 탭으로 플랜 무관하게 접근 가능.
`DashboardOperationalTabs.tsx`에서 `order_execution` 게이팅 내부에 있어 Basic+는 모두 접근 가능하지만,
`return_management`는 Plus+ 전용이므로 별도 분리 필요.

```tsx
// OrderManager 내부 탭 구조 변경
{activeTab === 'returns' && (
  <FeatureGate feature="return_management" plan={effectivePlan}>
    <ReturnManager ... />
  </FeatureGate>
)}
```

### 8-2. 발주 최적화 FeatureGate (`order_optimization`)

```tsx
// OptimizeModal 트리거 버튼
<FeatureGate feature="order_optimization" plan={effectivePlan}>
  <button onClick={() => setShowOptimize(true)}>발주 최적화</button>
</FeatureGate>
```

---

## 9. 신규 기능: 간편발주 (`simple_order`) — Phase 2

### 9-1. UI 위치
`OrderManager` 또는 `주문관리 마스터` 페이지 상단 — "간편발주" 버튼

### 9-2. 동작 흐름

```
[발주 권장 품목] 로드
→ 제조사별 그룹핑
→ 품목명·규격·수량 텍스트 포맷 생성
→ [복사] 버튼 클릭
→ navigator.clipboard.writeText(text)
→ "클립보드에 복사됐습니다" 토스트
→ 카톡 등에 붙여넣기 후 발주
```

### 9-3. 복사 텍스트 포맷

```
[IBS Implant 발주 요청 - 2026.03.08]
- TSIII SA Ø4.0×10 : 5개
- TSIII SA Ø4.5×10 : 3개
- Rescue Ø4.0×10 : 2개

[OSSTEM 발주 요청 - 2026.03.08]
- US+ Ø4.0×10 : 4개
```

### 9-4. 컴포넌트

```
components/order/SimpleOrderCopyButton.tsx  — 신규
  props: items: OrderItem[], plan: PlanType
  FeatureGate('simple_order') 내부에서 렌더링
```

---

## 10. 신규 기능: Business 추가 사용자 과금

### 10-1. 흐름

```
구성원 관리 → [멤버 추가] 클릭
→ 현재 사용자 수 >= 10 확인
→ 추가 사용자 과금 안내 모달
  "1인당 월 5,000원(부가세 별도)이 추가됩니다"
→ 결제 승인 → 멤버 추가 완료
```

### 10-2. 관련 타입 추가

```ts
// types/plan.ts
export const EXTRA_USER_PRICE_PER_MONTH = 5000; // 부가세 별도, 연간 할인 단가는 추후 확정
```

### 10-3. DB 변경 (Migration 필요)

```sql
-- 현재 hospitals 테이블에 extra_user_count 컬럼 추가
ALTER TABLE hospitals ADD COLUMN extra_user_count INTEGER DEFAULT 0;
```

---

## 11. 결제 모달 변경 (`components/pricing/PricingPaymentModal.tsx`)

### 11-1. 계좌이체 비활성화

```tsx
<button
  onClick={() => setPaymentMethod('transfer')}
  disabled={true}                    // 토스 정식 가맹 전까지 비활성화
  className={`... ${true ? 'opacity-40 cursor-not-allowed' : ''}`}
>
  계좌이체
  <span className="ml-1 text-xs text-slate-400">(준비 중)</span>
</button>
```

---

## 12. pricingData.tsx 전면 개편

### 12-1. 가격 import

```ts
import { PLAN_PRICING, PLAN_LIMITS, TRIAL_DAYS } from '../../types/plan';
```

### 12-2. plans 배열 — 차별화 기능만 표시

상위 플랜 포함 기능 목록 대신, **해당 플랜에서 새로 추가되는 기능만** 표시.

```ts
export const plans: Plan[] = [
  {
    name: 'Free',
    monthlyPrice: PLAN_PRICING.free.monthlyPrice,  // 0
    features: [
      '수술기록 월 1회 업로드',
      '최근 3개월 통계 조회',
      '총 식립·교환율·월 평균 카드',
      `품목 ${PLAN_LIMITS.free.maxItems}개`,
      '1명 사용자',
    ],
    // ...
  },
  {
    name: 'Basic',
    monthlyPrice: PLAN_PRICING.basic.monthlyPrice,  // 27,000
    yearlyPrice: PLAN_PRICING.basic.yearlyPrice,    // 21,000
    features: [
      `품목 ${PLAN_LIMITS.basic.maxItems}개 (Free 대비 3배)`,
      '조회 12개월 (소급 열람)',
      '재고·발주·교환 관리',
      '재고 실사',
      '주 1회 수술기록 업로드',
    ],
    // ...
  },
  {
    name: 'Plus',
    monthlyPrice: PLAN_PRICING.plus.monthlyPrice,   // 59,000
    yearlyPrice: PLAN_PRICING.plus.yearlyPrice,     // 47,000
    features: [
      `최대 ${PLAN_LIMITS.plus.maxUsers}명 팀 + 역할 권한`,
      '상시 업로드 + 24개월 조회',
      '브랜드·고급 대시보드·자동 알림',
      '교환 심층 분석',
      '간편발주 (출시 예정)',
    ],
    // ...
  },
  {
    name: 'Business',
    monthlyPrice: PLAN_PRICING.business.monthlyPrice,  // 129,000
    yearlyPrice: PLAN_PRICING.business.yearlyPrice,    // 103,000
    features: [
      '품목 무제한',
      `기본 ${PLAN_LIMITS.business.maxUsers}명 + 추가 5,000원/인`,
      '원클릭 발주 시스템 (출시 예정)',
      'AI 기반 수요 예측',
      '월간·연간 리포트',
    ],
    // ...
  },
];
```

### 12-3. formatPrice 중복 제거

`PricingPaymentModal.tsx`의 로컬 `formatPrice` 제거 → `pricingData.tsx`에서 import

---

## 13. hooks/useFileUpload.ts 수정

### dead code 제거

```ts
// 삭제 대상 (line ~52)
// "베이직 플랜은 주 1회" 에러 메시지 분기 제거
// Free 전용 메시지만 남김
```

---

## 14. 구현 순서 (Milestone 기준)

### Milestone 1 — 긴급 코드 정합성 (즉시 배포)
```
1. types/plan.ts — PLAN_LIMITS·PLAN_PRICING 수치 변경, 신규 PlanFeature 추가
2. planService.ts — canUploadSurgery 주 1회 로직, canViewDataFrom 신규
3. FeatureGate.tsx — FEATURE_LOCK_CONFIG 신규 항목 추가
4. OrderManager/ReturnManager — return_management FeatureGate 추가
5. OptimizeModal — order_optimization FeatureGate 추가
6. PricingPaymentModal.tsx — 계좌이체 비활성화
7. useFileUpload.ts — dead code 제거
```

### Milestone 2 — 화면 잠금 처리
```
1. Sidebar.tsx — TAB_FEATURE_MAP inventory_master 추가
2. SurgeryDashboard.tsx — viewMonths clamp + 차트 FeatureGate + 업그레이드 배너
3. FailManager.tsx — exchange_analysis FeatureGate 4섹션
4. InventoryManager.tsx — brand_analytics (규격별 사용량) FeatureGate
```

### Milestone 3 — pricingData 개편
```
1. pricingData.tsx — PLAN_PRICING import, 차별화 기능 목록, 비교표 신규 반영
2. PricingPaymentModal.tsx — formatPrice 중복 제거
```

### Milestone 4 — 신규 기능 (별도 스프린트)
```
1. SimpleOrderCopyButton.tsx 신규
2. Business 추가 사용자 과금 모달 + Migration
3. 원클릭 발주 시스템 (별도 PDCA)
```

---

## 15. 영향 범위 체크리스트

| 파일 | 변경 유형 | M |
|------|-----------|---|
| `types/plan.ts` | PlanFeature 추가, PLAN_LIMITS 수치, PLAN_PRICING 변경 | 1 |
| `services/planService.ts` | canUploadSurgery, canViewDataFrom | 1 |
| `components/FeatureGate.tsx` | FEATURE_LOCK_CONFIG 추가 | 1 |
| `components/OrderManager.tsx` | return_management 게이팅 | 1 |
| `components/pricing/PricingPaymentModal.tsx` | 계좌이체 비활성화, formatPrice 제거 | 1 |
| `hooks/useFileUpload.ts` | dead code 제거 | 1 |
| `components/Sidebar.tsx` | TAB_FEATURE_MAP 추가 | 2 |
| `components/SurgeryDashboard.tsx` | clamp, FeatureGate, 배너 | 2 |
| `components/FailManager.tsx` | exchange_analysis FeatureGate | 2 |
| `components/InventoryManager.tsx` | brand_analytics FeatureGate | 2 |
| `components/pricing/pricingData.tsx` | 전면 개편 | 3 |
| `components/order/SimpleOrderCopyButton.tsx` | 신규 | 4 |
| `supabase/migrations/` | extra_user_count 컬럼 | 4 |

---

## 16. 테스트 체크포인트

### 플랜별 접근 검증
- [ ] Free: 재고관리·주문·교환·실사 메뉴 → 자물쇠 표시
- [ ] Free: 수술기록 3개월 초과 데이터 → 조회 안 됨 + 업그레이드 배너
- [ ] Basic: 교환 하단 4섹션 → FeatureGate 잠금
- [ ] Basic: 규격별 사용량 분석 → FeatureGate 잠금
- [ ] Basic: 반품 관리 → FeatureGate 잠금
- [ ] Basic: 업로드 주 1회 제한 동작
- [ ] Plus: 교환 분석 4섹션 → 열람 가능
- [ ] Plus: 간편발주 버튼 → "출시 예정" 표기
- [ ] Business: 원클릭 발주 → "출시 예정" 표기
- [ ] Business: 10명 초과 멤버 추가 시 → 추가 과금 안내

### 요금제 페이지 검증
- [ ] 가격 변경 반영 (Basic 27,000 / Plus 59,000)
- [ ] 차별화 기능만 카드에 표시
- [ ] 계좌이체 버튼 "준비 중" 비활성화
- [ ] pricingData.tsx 하드코딩 가격 → PLAN_PRICING 참조 확인
