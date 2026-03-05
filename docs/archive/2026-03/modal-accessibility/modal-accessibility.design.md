# modal-accessibility Design Document

> **Summary**: `components/shared/ModalShell.tsx` 신규 작성 후 33개 모달을 3단계로 마이그레이션.
> Phase 1 (12개 핵심 모달) 완료 기준: WAI-ARIA Dialog Pattern 완전 준수.
>
> **Author**: Frontend Architect
> **Created**: 2026-03-05
> **Status**: Draft
> **Plan**: `docs/01-plan/features/modal-accessibility.plan.md`

---

## 1. 변경 파일 목록

```
components/shared/ModalShell.tsx                          ← 신규 (R-01)
components/NewDataModal.tsx                               ← Phase 1
components/AddItemModal.tsx                               ← Phase 1
components/ConfirmModal.tsx                               ← Phase 1
components/ReceiptConfirmationModal.tsx                   ← Phase 1
components/order/BrandOrderModal.tsx                      ← Phase 1
components/order/ReturnRequestModal.tsx                   ← Phase 1
components/order/OrderCancelModal.tsx                     ← Phase 1
components/inventory/BaseStockModal.tsx                   ← Phase 1
components/inventory/OptimizeModal.tsx                    ← Phase 1
components/FailBulkSetupModal.tsx                         ← Phase 1
components/InventoryCompareModal.tsx                      ← Phase 1
components/audit/AuditHistoryModal.tsx                    ← Phase 1
```

Phase 2 · Phase 3는 Plan 문서 기재 목록 참조. 별도 커밋으로 진행.

---

## 2. ModalShell 구현 설계

### 2-A. 파일 위치

```
components/shared/ModalShell.tsx
```

기존 `components/shared/LegalModal.tsx` 와 같은 shared 디렉터리.

### 2-B. Props 인터페이스

```tsx
interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;                           // sr-only 폴백용 (aria-label)
  titleId?: string;                        // 시각적 h2/h3의 id와 연결
  describedBy?: string;                    // aria-describedby
  role?: 'dialog' | 'alertdialog';         // default: 'dialog'
  initialFocusRef?: React.RefObject<HTMLElement>;
  disableFocusTrap?: boolean;              // default: false
  closeOnBackdrop?: boolean;               // default: true
  closeable?: boolean;                     // false → ESC·backdrop 닫기 비활성 (제출 중 등)
  zIndex?: number;                         // default: Z.MODAL (200)
  maxWidth?: string;                       // Tailwind class, default: 'max-w-md'
  className?: string;                      // 패널 추가 className
  children: React.ReactNode;
}
```

### 2-C. 전체 구현 코드

```tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Z } from '../../utils/zIndex';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  initialFocusRef?: React.RefObject<HTMLElement>;
  disableFocusTrap?: boolean;
  closeOnBackdrop?: boolean;
  closeable?: boolean;
  zIndex?: number;
  maxWidth?: string;
  className?: string;
  children: React.ReactNode;
}

const FOCUSABLE = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusable(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
}

const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  titleId,
  describedBy,
  role = 'dialog',
  initialFocusRef,
  disableFocusTrap = false,
  closeOnBackdrop = true,
  closeable = true,
  zIndex = Z.MODAL,
  maxWidth = 'max-w-md',
  className = '',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 열릴 때: 이전 포커스 저장 + body 스크롤 잠금 + 첫 요소 포커스
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (panelRef.current) {
        const focusable = getFocusable(panelRef.current);
        focusable[0]?.focus();
      }
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = '';
      requestAnimationFrame(() => {
        previousFocusRef.current?.focus();
      });
    };
  }, [isOpen, initialFocusRef]);

  // 포커스 트랩 + ESC
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (closeable) onClose();
        return;
      }

      if (disableFocusTrap || e.key !== 'Tab' || !panelRef.current) return;

      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [closeable, disableFocusTrap, onClose]
  );

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop && closeable) onClose();
  }, [closeOnBackdrop, closeable, onClose]);

  if (!isOpen) return null;

  const ariaProps: React.HTMLAttributes<HTMLDivElement> = {
    role,
    'aria-modal': true,
    ...(titleId ? { 'aria-labelledby': titleId } : { 'aria-label': title }),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={handleBackdropClick}
      aria-hidden={false}
    >
      <div
        ref={panelRef}
        {...ariaProps}
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} ${className}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ModalShell;
```

### 2-D. 설계 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| ESC 핸들러 위치 | `onKeyDown` on panel div (React 합성 이벤트) | `stopPropagation`이 확실히 동작, 중첩 모달 안전 |
| `useEscapeKey` 훅 관계 | ModalShell 외 비모달 오버레이(드로어 등)만 `useEscapeKey` 유지 | 책임 분리 |
| `body.overflow` | ModalShell 열릴 때 `hidden`, 닫힐 때 복원 | cleanup 함수에서 처리하므로 중첩 모달도 마지막 닫힐 때 복원됨 |
| `createPortal` | `document.body` 루트에 마운트 | 부모 `overflow:hidden`/`transform` CSS 간섭 방지 |
| `aria-label` vs `aria-labelledby` | `titleId` 제공 시 `aria-labelledby`, 없으면 `aria-label={title}` | 시각적 제목 없는 모달에서도 스크린리더 접근 가능 |

