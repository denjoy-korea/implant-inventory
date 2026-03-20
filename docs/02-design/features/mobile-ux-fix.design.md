# mobile-ux-fix Design Document

> **Summary**: 모바일 UI/UX P0/P1 이슈 수정 — 닫기 버튼 44px, iOS safe-area, 핵심 모달 폰트, text-[9px] 제거, bottom-sheet 전환+drag indicator, pb-[68px] 통일, 차트 스크롤 힌트
>
> **Project**: DenJOY / DentWeb (implant-inventory)
> **Version**: 0.2
> **Author**: AI Analysis
> **Date**: 2026-03-21
> **Status**: Draft (2차 분석 반영)
> **Planning Doc**: [mobile-ux-fix.plan.md](../01-plan/features/mobile-ux-fix.plan.md)

---

## 범위 조정 (2차 분석 후 업데이트)

- `text-[10px]` 전수 치환(818개·134파일) → Out of Scope 유지, 핵심 4파일만
- FR-01 닫기 버튼 범위: 6개 → 20개+ 파일 (Order 탭 포함)
- FR-05 bottom-sheet 대상: +AuditHistoryModal 추가 (FailReturnModal은 이미 maxWidth 반응형 있음, bottom-sheet 전환 효과 낮아 제외)
- FR-08 신규: text-[9px] (FailReturnModal line 79) — 즉시 제거
- FR-09 신규: 기존 bottom-sheet Order 모달 drag indicator 추가
- FR-10 신규: ReturnResultModal, ReturnCompleteModal `pb-[68px]` 누락 보완

---

## 0. FR-08: text-[9px] 즉시 제거 (신규)

### 대상

`components/fail/FailReturnModal.tsx` line 79:
```tsx
// 현재
className="text-[9px] font-bold text-amber-500"

// 수정
className="text-[10px] font-bold text-amber-500"
```

---

## 1. FR-01: 모달 닫기 버튼 터치 타겟 (44px) — 범위 확대

### 현재 문제

2차 분석으로 범위가 6개 → 20개+ 파일로 확대됨.
- Order 모달 대부분: `p-1.5 w-5 h-5` (~20px) — 가장 작음
- 일부 모달: `p-2` (~32px)
- 일부 모달: `p-1.5 rounded-full` (AuditSessionDetailModal, OptimizeModal)

### 수정 원칙

| 현재 패턴 | 수정 패턴 | 비고 |
|---------|---------|------|
| `p-1.5` | `p-3` | Order 모달 전체 |
| `p-2` | `p-3` | 인벤토리/감사 모달 |
| `w-8 h-8` (32px) | `w-11 h-11` (44px) | FailReturnModal |
| `w-7 h-7` (28px) | `w-11 h-11` | FailBulkSetupModal |

### 수정 대상 파일 전체 목록

**Order 탭 (p-1.5 → p-3):**
- `components/order/BrandOrderModal.tsx`
- `components/order/OrderReturnDetailModal.tsx`
- `components/order/ReturnCandidateModal.tsx`
- `components/order/ReturnResultModal.tsx`
- `components/order/ReturnCompleteModal.tsx`

**인벤토리/감사 (p-2 → p-3):**
- `components/inventory/UnregisteredDetailModal.tsx`
- `components/inventory/ManualFixModal.tsx` (rounded-full 유지)
- `components/inventory/OptimizeModal.tsx` (p-1.5 → p-3)
- `components/audit/AuditHistoryModal.tsx` (border-2 유지)
- `components/audit/AuditSummaryModal.tsx`
- `components/dashboard/AuditSessionDetailModal.tsx` (p-1.5 → p-3)

**FAIL:**
- `components/fail/FailReturnModal.tsx` (w-8 h-8 → w-11 h-11)
- `components/fail/FailBulkSetupModal.tsx` (w-7 h-7 → w-11 h-11)

**공통 원칙**: 모든 닫기(X) 버튼에 최소 `p-3` 또는 `w-11 h-11` 적용.

---

## 2. FR-02: iOS safe-area-inset 대응

### 현재 문제

```tsx
// bottom-sheet 모달들 - 하단 버튼 (현재)
pb-[68px]  // 고정값 — iPhone 홈 인디케이터 침범 가능 (iPhoneX 이후)
```

### 수정 방법

