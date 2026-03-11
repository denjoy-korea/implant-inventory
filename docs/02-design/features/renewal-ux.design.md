# Design: renewal-ux

## Overview
- **Feature**: 구독 갱신 UX 개선
- **Based on Plan**: `docs/01-plan/features/renewal-ux.plan.md`
- **Created**: 2026-03-12

## 변경 대상 파일

| 파일 | 변경 유형 | 이유 |
|------|----------|------|
| `components/profile/UserPlanPickerPanel.tsx` | 수정 | 갱신 CTA 강화, 버튼 텍스트, D-30 강조 |
| `components/UserProfile.tsx` | 수정 | 만료 임박 배너 + "플랜 변경" → "갱신/변경" 버튼 |
| `hooks/useAppLogic.tsx` | 수정 | 갱신 완료 토스트 메시지 구분 |

---

## 1. `UserPlanPickerPanel.tsx`

### 1-1. `isRenewalSelected` 로직 확장

**현재 코드** (line 56-58):
```typescript
const isRenewalSelected = pickerSelectedPlan !== null
  && planState?.plan === pickerSelectedPlan
  && isCurrentCycle;
```

**변경 후**:
```typescript
// 동일 플랜 선택 여부
const isSamePlanSelected = pickerSelectedPlan === currentPlanId;
// 갱신: 동일 플랜 + 동일 사이클
const isRenewalSelected = isSamePlanSelected && isCurrentCycle;
// 사이클 전환: 동일 플랜 + 다른 사이클 (월간→연간 또는 연간→월간)
const isCycleSwitch = isSamePlanSelected && !isCurrentCycle;
```

### 1-2. 현재 플랜 카드 — D-30 이하 강조

**현재 코드** (line 74-121): 카드 border 색상 변화 없음, 배지만 "현재 · 갱신"

**변경 후**: `daysLeft <= 30`이면 amber/red 강조 테두리 + "지금 갱신" 서브텍스트

```typescript
// 카드 border + 배경 동적 결정
const urgencyStyle = (() => {
  if (!daysLeft) return { border: 'border-indigo-400', bg: 'from-indigo-50', badge: 'bg-indigo-100 text-indigo-700' };
  if (daysLeft <= 7)  return { border: 'border-red-400',   bg: 'from-red-50',   badge: 'bg-red-100 text-red-700' };
  if (daysLeft <= 30) return { border: 'border-amber-400', bg: 'from-amber-50', badge: 'bg-amber-100 text-amber-700' };
  return               { border: 'border-indigo-400', bg: 'from-indigo-50', badge: 'bg-indigo-100 text-indigo-700' };
})();
```

카드 오른쪽 패널에 만료 임박 시 서브텍스트 추가:
```tsx
{daysLeft !== null && daysLeft <= 30 && (
  <p className={`text-[9px] font-bold mt-1 ${daysLeft <= 7 ? 'text-red-500' : 'text-amber-600'}`}>
    {daysLeft <= 7 ? '곧 만료됩니다!' : '갱신을 권장합니다'}
  </p>
)}
```

### 1-3. 하단 신청 버튼 텍스트 개선

**현재 코드** (line 184-188):
```tsx
{isRenewalSelected
  ? `${PLAN_NAMES[pickerSelectedPlan]} 플랜 갱신하기`
  : pickerSelectedPlan === 'free'
    ? '무료 플랜으로 전환하기'
    : `${PLAN_NAMES[pickerSelectedPlan]} 플랜 결제하기`}
```

**변경 후**: `isCycleSwitch` 케이스 추가
```tsx
{isRenewalSelected
  ? `${PLAN_NAMES[pickerSelectedPlan!]} 플랜 갱신하기`
  : isCycleSwitch
    ? pickerCycle === 'yearly'
      ? `${PLAN_NAMES[pickerSelectedPlan!]} 플랜 연간으로 전환하기`
      : `${PLAN_NAMES[pickerSelectedPlan!]} 플랜 월간으로 전환하기`
  : pickerSelectedPlan === 'free'
    ? '무료 플랜으로 전환하기'
    : `${PLAN_NAMES[pickerSelectedPlan!]} 플랜으로 변경하기`}
```

> 업그레이드 기존 텍스트 "결제하기" → "변경하기"로 통일 (더 명확)

### 1-4. Props 추가 없음
`daysLeft`는 이미 컴포넌트 내부에서 `planState?.daysUntilExpiry`로 계산함 (line 39).

---

## 2. `UserProfile.tsx`

### 2-1. 만료 임박 배너 — plan 탭 상단

현재 plan 탭(`!showPlanPicker` 분기) 진입 시 아무 배너 없음.

**추가 위치**: line 577 `<div className="space-y-2.5">` 바로 아래

