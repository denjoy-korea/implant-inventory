# Plan: 모바일 환경 최적화 (mobile-optimization)

**Date**: 2026-02-21
**Level**: Dynamic
**Priority**: High

---

## 1. 배경 및 목적

현재 앱은 데스크톱 중심으로 개발되어 모바일 환경에서 심각한 레이아웃 문제가 존재합니다.
치과 스태프가 수술실/진료실에서 스마트폰으로 재고 확인 및 실사를 수행하는 시나리오를 지원해야 합니다.

**모바일 준비도 현황: 약 35%** (운영 불가 수준)

---

## 2. 핵심 문제 요약

| 심각도 | 문제 | 영향 컴포넌트 |
|--------|------|--------------|
| 🔴 Critical | KPI 카드 `grid-cols-4` 고정 — 모바일에서 4열 유지 | InventoryAudit |
| 🔴 Critical | 실사 결과 모달 `grid-cols-3` 고정 | InventoryAudit |
| 🔴 Critical | ExcelTable 셀 고정 minWidth(280px) — 폰 전체 너비 초과 | ExcelTable |
| 🔴 Critical | `md:sticky` 전체 6곳 — 모바일 sticky 미작동 | SurgeryDashboard, InventoryManager(2), FailManager |
| 🟠 High | 고정 컬럼 너비 `w-[280px]`, `w-[176px]`, `min-w-[760px]` | InventoryManager |
| 🟠 High | FailManager 차트 SVG `minWidth: 400` — 강제 가로 스크롤 | FailManager |
| 🟠 High | SVG 차트 `onMouseEnter/Leave` — 모바일 터치 무반응 | FailManager |
| 🟠 High | Sidebar 닫기 버튼 `h-7 w-7` = 28px — 터치 44px 미달 | Sidebar |
| 🟡 Medium | 모달 `overscroll-behavior: contain` 미설정 — 배경 전파 | 전체 모달 |
| 🟡 Medium | `<input type="number">` `inputMode="numeric"` 누락 | InventoryAudit, InventoryManager |
| 🟡 Medium | `touch-action: manipulation` 전역 미설정 — 300ms 딜레이 | index.css |
| 🟡 Medium | `-webkit-tap-highlight-color` 미설정 — 탭 하이라이트 | index.css |
| 🟡 Medium | safe-area-inset 미처리 | 모달, index.css |

---

## 3. 범위 (In-Scope)

### P0 — 즉시 수정 (레이아웃 붕괴)
- [x] InventoryAudit KPI 카드: `grid-cols-4` → `grid-cols-2 lg:grid-cols-4`
- [x] InventoryAudit 실사 결과 모달: 패딩 반응형, gap 반응형
- [x] InventoryAudit 테이블 maxHeight 반응형
- [x] 실사 이력 모달: 헤더 `md:sticky` → `sticky`, 컬럼 너비 모바일 축소
- [x] `md:sticky` 전체 수정: SurgeryDashboard(테이블헤더), InventoryManager(2), FailManager(1)
- [x] InventoryManager `min-w-[760px]` 제거

### P1 — 높은 우선순위 (사용성)
- [x] SurgeryDashboard 필터 헤더: `md:sticky` → `sticky`
- [x] InventoryManager 고정 컬럼 너비 반응형 처리 (`w-[280px]`→`w-[160px] sm:w-[280px]`, `w-[176px]`→`w-[120px] sm:w-[176px]`)
- [x] FailManager 차트 `overflow-x-auto` 래퍼 + 터치 이벤트 추가 (`onTouchStart`)
- [x] Sidebar 닫기 버튼 44px 터치 타깃 확보 (`h-7 w-7` → `h-11 w-11`)
- [x] index.css: `touch-action`, `tap-highlight` 전역 설정

### P2 — 중간 우선순위 (폴리시)
- [x] `<input type="number">` `inputMode="numeric"` 추가 (InventoryAudit 2곳)
- [x] 모달 `overscroll-behavior: contain` 설정 (`.modal-scroll` 클래스)
- [x] index.css: `.modal-safe`, `.modal-scroll`, `.hide-scrollbar` 유틸리티 클래스 추가
- [x] 브랜드 탭 영역 모바일 스크롤 처리 (이미 overflow-x-auto 적용됨)

### Out-of-Scope
- 별도 모바일 앱(React Native) 개발
- ExcelTable 셀 편집 UI 모바일 완전 재설계 (ExcelTable은 데스크톱 전용으로 유지)
- 오프라인 지원

---

## 4. 목표 기준 (성공 조건)

| 화면 크기 | 대상 기기 | 목표 |
|-----------|-----------|------|
| 375px | iPhone SE / 13 mini | 핵심 기능(재고 조회·실사) 사용 가능 |
| 390px | iPhone 14 | 모든 메뉴 탐색 가능 |
| 768px | iPad mini | 데스크톱에 준하는 경험 |

**핵심 기능 모바일 완성도 목표: 80%+**

---

## 5. 구현 순서

```
Phase 1 (P0): InventoryAudit 모바일 대응
  → KPI 카드 반응형, 테이블 영역 조정, 실사 모달 반응형

Phase 2 (P1): 주요 컴포넌트 반응형
  → SurgeryDashboard 헤더 sticky, InventoryManager 컬럼, FailManager 차트

Phase 3 (P2): 전반 폴리시
  → 터치 타깃, safe-area, CSS 기본 설정
```

---

## 6. 파일 목록

- `components/InventoryAudit.tsx`
- `components/SurgeryDashboard.tsx`
- `components/InventoryManager.tsx`
- `components/FailManager.tsx`
- `components/Sidebar.tsx`
- `index.css`

---

## 7. 리스크

- InventoryAudit 테이블은 열이 많아 모바일에서 가로 스크롤 불가피 → 수평 스크롤 허용 + 고정 헤더로 보완
- ExcelTable은 복잡도가 높아 이번 범위에서 제외, 데스크톱 전용 안내 추가 검토