**ModalShell.tsx 수정 없음** — 각 bottom-sheet 모달의 하단 버튼 컨테이너에만 적용:

```tsx
// 패턴: pb-[68px] → pb-safe 인라인 스타일
<div
  className="px-4 pt-3 sm:px-6 sm:pb-4 shrink-0"
  style={{ paddingBottom: 'max(68px, env(safe-area-inset-bottom, 0px))' }}
>
```

**단, `sm:pb-0`이 있는 경우**: sm 이상에서는 기존 패딩 유지가 필요하므로 CSS 변수 방식 사용

```tsx
// backdropClassName에 pb-[68px] sm:pb-0 이 있는 모달의 하단 버튼 영역
style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}
```

### 수정 대상 (기존 bottom-sheet 모달들)

| 파일 | 현재 하단 패딩 | 수정 방법 |
|------|-------------|---------|
| `components/inventory/BaseStockModal.tsx` | `pb-6 sm:pb-4` | + style safe-area |
| `components/order/BrandOrderModal.tsx` | 하단 버튼 `pb-4` | + style safe-area |
| `components/order/ReturnRequestModal.tsx` | 하단 버튼 영역 | + style safe-area |
| `components/order/ReturnCandidateModal.tsx` | 하단 버튼 영역 | + style safe-area |
| `components/ReceiptConfirmationModal.tsx` | `pb-[68px]` 있음 | + style safe-area |

---

## 3. FR-03: 핵심 모달 폰트 크기 개선 (범위 축소 유지)

### 수정 범위

**전수 치환 아님** — 사용자가 직접 인터랙션하는 핵심 화면 4개만 대상:

1. `components/inventory/BaseStockModal.tsx` (19개 중 선별)
2. `components/audit/AuditHistoryModal.tsx` (5개 — line 119 모바일 테이블 헤더)
3. `components/audit/AuditSummaryModal.tsx` (line 63 카드 설명)
4. `components/fail/FailReturnModal.tsx` (FR-08 이후 남은 text-[10px])

**UnregisteredDetailModal**: text-[10px] 1개뿐 (line 651) — 분석 부제, 레이아웃 영향 낮음 → 선택적

### 치환 기준

| 기존 | 수정 | 적용 맥락 |
|------|------|---------|
| `text-[10px]` | `text-[11px]` | 진행률 배지, 카드 라벨 |
| `text-[10px] font-bold uppercase` (테이블 헤더) | `text-xs font-bold uppercase` | 충분한 공간 있을 때만 |

**주의**: `text-[11px]`는 현재 상태 유지 (12px 전환 시 필터 버튼·배지 레이아웃 깨짐 위험)

---

## 4. FR-04: 차트 수평 스크롤 힌트

### 대상 파일

- `components/surgery-dashboard/MonthlyTrendChart.tsx`
- `components/surgery-dashboard/PlacementTrendChart.tsx`

### 구현 방법

스크롤 컨테이너에 우측 fade mask 추가:

```tsx
// 기존: <div ref={scrollRef} className="overflow-x-auto">
// 수정: 래퍼 div 추가

<div className="relative">
  {/* 우측 fade 그라디언트 — 모바일만 */}
  <div className="sm:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10" />
  <div ref={scrollRef} className="overflow-x-auto">
    {/* 기존 차트 내용 */}
  </div>
</div>
```

**스크롤 후 fade 제거**: `onScroll` 이벤트로 `scrollLeft + clientWidth >= scrollWidth - 10` 시 fade 숨김 (선택적 개선).

---

## 4-B. FR-09: 기존 bottom-sheet Order 모달에 drag indicator 추가 (신규)

### 현재 상태

BrandOrderModal, OrderReturnDetailModal 등 Order 모달은 이미 bottom-sheet 레이아웃이나 **drag indicator 없음**.
ReturnRequestModal만 `w-10 h-1 bg-slate-300` drag handle 구현됨.

### 수정 방법 (모든 대상 동일 패턴)

```tsx
// ModalShell 바로 안, 헤더 위에 추가
<div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
  <div className="w-10 h-1 bg-slate-200 rounded-full" />
</div>
```

### 수정 대상

- `components/order/BrandOrderModal.tsx`
- `components/order/OrderReturnDetailModal.tsx`
- `components/order/ReturnCandidateModal.tsx`
- `components/order/ReturnResultModal.tsx`
- `components/order/ReturnCompleteModal.tsx`

