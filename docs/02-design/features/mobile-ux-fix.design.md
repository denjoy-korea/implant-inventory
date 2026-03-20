# mobile-ux-fix Design Document

> **Summary**: 모바일 UI/UX P0/P1 이슈 수정 — 닫기 버튼 44px, iOS safe-area, 핵심 모달 폰트, bottom-sheet 3개, 차트 스크롤 힌트
>
> **Project**: DenJOY / DentWeb (implant-inventory)
> **Version**: 0.1
> **Author**: AI Analysis
> **Date**: 2026-03-21
> **Status**: Draft
> **Planning Doc**: [mobile-ux-fix.plan.md](../01-plan/features/mobile-ux-fix.plan.md)

---

## 범위 조정 (Plan → Design 단계)

Plan 단계에서 FR-03 (text-[10px] 전수 치환)은 818개 발생, 134개 파일에 걸쳐 있어
**전수 치환은 Out of Scope**로 조정. 대신 주요 모달(핵심 사용자 화면) 10개만 대상으로 한다.

---

## 1. FR-01: 모달 닫기 버튼 터치 타겟 (44px)

### 현재 문제

ModalShell에는 닫기 버튼이 없음 → 각 모달이 자체적으로 구현.
현재 패턴: `<button className="p-2 ...">` → 실제 터치 영역 ~32px

### 수정 대상 파일 & 방법

| 파일 | 현재 버튼 클래스 | 수정 클래스 |
|------|----------------|-----------|
| `components/inventory/UnregisteredDetailModal.tsx` | `p-2 rounded-lg` | `p-3 rounded-lg` |
| `components/inventory/ManualFixModal.tsx` | `p-2 rounded-lg` | `p-3 rounded-lg` |
| `components/fail/FailReturnModal.tsx` | `w-8 h-8` | `w-11 h-11` |
| `components/audit/AuditHistoryModal.tsx` | `p-2 border-2` | `p-3 border-2` |
| `components/inventory/OptimizeModal.tsx` | `p-2` | `p-3` |
| `components/audit/AuditSummaryModal.tsx` | `p-2` | `p-3` |

**공통 원칙**: 모든 닫기(X) 버튼에 `min-w-[44px] min-h-[44px]` 또는 `p-3`(48px 패딩 포함) 적용.

---

## 2. FR-02: iOS safe-area-inset 대응

### 현재 문제

```tsx
// ModalShell.tsx - 백드롭 (현재)
className={`fixed inset-0 bg-black/60 ${backdropClassName}`}

// bottom-sheet 모달들 - 하단 버튼 (현재)
pb-[68px]  // 고정값 — iPhone 홈 인디케이터 침범 가능
```

### 수정 방법

**ModalShell.tsx**: safe-area prop 추가 없이, CSS 변수로 처리.

```tsx
// ModalShell 패널 div에 style 추가
style={{
  zIndex,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
}}
```

**단, bottom-sheet 전용 처리**: `backdropClassName`에 `pb-safe` 또는 인라인 스타일로 처리.

실제 수정 방법: ModalShell의 `panelRef` div에 `style` prop 추가

```tsx
<div
  ref={panelRef}
  {...ariaProps}
  className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${maxWidth} ${className}`}
  style={{ '--safe-bottom': 'env(safe-area-inset-bottom, 0px)' } as React.CSSProperties}
  onClick={(e) => e.stopPropagation()}
  onKeyDown={handleKeyDown}
>
```

**더 단순한 접근**: 각 bottom-sheet 모달의 하단 버튼 컨테이너에만 적용

```tsx
// BaseStockModal 패턴 참조
<div
  className="px-4 pb-6 pt-3 shrink-0"
  style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}