```tsx
{/* 만료 임박 배너 (D-30 이하 유료 플랜) */}
{planState?.plan !== 'free' && !planState?.isTrialActive && !isUltimatePlan
  && planState?.daysUntilExpiry !== undefined
  && planState.daysUntilExpiry <= 30 && planState.daysUntilExpiry > 0 && (
  <button
    onClick={() => setShowPlanPicker(true)}
    className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
      planState.daysUntilExpiry <= 7
        ? 'bg-red-50 border border-red-200 hover:bg-red-100'
        : 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
    }`}
  >
    <div className="flex items-center gap-2">
      <svg className={`w-3.5 h-3.5 flex-shrink-0 ${planState.daysUntilExpiry <= 7 ? 'text-red-500' : 'text-amber-500'}`}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span className={`text-[10px] font-bold ${planState.daysUntilExpiry <= 7 ? 'text-red-700' : 'text-amber-700'}`}>
        {planState.daysUntilExpiry <= 7
          ? `D-${planState.daysUntilExpiry} — 곧 만료됩니다. 지금 갱신하세요.`
          : `D-${planState.daysUntilExpiry} — 만료 전 갱신하면 이어서 이용할 수 있습니다.`}
      </span>
    </div>
    <span className={`text-[10px] font-black flex-shrink-0 ${planState.daysUntilExpiry <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
      갱신 →
    </span>
  </button>
)}
```

### 2-2. "플랜 변경" 버튼 텍스트 동적 변경

**현재** (line 696-698):
```tsx
<button onClick={() => setShowPlanPicker(true)} ...>
  플랜 변경
</button>
```

**변경 후**: 만료 임박 시 "갱신 / 변경"으로 표시
```tsx
<button onClick={() => setShowPlanPicker(true)} ...>
  {planState?.daysUntilExpiry !== undefined && planState.daysUntilExpiry <= 30
    ? '갱신 / 변경'
    : '플랜 변경'}
</button>
```

---

## 3. `hooks/useAppLogic.tsx`

### 3-1. 갱신 완료 토스트 메시지 구분

**현재 코드** (line 559-601): 갱신/업그레이드 모두 동일 경로 → "플랜 변경" 메시지 없음
(현재 코드에서는 `handleOpenDirectPayment`로만 연결되고, 성공 메시지는 `refreshPlanState` 후 별도 없음)

확인: `DirectPaymentModal`의 `onSuccess`는 `refreshPlanState() + setDirectPayment(null)`만 호출.
→ 갱신 완료 토스트가 **현재 없음** — 추가 필요.

**`onSuccess` 콜백에 플랜 + 갱신 여부 전달 방법**:

`handleOpenDirectPayment` 호출 시 `isRenewal` 정보를 함께 저장:

```typescript
// useAppLogic.tsx
const [directPayment, setDirectPayment] = useState<{
  plan: PlanType;
  billing: BillingCycle;
  isRenewal?: boolean;  // 신규 추가
} | null>(null);

const handleOpenDirectPayment = useCallback(
  (plan: PlanType, billing: BillingCycle = 'monthly', isRenewal = false) => {
    setDirectPayment({ plan, billing, isRenewal });
  }, []
);
```

`onChangePlan`에서 isRenewal 전달:
```typescript
onChangePlan: async (plan: PlanType, billing: BillingCycle) => {
  const currentPlan = state.planState?.plan ?? 'free';
  const isRenewal = plan === currentPlan;  // 동일 플랜
  // ...
  setState(prev => ({ ...prev, showProfile: false }));
  handleOpenDirectPayment(plan, billing, isRenewal);
},
```

`App.tsx` DirectPaymentModal `onSuccess`:
```tsx
onSuccess={async () => {
  await refreshPlanState();
  setDirectPayment(null);
  if (directPayment?.isRenewal) {
    // 새 만료일 계산: refreshPlanState 후 planState 업데이트되므로 일반 메시지 사용
    showAlertToast(
      `${PLAN_NAMES[directPayment.plan]} 플랜이 갱신되었습니다.`,
      'success'
    );
  }
}}
```

> 업그레이드/다운그레이드는 기존 플랜 변경 확인 모달(`setConfirmModal`)에서 이미 처리 → 변경 없음

---

## UI 상태 매트릭스

| 상태 | 배너 | 카드 테두리 | 버튼 텍스트 |
|------|------|-----------|------------|
| D-30 초과 | 없음 | indigo | "플랜 변경" |
| D-8 ~ D-30 | amber 배너 | amber | "갱신 / 변경" |
| D-1 ~ D-7 | red 배너 | red | "갱신 / 변경" |
| 만료됨 (D-0) | 없음 (기존 만료 처리) | 기존 | 기존 |

### 버튼 텍스트 결정 트리

```
pickerSelectedPlan 선택 후:

isSamePlanSelected?
  ├── YES + isCurrentCycle  → "Business 플랜 갱신하기"
  ├── YES + !isCurrentCycle → "Business 플랜 연간으로 전환하기" (또는 월간)
  └── NO
       ├── free              → "무료 플랜으로 전환하기"
       └── other             → "Plus 플랜으로 변경하기"
```

---

## Acceptance Criteria 체크리스트

- [ ] D-30 이하: amber 배너 + amber 카드 테두리 + "갱신 / 변경" 버튼
- [ ] D-7 이하: red 배너 + red 카드 테두리 + "갱신 / 변경" 버튼
- [ ] 배너 클릭 → `showPlanPicker = true` (플랜 선택 패널 오픈)
- [ ] Business → Business (동일 사이클): "Business 플랜 갱신하기"
- [ ] Business → Business (월간→연간): "Business 플랜 연간으로 전환하기"
- [ ] Basic → Plus: "Plus 플랜으로 변경하기"
- [ ] 갱신 완료 토스트: "Business 플랜이 갱신되었습니다."
- [ ] 업그레이드/다운그레이드 기존 흐름 회귀 없음
- [ ] Free 플랜 / Ultimate 플랜 / 체험 중 → 배너 미표시

---

## 구현 순서

1. `UserPlanPickerPanel.tsx` — `isCycleSwitch` 변수 추가 + 버튼 텍스트 + 카드 urgencyStyle
2. `UserProfile.tsx` — 만료 임박 배너 추가 + "갱신 / 변경" 버튼
3. `hooks/useAppLogic.tsx` — `isRenewal` 플래그 추가
4. `App.tsx` — 갱신 완료 토스트 추가
