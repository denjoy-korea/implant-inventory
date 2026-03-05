# modal-accessibility Plan Document

> **Summary**: 전체 33개 모달 컴포넌트의 WAI-ARIA Dialog Pattern 접근성 표준 적용.
> `ModalShell` 공통 컴포넌트를 신규 작성하고 기존 모달을 단계적으로 마이그레이션.
>
> **Author**: Frontend Architect + Product Manager
> **Created**: 2026-03-05
> **Status**: Draft

---

## 1. 문제 진단

### 1.1 현황 (실측)

| 속성 | 적용 | 미적용 |
|------|:---:|:---:|
| `role="dialog"` | 15개 | 18개 |
| `aria-modal="true"` | 16개 | 17개 |
| `aria-labelledby` | 16개 | 17개 |
| 포커스 트랩 | 6개 | 27개 |
| ESC 처리 | 15개 | 18개 |
| 포커스 복귀 | 1개 | 32개 |

전체 모달: 33개. 완전 준수: **1개** (PricingWaitlistModal.tsx).

### 1.2 대표 문제 파일

| 파일 | 문제 |
|------|------|
| `NewDataModal.tsx:60` | role/aria/ESC/포커스 전무 |
| `InventoryCompareModal.tsx:34` | role/aria/ESC/포커스 전무 |
| `OnboardingWizard.tsx:95` | 인라인 모달 패턴, 접근성 전무 |
| `AddItemModal.tsx:373` | 닫기 aria-label만 있음 |
| `NotionModal.tsx:227` | role/aria/포커스 전무 |

### 1.3 기준 파일

`PricingWaitlistModal.tsx:90` — role + aria-modal + aria-labelledby + aria-describedby + 포커스 트랩 + 포커스 복귀 완전 구현.

---

## 2. 해결 전략

### 2.1 전략 비교

| 옵션 | 설명 | 위험도 | 작업량 |
|------|------|:---:|:---:|
| A: ModalShell 컴포넌트 | 래퍼 컴포넌트, Portal 포함 | 중 | 중 |
| B: useModalA11y 훅 | 훅만 추가, 구조 유지 | 낮 | 중 |
| C: 개별 직접 수정 | 파일별 copy-paste | 높 | 대 |

### 2.2 채택: 옵션 A (ModalShell 컴포넌트)

**이유:**
- 훅(옵션 B)은 중첩 모달 ESC 전파를 `stopPropagation` 수준에서 제어할 수 없음
- ModalShell이 `createPortal` + 포커스 트랩 + ESC 스택을 단일 진실 공급원으로 캡슐화
- 기존 `useEscapeKey`와 책임 분리: ModalShell 밖 오버레이(드로어 등)는 기존 훅 유지
- 이후 신규 모달은 자동으로 표준 준수

---

## 3. 요구사항

### 3.1 Must

| ID | 요구사항 |
|----|---------|
| R-01 | `components/shared/ModalShell.tsx` 신규 작성 (Portal + ARIA + 포커스 트랩 + ESC + 포커스 복귀) |
| R-02 | 모든 모달 `role="dialog"` / `aria-modal="true"` 적용 |
| R-03 | 모든 모달 `aria-labelledby` → 헤딩 id 연결 |
| R-04 | 포커스 트랩: 모달 내 Tab/Shift+Tab 순환, 배경 탈출 방지 |
| R-05 | ESC 키 → 모달 닫기, 중첩 모달 시 최상단만 닫힘 |
| R-06 | 모달 열릴 때 첫 포커스 가능 요소로 포커스 이동 |
| R-07 | 모달 닫힐 때 열기 전 트리거 요소로 포커스 복귀 |
| R-08 | `verify:premerge` 기존 테스트 전체 통과 유지 |

### 3.2 Should

| ID | 요구사항 |
|----|---------|
| R-09 | `aria-describedby` — 설명 텍스트 있는 모달에 적용 |
| R-10 | 닫기(X) 버튼 `aria-label="닫기"` 표준화 |
| R-11 | `body { overflow: hidden }` 스크롤 잠금 일관 적용 |

### 3.4 추가 스코프 (이슈 8, 9 편입)

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| R-12 | `window.alert` 2건 → 토스트 알림으로 교체 (`OrderManager.tsx:627`, `AdminPanel.tsx:110`) | Should |
| R-13 | `window.confirm` 7건 → 커스텀 ConfirmModal로 교체 (비가역 삭제 2건 `alertdialog` role) | Must |
| R-14 | `role="button"` + `tabIndex={0}` 8곳에 `onKeyDown` Enter+Space 핸들러 추가 | Must |
| R-15 | `index.css:92-99` — `outline: none` → `outline: 2px solid`, `ring: 2px` 제거 | **완료** |

### 3.5 Won't (이번 범위 제외)

- WCAG 2.1 AA 색상 대비 전체 감사
- 네이티브 `<dialog>` 요소 전환
- 스크린리더 실기기 QA

---

## 4. ModalShell 컴포넌트 설계

### 4.1 Props 인터페이스

