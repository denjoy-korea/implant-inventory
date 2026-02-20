# Design: 모바일 환경 최적화 (mobile-optimization)

**Date**: 2026-02-21
**Level**: Dynamic
**Phase**: Design
**Ref Plan**: `docs/01-plan/features/mobile-optimization.plan.md`

---

## 1. 구현 개요

Plan에서 정의한 P0→P1→P2 순서대로 진행한다.
모든 변경은 Tailwind CSS 반응형 클래스(`sm:`, `md:`, `lg:`)를 활용하며,
기존 데스크톱 레이아웃을 유지하면서 모바일 레이아웃을 추가하는 방식으로 작업한다.

---

## 2. 브레이크포인트 기준

| Tailwind | min-width | 대상 기기 |
|----------|-----------|-----------|
| (없음)   | 0px       | 모바일 기본 |
| `sm:`    | 640px     | 대형 폰, 소형 태블릿 |
| `md:`    | 768px     | iPad mini |
| `lg:`    | 1024px    | 데스크톱 |

---

## 3. Phase 1 (P0) — InventoryAudit 레이아웃 붕괴 수정

### 3-1. KPI 카드 `grid-cols-4` 반응형

**파일**: `components/InventoryAudit.tsx`
**위치**: line 278

```
Before:
  className="grid grid-cols-4 divide-x divide-slate-100/50"

After:
  className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100/50"
```

- 모바일: 2열 (총 실사 + 일치 / 불일치 + 진행률)
- 데스크톱(lg+): 4열 유지
- `divide-x`는 유지 (수직 구분선은 열 수와 관계없이 작동)

### 3-2. 실사 결과 요약 모달 `grid-cols-3` 반응형

**파일**: `components/InventoryAudit.tsx`
**위치**: line 817

```
Before:
  className="grid grid-cols-3 gap-3"

After:
  className="grid grid-cols-3 gap-2 sm:gap-3"
```

- 3열은 유지 (카드 3개: 전체/일치/불일치 — 모바일에서도 나란히 보이는 게 적절)
- gap만 모바일에서 좁게 조정 (`gap-2` → `sm:gap-3`)
- 카드 내부 폰트 크기는 그대로 유지 (이미 작은 숫자)

### 3-3. 실사 테이블 컨테이너 maxHeight 반응형

**파일**: `components/InventoryAudit.tsx`
**위치**: `hide-scrollbar` 스크롤 컨테이너 (`style={{ maxHeight: 'calc(100vh - 340px)' }}`)

```
Before (inline style):
  style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}

After (Tailwind max-h + inline fallback 제거):
  className="hide-scrollbar overflow-y-auto max-h-[calc(100vh-260px)] sm:max-h-[calc(100vh-300px)] lg:max-h-[calc(100vh-340px)]"
  (style 제거)
```

- 모바일: 상단 UI(KPI 카드 2열 축소 + 브랜드 탭)가 차지하는 높이가 줄어드므로 더 많은 공간 활용
- lg 이상: 기존 340px 마진 유지

### 3-4. 이력 모달 헤더 그리드 sticky + 모바일 대응

**파일**: `components/InventoryAudit.tsx`
**위치**: line 687 (컬럼 헤더), line 708 (요약 행)

현재 `grid-cols-[1fr_64px_64px_64px_100px_64px]` 는 모바일(375px)에서 전체 폭 초과.

```
Before (line 687):
  className="grid grid-cols-[1fr_64px_64px_64px_100px_64px] gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200 md:sticky md:top-0"

After:
  className="grid grid-cols-[1fr_56px_56px_56px_88px_56px] gap-1 px-3 py-3 bg-slate-50 border-b border-slate-200 sticky top-0 sm:grid-cols-[1fr_64px_64px_64px_100px_64px] sm:gap-2 sm:px-5"
```

```
Before (line 708, 요약 행):
  className="grid grid-cols-[1fr_64px_64px_64px_100px_64px] gap-2 px-5 py-3.5 items-center hover:bg-slate-50/60 transition-colors"

After:
  className="grid grid-cols-[1fr_56px_56px_56px_88px_56px] gap-1 px-3 py-3.5 items-center hover:bg-slate-50/60 transition-colors sm:grid-cols-[1fr_64px_64px_64px_100px_64px] sm:gap-2 sm:px-5"
```

- `md:sticky` → `sticky` (모바일에서도 헤더 고정)
- 컬럼 너비를 모바일에서 약 12% 축소 (56/88px), sm+ 에서 원래 크기 복원

---

## 4. Phase 2 (P1) — 주요 컴포넌트 반응형

### 4-1. SurgeryDashboard 필터 헤더 sticky 강화

**파일**: `components/SurgeryDashboard.tsx`
**위치**: line 321

```
Before:
  className="md:sticky z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50"

After:
  className="sticky z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50"
```

- `md:sticky` → `sticky` (모바일에서도 날짜 범위 슬라이더 고정)

**파일**: `components/SurgeryDashboard.tsx`
**위치**: line 863 (테이블 헤더)

```
Before:
  className="bg-slate-50 md:sticky md:top-0 z-10"

After:
  className="bg-slate-50 sticky top-0 z-10"
```

### 4-2. InventoryManager 고정 컬럼 너비 반응형

**파일**: `components/InventoryManager.tsx`
**위치**: line 814~815 (브랜드별 재고 뷰 헤더)