>
```

**수정 대상**: bottom-sheet 적용 모달들의 하단 버튼 영역

| 파일 | 하단 영역 | 수정 방법 |
|------|---------|---------|
| `components/inventory/BaseStockModal.tsx` | `pb-6 sm:pb-4` | + `style` safe-area |
| `components/order/BrandOrderModal.tsx` | `pb-8` | + `style` safe-area |
| `components/audit/AuditHistoryModal.tsx` | `pb-4` | + `style` safe-area |
| `components/inventory/UnregisteredDetailModal.tsx` | (FR-05 이후 적용) | FR-05와 병행 |

---

## 3. FR-03: 핵심 모달 폰트 크기 개선 (범위 축소)

### 수정 범위

**전수 치환 아님** — 사용자가 직접 인터랙션하는 핵심 화면 4개만 대상:

1. `components/inventory/BaseStockModal.tsx` (19개)
2. `components/inventory/UnregisteredDetailModal.tsx` (1개)
3. `components/audit/AuditHistoryModal.tsx` (5개)
4. `components/fail/FailReturnModal.tsx` (10개)

### 치환 기준

| 기존 | 수정 | 적용 맥락 |
|------|------|---------|
| `text-[10px]` | `text-[11px]` | 진행률 배지, 라벨 — 12px는 레이아웃 영향 가능성 |
| `text-[10px] font-bold` (헤더 셀) | `text-xs font-bold` | 테이블 헤더 — 충분한 공간 |

**주의**: `text-[11px]`는 현재 상태 유지 (12px로 올리면 필터 버튼 등 레이아웃 깨짐 가능)

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

## 5. FR-05: 3개 모달 → bottom-sheet 전환

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

#### 5-C. `FailReturnModal.tsx`

파일 내 ModalShell 또는 자체 fixed div 확인 후 동일 패턴 적용.

---

## 6. 구현 순서

```
1. FR-01: 닫기 버튼 6개 파일 — p-2 → p-3 (빠른 작업, 30분)
2. FR-02: BaseStockModal + BrandOrderModal 하단 safe-area (2개 파일, 15분)
3. FR-03: BaseStockModal text-[10px] → text-[11px] (19개, 15분)
4. FR-05: UnregisteredDetailModal → bottom-sheet (30분)
           ManualFixModal → bottom-sheet (20분)
           FailReturnModal → bottom-sheet (20분)
5. FR-04: MonthlyTrendChart + PlacementTrendChart fade mask (30분)
6. FR-02 확장: FR-05 완료 모달에 safe-area 추가 (10분)
```

---

## 7. 파일별 수정 목록

| 파일 | FR | 수정 내용 |
|------|-----|---------|
| `components/shared/ModalShell.tsx` | FR-02 | safe-area CSS 변수 (선택적) |
| `components/inventory/BaseStockModal.tsx` | FR-02, FR-03 | 하단 safe-area + text-[10px]→[11px] |
| `components/inventory/UnregisteredDetailModal.tsx` | FR-01, FR-03, FR-05 | 닫기버튼 + font + bottom-sheet |
| `components/inventory/ManualFixModal.tsx` | FR-01, FR-05 | 닫기버튼 + bottom-sheet |
| `components/inventory/OptimizeModal.tsx` | FR-01 | 닫기버튼 |
| `components/fail/FailReturnModal.tsx` | FR-01, FR-03, FR-05 | 닫기버튼 + font + bottom-sheet |
| `components/audit/AuditHistoryModal.tsx` | FR-01, FR-02, FR-03 | 닫기버튼 + safe-area + font |
| `components/audit/AuditSummaryModal.tsx` | FR-01 | 닫기버튼 |
| `components/order/BrandOrderModal.tsx` | FR-02 | 하단 safe-area |
| `components/surgery-dashboard/MonthlyTrendChart.tsx` | FR-04 | fade mask |
| `components/surgery-dashboard/PlacementTrendChart.tsx` | FR-04 | fade mask |

---

## 8. 검증 기준

| 항목 | 검증 방법 | 기준 |
|------|---------|------|
| 닫기 버튼 크기 | 개발자 도구 Element > Computed | ≥ 44×44px |
| safe-area | iPhone 시뮬레이터 또는 기기 확인 | 홈 인디케이터 겹침 없음 |
| 폰트 크기 | `grep "text-\[10px\]" components/inventory/BaseStockModal.tsx` | 0건 |
| bottom-sheet | 모바일 뷰(375px)에서 하단 등장 | 화면 하단에서 올라옴 |
| 차트 힌트 | 375px 뷰에서 우측 fade | 우측 가장자리 fade 표시 |
| TypeScript | `npm run tsc --noEmit` | 0 errors |
| 빌드 | `npm run build` | success |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | 분석 기반 초안 — 범위 축소 (text-[10px] 전수→핵심 4파일) | AI |