```typescript
interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;                          // aria-labelledby 자동 연결 (sr-only fallback)
  titleId?: string;                       // 시각적 헤딩 id와 연결 시 명시
  describedBy?: string;                   // aria-describedby
  role?: 'dialog' | 'alertdialog';        // default: 'dialog'
  initialFocusRef?: React.RefObject<HTMLElement>;
  disableFocusTrap?: boolean;             // 특수 케이스 탈출구
  closeOnBackdrop?: boolean;              // default: true
  closeable?: boolean;                    // false = submitting 상태 등
  maxWidth?: string;                      // Tailwind class, default: 'max-w-md'
  className?: string;
  children: React.ReactNode;
}
```

### 4.2 핵심 동작

```
열릴 때:
  1. previousFocus = document.activeElement 저장
  2. body.overflow = 'hidden'
  3. rAF → 첫 포커스 가능 요소 focus()

Tab 처리 (포커스 트랩):
  - 첫 요소에서 Shift+Tab → 마지막 요소로
  - 마지막 요소에서 Tab → 첫 요소로

ESC 처리:
  - event.stopPropagation() 후 onClose() 호출
  - closeable=false 시 무시

닫힐 때:
  1. body.overflow 복원
  2. rAF → previousFocus.focus()
```

### 4.3 Portal 사용 이유

부모 컴포넌트의 `overflow:hidden` 또는 `transform` CSS가 `fixed` 레이아웃을 깨는 문제 방지.
`createPortal(panel, document.body)` 로 body 루트에 마운트.

### 4.4 z-index 정책

`utils/zIndex.ts` 상수 활용:
- 기본 모달: `z-[200]`
- 중첩 모달 (확인 다이얼로그 등): `z-[300]`
- `className` prop으로 오버라이드 가능

---

## 5. 마이그레이션 계획 (33개 모달)

### Phase 1 — ModalShell 작성 + 핵심 업무 모달 (우선순위 최고, 12개)

| 파일 | 현재 상태 |
|------|----------|
| `NewDataModal.tsx` | 전무 |
| `AddItemModal.tsx` | 닫기 label만 |
| `ConfirmModal.tsx` | ARIA 있음, 포커스 트랩 누락 |
| `ReceiptConfirmationModal.tsx` | 부분 |
| `BrandOrderModal.tsx` | 전무 |
| `ReturnRequestModal.tsx` | 부분 |
| `OrderCancelModal.tsx` | 부분 |
| `BaseStockModal.tsx` | 부분 |
| `OptimizeModal.tsx` | 부분 |
| `FailBulkSetupModal.tsx` | 전무 |
| `InventoryCompareModal.tsx` | 전무 |
| `AuditHistoryModal.tsx` | 부분 |

### Phase 2 — 관리자·설정 모달 (10개)

`NotionModal`, `SlackModal`, `SolapiModal`, `StockCalcSettingsModal`,
`MonthlyReportModal`, `DirectPaymentModal`, `UpgradeModal`,
`FailDetectionModal`, `FailReturnModal`, `ManualFixModal`

### Phase 3 — 기존 양호 모달 마이그레이션 + Should 항목 (11개)

`PricingWaitlistModal`, `PricingPaymentModal`, `PricingTrialConsentModal`,
`LegalModal`, `ReturnCandidateModal`, `UnregisteredDetailModal`,
`EditNoticeModal`, `DentwebGuideModal`, `FailThresholdModal`,
`OnboardingCompleteModal`, `OnboardingWizard`

---

## 6. 마이그레이션 패턴

### Before (NewDataModal 패턴)

```tsx
<div className="fixed inset-0 z-50 ..." onClick={onClose}>
  <div className="bg-white ..." onClick={e => e.stopPropagation()}>
    <h3>신규 자료 입력</h3>
    ...
  </div>
</div>
```

### After

```tsx
<ModalShell isOpen={isOpen} onClose={onClose} title="신규 자료 입력" maxWidth="max-w-4xl">
  <div className="bg-white ...">   {/* 내부 콘텐츠 구조 그대로 유지 */}
    <h3 id={titleId}>신규 자료 입력</h3>
    ...
  </div>
</ModalShell>
```

변경 라인 수: 파일당 평균 **3~8줄**.

---

## 7. 검증 명령

```bash
npm run typecheck
npm run verify:premerge
```

완료 기준:
- 33개 모달 전부 `role="dialog"` + `aria-modal` + `aria-labelledby` 적용
- 포커스 트랩 + ESC + 포커스 복귀 일관 동작
- 기존 테스트 전체 통과

---

## 8. 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| ModalShell z-index 충돌 | 중 | `className` prop으로 오버라이드, `zIndex.ts` 상수 사용 |
| Portal + SSR (해당 없음) | 낮 | Vite CSR 전용 프로젝트, 문제 없음 |
| PricingWaitlistModal 기존 포커스 코드 중복 | 낮 | Phase 3에서 내부 useEffect 제거 |
| Phase 진행 중 기존 동작 회귀 | 중 | Phase별 커밋 + verify:premerge 통과 확인 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | Initial plan | Frontend Architect + Product Manager |