```
Before (line 814):
  className="flex-1 max-w-[280px]"
Before (line 815):
  className="w-[280px] shrink-0 grid grid-cols-4 gap-0"

After (line 814):
  className="flex-1 max-w-[160px] sm:max-w-[280px]"
After (line 815):
  className="w-[160px] sm:w-[280px] shrink-0 grid grid-cols-4 gap-0"
```

**위치**: line 850, 857 (동일 패턴의 데이터 행)

```
Before (line 850):
  className="flex-1 max-w-[280px] h-1.5 bg-slate-50 rounded-full overflow-hidden"
Before (line 857):
  className="w-[280px] shrink-0 grid grid-cols-4 gap-0 items-center"

After (line 850):
  className="flex-1 max-w-[160px] sm:max-w-[280px] h-1.5 bg-slate-50 rounded-full overflow-hidden"
After (line 857):
  className="w-[160px] sm:w-[280px] shrink-0 grid grid-cols-4 gap-0 items-center"
```

**위치**: line 829 (테이블 컨테이너)

```
Before:
  className="space-y-2 min-w-[760px] lg:min-w-0"

After:
  className="space-y-2 min-w-0"
```

- `min-w-[760px]`은 모바일 가로 스크롤 강제 유발 — 제거
- lg에서도 `min-w-0`이 맞음 (flex 컨테이너 내부이므로)

### 4-3. FailManager 차트 가로 스크롤 허용

**파일**: `components/FailManager.tsx`
**위치**: line 640 (`style={{ minWidth: Math.max(400, SVG_W) }}`)

차트 SVG를 감싸는 div에 가로 스크롤 래퍼 추가:

```
Before (차트 직접 렌더링):
  <div style={{ minWidth: Math.max(400, SVG_W) }}>
    <svg ...>

After (스크롤 래퍼 추가):
  <div className="overflow-x-auto">
    <div style={{ minWidth: Math.max(400, SVG_W) }}>
      <svg ...>
    </div>
  </div>
```

- 차트 자체 최소 너비: `Math.max(320, SVG_W)` — 모바일 기준 너비(400→320) 조정
- 모바일에서는 좌우 스크롤로 차트 탐색

---

## 5. Phase 3 (P2) — 폴리시

### 5-1. index.css 모바일 기본 설정

**파일**: `index.css`

추가할 CSS:

```css
/* Mobile touch optimization */
html {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* iOS safe-area support */
.modal-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

- `tap-highlight-color: transparent`: 모바일 탭 시 파란 하이라이트 제거
- `touch-action: manipulation`: 300ms 탭 딜레이 제거
- `.modal-safe`: 홈 인디케이터 영역 침범 방지용 유틸리티 클래스

### 5-2. 모달 safe-area 적용 (선택적)

InventoryAudit 이력 모달 하단에 `.modal-safe` 클래스 추가:

**파일**: `components/InventoryAudit.tsx`
이력 모달 하단 버튼 영역(`닫기` 버튼 div):

```
Before:
  className="px-6 pb-6 border-t border-slate-100 pt-4"

After:
  className="px-6 pb-6 border-t border-slate-100 pt-4 modal-safe"
```

### 5-3. 터치 타깃 최소 44px — 이미 충족 여부 확인

현재 주요 버튼들:
- 실사 `O/X` 버튼: `px-5 py-3` (충분)
- 이력 토글 버튼: `p-1.5` → 실제 렌더 크기 약 34px → **개선 필요**

```
Before (토글 버튼):
  className="p-1.5 rounded-lg ..."

After:
  className="p-2.5 rounded-lg ..."
```

- 브랜드 탭 버튼: 현재 `px-4 py-2` → 약 36px → 충분

---

## 6. 구현 체크리스트

### Phase 1 (P0)
- [ ] InventoryAudit KPI: `grid-cols-4` → `grid-cols-2 lg:grid-cols-4`
- [ ] 이력 모달 헤더: `md:sticky` → `sticky`, 컬럼 너비 모바일 축소
- [ ] 테이블 컨테이너: inline style → Tailwind `max-h` 반응형 클래스

### Phase 2 (P1)
- [ ] SurgeryDashboard 필터 헤더: `md:sticky` → `sticky`
- [ ] SurgeryDashboard 테이블 헤더: `md:sticky` → `sticky`
- [ ] InventoryManager: `w-[280px]` → `w-[160px] sm:w-[280px]`
- [ ] InventoryManager: `min-w-[760px]` 제거
- [ ] FailManager: 차트 `overflow-x-auto` 래퍼 추가

### Phase 3 (P2)
- [ ] index.css: `touch-action`, `tap-highlight-color`, `.modal-safe`
- [ ] 이력 모달 닫기 영역: `.modal-safe` 추가
- [ ] 토글 버튼 `p-1.5` → `p-2.5` (터치 타깃 확보)

---

## 7. Out-of-Scope (이번 작업 제외)

- ExcelTable 셀 편집 UX 모바일 재설계 (데스크톱 전용 유지)
- 별도 모바일 앱 개발
- 오프라인 지원

---

## 8. 리스크 및 검토사항

| 항목 | 리스크 | 완화 방법 |
|------|--------|-----------|
| InventoryAudit 이력 테이블 | 6열이 375px에서 좁음 | 컬럼 너비 축소 + 텍스트 truncate |
| InventoryManager 280→160px | 재고 수량 바(bar) 가시성 저하 | sm+ 에서 원복, 모바일은 텍스트 수치로 인지 |
| SurgeryDashboard sticky 변경 | 모바일 스크롤 중 헤더 가림 | z-index 확인, 배경색 불투명 유지 |
