# Plan: 모바일 UX 고도화 (mobile-ux)

**Date**: 2026-03-01
**Level**: Dynamic
**Priority**: High
**Previous**: `mobile-optimization` (완료 — P0/P1/P2 기본 반응형 수정 완료)

---

## 1. 배경 및 목적

`mobile-optimization` 피처에서 레이아웃 붕괴 수준의 P0~P2 이슈를 모두 수정했습니다.
이번 `mobile-ux` 피처는 **기능적으로 작동하지만 모바일 UX가 여전히 불편한 영역**을 개선합니다.

치과 스태프가 수술실·진료실에서 스마트폰으로:
- 반품 요청 상태를 확인하고 처리
- 발주 목록을 빠르게 조회
- 재고 부족 품목을 카드로 파악

할 수 있는 수준을 목표로 합니다.

**현재 모바일 준비도**: 약 55% (기본 반응형 완료, UX 패턴 미완성)
**목표 모바일 준비도**: 80%+

---

## 2. 핵심 문제 요약

| 심각도 | 문제 | 영향 컴포넌트 |
|--------|------|--------------|
| 🔴 Critical | ReturnManager 모바일 레이아웃 전무 — 테이블 컬럼 오버플로우 | ReturnManager |
| 🔴 Critical | ReturnRequestModal 전체 높이 모달 — 모바일 폼 입력 불편 | ReturnRequestModal |
| 🟠 High | OrderManager 주문 카드 그룹 헤더 — 좁은 화면에서 텍스트 truncate | OrderManager |
| 🟠 High | FailManager 차트 TouchStart만 있고 TouchMove/TouchEnd 미구현 — 드래그 무반응 | FailManager |
| 🟠 High | 더보기 메뉴(Sidebar) — 슬라이드 제스처 없이 버튼만으로 닫기 | Sidebar, App.tsx |
| 🟡 Medium | 각 페이지 진입 시 스크롤 위치 미복원 — 탭 전환 후 맨 위로 점프 | DashboardOperationalTabs |
| 🟡 Medium | InventoryManager 모바일 주문필요 카드 — 퀵오더 버튼 너무 작음(h-8) | InventoryManager |
| 🟡 Medium | 모달 backdrop 탭으로 닫기 미지원 — ESC만 동작 | 전체 모달 |
| 🟢 Low | 필터 드롭다운 — 폰트 size 12px 미만으로 iOS 자동 확대 | 전체 select 요소 |

---

## 3. 범위 (In-Scope)

### P0 — ReturnManager 모바일 카드 레이아웃 (Critical)

ReturnManager는 반품 관리 핵심 기능인데 모바일 레이아웃이 전혀 없음.
데스크톱 테이블 → 모바일 카드 패턴으로 전환.

- [ ] ReturnManager: `md:hidden` 모바일 카드 섹션 추가
  - 제조사 · 사유 · 상태 배지 한 줄 요약
  - 품목 수 / 수량 표시
  - 단계별 액션 버튼 (44px 터치 타깃)
  - 카드 탭으로 품목 목록 expand/collapse
- [ ] ReturnRequestModal: 모바일에서 `fixed inset-0` → 바텀시트 스타일
  - `sm:max-w-md sm:mx-auto sm:my-8` (데스크톱: 센터 모달 유지)
  - 모바일(`< sm`): `inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh] overflow-y-auto`
  - 상단 핸들 표시자(drag handle) 추가

### P1 — 터치 인터랙션 개선 (High)

- [ ] FailManager: `onTouchStart/TouchMove/TouchEnd` 스와이프로 차트 날짜 범위 조정
  - `touchStartX` → `touchEndX` 델타로 날짜 범위 shift
- [ ] Sidebar 모바일 드로어: `touchstart/touchmove/touchend` 스와이프 제스처로 닫기
  - 오른쪽 → 왼쪽 스와이프 50px 이상 시 닫기
- [ ] 모달 backdrop 탭으로 닫기: `onClick` on overlay → `onClose()` 호출 (기존 `ConfirmModal`부터 적용)
- [ ] InventoryManager 모바일 퀵오더 버튼: `h-8` → `min-h-11` 터치 타깃 확보

### P2 — 폴리시 (Medium)

- [ ] `<select>` 요소 전체에 `text-base` (16px) 클래스 추가 → iOS 자동 확대 방지
  - 영향 파일: `ReturnManager`, `OrderManager`, `InventoryManager`, `SurgeryDashboard`
- [ ] 탭 전환 시 scroll 위치 복원: `sessionStorage`에 탭별 scrollY 저장
  - `DashboardOperationalTabs` onTabChange hook에 저장/복원 로직 추가

### Out-of-Scope
- 별도 React Native / PWA 앱 개발
- ExcelTable 모바일 완전 재설계 (데스크톱 전용 유지)
- 서버사이드 SSR 최적화

---

## 4. 목표 기준 (성공 조건)

| 시나리오 | 현재 | 목표 |
|----------|------|------|
| ReturnManager 모바일 카드 조회 | ❌ 불가 | ✅ 카드로 조회 가능 |
| ReturnRequestModal 폼 입력 (모바일) | 🟡 스크롤 어려움 | ✅ 바텀시트로 자연스럽게 |
| FailManager 터치 드래그 | ❌ 무반응 | ✅ 스와이프로 날짜 이동 |
| 모달 backdrop 탭 닫기 | ❌ 미지원 | ✅ 탭으로 닫힘 |
| select 요소 iOS 확대 방지 | ❌ 12px 확대 | ✅ 16px 고정 |

---

## 5. 구현 순서

```
Phase 1 (P0): ReturnManager 모바일 카드 + ReturnRequestModal 바텀시트
  → 반품 관리 핵심 기능 모바일 완성

Phase 2 (P1): 터치 인터랙션
  → FailManager 스와이프, Sidebar 제스처, 모달 backdrop, 버튼 터치 타깃

Phase 3 (P2): 폴리시
  → select 16px, 탭 scroll 복원
```

---

## 6. 파일 목록

| 파일 | 변경 내용 | 우선순위 |
|------|-----------|---------|
| `components/ReturnManager.tsx` | 모바일 카드 레이아웃 추가 | P0 |
| `components/order/ReturnRequestModal.tsx` | 바텀시트 스타일 적용 | P0 |
| `components/FailManager.tsx` | TouchMove/End 스와이프 추가 | P1 |
| `components/Sidebar.tsx` | 스와이프 제스처 닫기 | P1 |
| `components/ConfirmModal.tsx` | backdrop 탭 닫기 | P1 |
| `components/InventoryManager.tsx` | 퀵오더 버튼 터치 타깃 | P1 |
| `components/dashboard/DashboardOperationalTabs.tsx` | 탭 scroll 복원 | P2 |
| `components/ReturnManager.tsx` | select 16px | P2 |
| `components/OrderManager.tsx` | select 16px | P2 |

---

## 7. 리스크

- ReturnManager 카드 레이아웃: `md:hidden` + `hidden md:block` 이중 패턴으로 데스크톱 회귀 없음
- Sidebar 스와이프: 이미 `touchstart/move/end`를 사용하는 다른 요소와 이벤트 충돌 주의 → `e.stopPropagation()` 필요
- FailManager 스와이프: 차트 내부 horizontal scroll과 충돌 가능 → threshold 증가로 오발동 방지