---

## 4-C. FR-10: pb-[68px] 누락 bottom-sheet 보완 (신규)

### 현재 문제

ReturnResultModal, ReturnCompleteModal: `items-end`로 하단 시트이지만 `pb-[68px]` 누락

```tsx
// 현재 backdropClassName (ReturnResultModal, ReturnCompleteModal)
"flex items-end sm:items-center justify-center sm:p-4"
// pb-[68px] sm:pb-0 없음 → 화면 최하단에 붙어서 탭바와 겹침

// 수정
"flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0"
```

---

## 5. FR-05: 3개 모달 → bottom-sheet 전환 (대상 변경)

**변경 사항**: FailReturnModal 제외 (이미 반응형 maxWidth 있음, center-modal로 적합) → AuditHistoryModal 추가

### BaseStockModal 패턴 참조 (현행 최우수 사례)

```tsx
<ModalShell
  backdropClassName="flex items-end sm:items-center justify-center sm:p-4"
  className="rounded-t-3xl sm:rounded-2xl flex flex-col h-[100dvh] sm:h-auto sm:max-h-[84vh]"
  maxWidth="w-full max-w-..."
>
  {/* Drag indicator — 모바일만 */}
  <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
    <div className="w-10 h-1 bg-slate-200 rounded-full" />
  </div>
  ...
</ModalShell>
```

### 수정 대상별 상세

#### 5-A. `UnregisteredDetailModal.tsx`

```tsx
// 현재
<ModalShell
  zIndex={200}
  maxWidth="max-w-4xl"
  className="max-h-[82vh] flex flex-col"
>

// 수정
<ModalShell
  zIndex={200}
  maxWidth="w-full max-w-4xl"
  backdropClassName="flex items-end sm:items-center justify-center sm:p-4"
  className="rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[92dvh] sm:max-h-[82vh]"
>
  {/* drag indicator */}
  <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
    <div className="w-10 h-1 bg-slate-200 rounded-full" />
  </div>
```

#### 5-B. `ManualFixModal.tsx`

```tsx
// 현재
<ModalShell
  zIndex={230}
  maxWidth="max-w-3xl"
  className="rounded-2xl overflow-hidden max-h-[86vh] flex flex-col"
>

// 수정
<ModalShell
  zIndex={230}
  maxWidth="w-full max-w-3xl"
  backdropClassName="flex items-end sm:items-center justify-center sm:p-4"
  className="rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92dvh] sm:max-h-[86vh] flex flex-col"
>
  {/* drag indicator */}
  <div className="sm:hidden flex justify-center pt-3 shrink-0">
    <div className="w-10 h-1 bg-slate-200 rounded-full" />
  </div>
```

#### 5-C. `AuditHistoryModal.tsx` (신규 추가, FailReturnModal 대체)

AuditHistoryModal은 `backdropClassName` 없음 → 기본 center-modal이나 모바일 카드/데스크톱 테이블 레이아웃이 이미 구현됨.
bottom-sheet 전환 시 모바일 UX 향상 효과 있음.

```tsx
// 현재 (backdropClassName 없음, 기본값 사용)
<ModalShell maxWidth="max-w-3xl" className="max-h-[88vh] flex flex-col">

// 수정
<ModalShell
  maxWidth="w-full max-w-3xl"
  backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0"
  className="rounded-t-2xl sm:rounded-2xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col"
>
  {/* drag indicator */}
  <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
    <div className="w-10 h-1 bg-slate-200 rounded-full" />
  </div>
```

**FailReturnModal**: 이미 `maxWidth="max-w-lg sm:max-w-2xl"` 반응형 적용됨 → center-modal 유지가 더 적합. FR-05에서 제외.

---

## 6. 구현 순서

```
1. FR-08: FailReturnModal text-[9px] → text-[10px] (1줄, 즉시)
2. FR-01: 닫기 버튼 13개 파일 — p-1.5/p-2 → p-3, w-7/w-8 → w-11 (단순 반복)
3. FR-03: 핵심 4파일 text-[10px] → text-[11px]
4. FR-10: ReturnResultModal, ReturnCompleteModal backdropClassName에 pb-[68px] 추가
5. FR-09: Order bottom-sheet 5개에 drag indicator 추가
6. FR-02: 기존 bottom-sheet 하단 버튼에 safe-area style 추가
7. FR-05: UnregisteredDetailModal → bottom-sheet (30분)
           ManualFixModal → bottom-sheet (20분)
           AuditHistoryModal → bottom-sheet (20분)
8. FR-04: MonthlyTrendChart + PlacementTrendChart fade mask (30분)
9. FR-06·07: 문서화 / 버튼 표준화
```