---

## 3. Phase 1 마이그레이션 상세

각 파일별 변경 위치와 패턴. 내부 콘텐츠 구조(배경색, 패딩, 헤더 UI)는 유지.

### 3-1. NewDataModal.tsx

**현재 구조** (L60~67):
```tsx
<div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
  <div className="bg-white rounded-2xl ... max-w-4xl w-full" onClick={e => e.stopPropagation()}>
    <h3>신규 자료 입력</h3>
    ...
  </div>
</div>
```

**변경 후**:
```tsx
import ModalShell from './shared/ModalShell';
...
<ModalShell isOpen={true} onClose={onClose} title="신규 자료 입력" titleId="new-data-title" maxWidth="max-w-4xl">
  <div className="...내부 구조 유지...">
    <h3 id="new-data-title">신규 자료 입력</h3>
    ...
  </div>
</ModalShell>
```

> NewDataModal은 항상 렌더링 상태에서 호출됨(`if (isOpen) return <NewDataModal>` 패턴).
> `isOpen={true}` 고정 전달.

### 3-2. AddItemModal.tsx

- 기존: 닫기 버튼 `aria-label`만 있음, role/포커스 없음
- `titleId="add-item-title"` + 기존 헤딩에 `id` 추가
- maxWidth: `max-w-2xl` (기존 크기 유지)

### 3-3. ConfirmModal.tsx

- 기존: `role="dialog"` + `aria-modal` 있음, 포커스 트랩 누락
- ModalShell 교체로 포커스 트랩 자동 추가
- `role="alertdialog"` 적용 (확인/취소 다이얼로그이므로)
- `initialFocusRef` → 취소(safe) 버튼으로 지정 (alertdialog 권장)

### 3-4. ReceiptConfirmationModal.tsx

- `titleId="receipt-confirm-title"` + 기존 헤딩 id 추가

### 3-5. BrandOrderModal.tsx

- 전무 상태 → ModalShell 전환
- maxWidth: `max-w-lg`

### 3-6. ReturnRequestModal.tsx

- 부분 적용 상태 → ModalShell 전환
- maxWidth: `max-w-lg`

### 3-7. OrderCancelModal.tsx

- 부분 적용 상태 → ModalShell 전환, `role="alertdialog"`

### 3-8. BaseStockModal.tsx

- 부분 적용 상태 → ModalShell 전환
- maxWidth: `max-w-md`

### 3-9. OptimizeModal.tsx

- 부분 적용 상태 → ModalShell 전환
- maxWidth: `max-w-2xl`

### 3-10. FailBulkSetupModal.tsx

- 전무 상태 → ModalShell 전환
- maxWidth: `max-w-lg`

### 3-11. InventoryCompareModal.tsx

- 전무 상태 → ModalShell 전환
- maxWidth: `max-w-2xl`

### 3-12. AuditHistoryModal.tsx

- 부분 적용 상태 → ModalShell 전환
- maxWidth: `max-w-3xl`

---

## 4. 중첩 모달 처리

`ConfirmModal`이 다른 모달 위에 열리는 경우:
- ConfirmModal의 ModalShell에 `zIndex={Z.MODAL_STACK}` (300) 전달
- 호출 측(상위 모달)은 `zIndex` 기본값 200 유지

```tsx
// 상위 모달에서 ConfirmModal 사용 예
<ConfirmModal zIndex={Z.MODAL_STACK} ... />
```

ConfirmModal props에 `zIndex?: number` 추가 후 ModalShell에 전달.

---

## 5. PricingWaitlistModal Phase 3 처리

현재 내부에 포커스 트랩 + ESC useEffect 직접 구현됨 (`PricingWaitlistModal.tsx:39-82`).
Phase 3에서 ModalShell로 교체 시 해당 useEffect 블록 제거.
단, `showTerms || showPrivacy` 시 ESC 막는 로직은 ModalShell `closeable` prop으로 대체:

```tsx
<ModalShell
  isOpen={!!plan}
  onClose={onClose}
  title="대기 신청"
  titleId="pricing-waitlist-title"
  describedBy="pricing-waitlist-desc"
  closeable={!submitting && !showTerms && !showPrivacy}
>
```

---

## 6. 구현 순서

```
Step 1: components/shared/ModalShell.tsx 생성
Step 2: npm run typecheck (에러 없음 확인)
Step 3: Phase 1 모달 12개 순차 마이그레이션 (파일별 커밋)
Step 4: npm run verify:premerge (전체 통과 확인)
```

Phase 2, 3는 별도 세션에서 진행.

---

## 7. 검증 기준

| 항목 | 확인 방법 |
|------|-----------|
| `role="dialog"` / `aria-modal="true"` | React DevTools 또는 DOM 검사 |
| `aria-labelledby` 또는 `aria-label` | DOM에서 연결 확인 |
| 포커스 트랩 | 모달 열고 Tab/Shift+Tab 순환 동작 확인 |
| ESC 닫기 | 키보드로 ESC → 모달 닫힘 확인 |
| 포커스 복귀 | 닫힌 후 트리거 버튼으로 포커스 이동 확인 |
| TypeScript | `npm run typecheck` 에러 0개 |
| 기존 테스트 | `npm run verify:premerge` 전체 통과 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | Initial design | Frontend Architect |