---

## 7. 파일별 수정 목록 (전체)

| 파일 | FR | 수정 내용 |
|------|-----|---------|
| `components/fail/FailReturnModal.tsx` | FR-08, FR-01, FR-03 | text-[9px]제거 + 닫기버튼 w-11 + font |
| `components/fail/FailBulkSetupModal.tsx` | FR-01 | 닫기버튼 w-7→w-11 |
| `components/inventory/BaseStockModal.tsx` | FR-02, FR-03 | 하단 safe-area + text-[10px]→[11px] |
| `components/inventory/UnregisteredDetailModal.tsx` | FR-01, FR-05 | 닫기버튼 p-3 + bottom-sheet |
| `components/inventory/ManualFixModal.tsx` | FR-01, FR-05 | 닫기버튼 p-3 + bottom-sheet |
| `components/inventory/OptimizeModal.tsx` | FR-01 | 닫기버튼 p-1.5→p-3 |
| `components/audit/AuditHistoryModal.tsx` | FR-01, FR-03, FR-05 | 닫기버튼 + font + bottom-sheet |
| `components/audit/AuditSummaryModal.tsx` | FR-01, FR-03 | 닫기버튼 + font |
| `components/dashboard/AuditSessionDetailModal.tsx` | FR-01 | 닫기버튼 p-1.5→p-3 |
| `components/order/BrandOrderModal.tsx` | FR-01, FR-02, FR-09 | 닫기버튼 + safe-area + drag indicator |
| `components/order/OrderReturnDetailModal.tsx` | FR-01, FR-09 | 닫기버튼 + drag indicator |
| `components/order/ReturnCandidateModal.tsx` | FR-01, FR-09 | 닫기버튼 + drag indicator |
| `components/order/ReturnResultModal.tsx` | FR-01, FR-09, FR-10 | 닫기버튼 + drag indicator + pb-[68px] |
| `components/order/ReturnCompleteModal.tsx` | FR-01, FR-09, FR-10 | 닫기버튼 + drag indicator + pb-[68px] |
| `components/order/ReturnRequestModal.tsx` | FR-01, FR-02 | 닫기버튼 + safe-area |
| `components/surgery-dashboard/MonthlyTrendChart.tsx` | FR-04 | fade mask |
| `components/surgery-dashboard/PlacementTrendChart.tsx` | FR-04 | fade mask |

---

## 8. 검증 기준

| 항목 | 검증 방법 | 기준 |
|------|---------|------|
| text-[9px] 제거 | `grep -r "text-\[9px\]" components/` | 0건 |
| 닫기 버튼 크기 | 개발자 도구 Element > Computed | ≥ 44×44px |
| safe-area | iPhone 시뮬레이터 (Safari DevTools) | 홈 인디케이터 겹침 없음 |
| 핵심 파일 폰트 | `grep "text-\[10px\]" components/inventory/BaseStockModal.tsx` | 0건 |
| bottom-sheet | 모바일 뷰(375px)에서 하단 등장 | 화면 하단에서 올라옴 |
| drag indicator | 375px 뷰 → 각 bottom-sheet 상단 | 흰 둥근 바 표시 |
| pb-[68px] 통일 | 모든 bottom-sheet backdropClassName | `pb-[68px] sm:pb-0` 포함 |
| 차트 힌트 | 375px 뷰에서 우측 fade | 우측 가장자리 fade 표시 |
| TypeScript | `npm run tsc --noEmit` | 0 errors |
| 빌드 | `npm run build` | success |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | 분석 기반 초안 — 범위 축소 (text-[10px] 전수→핵심 4파일) | AI |
| 0.2 | 2026-03-21 | 주문 탭 2차 분석 반영: FR-08(text-9px), FR-09(drag indicator 6개), FR-10(pb-68px 2개), FR-01 범위 13개→17개, FR-05 AuditHistoryModal 추가/FailReturnModal 제외, FR-02 BrandOrderModal 추가 | AI |
