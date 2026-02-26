# Gap Analysis: onboarding-improvements

**Date**: 2026-02-26 (updated — round 2: BUG-04 잔존 + NEW-02/03 검증)
**Match Rate**: 100% ✅ PASS
**Analyzer**: bkit:gap-detector

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match (Original) | 100% | PASS |
| Extended Implementation Match | 100% | PASS |
| Bug Fix Verification | 100% | PASS |
| New Round Fixes (D1-D3) | 100% | PASS |
| Architecture Compliance | 100% | PASS |
| Convention Compliance | 100% | PASS |
| **Overall** | **100%** | **PASS** |

**Total checkpoints**: 36 (7 original + 21 extended + 5 bug fix + 3 new round) — 전항목 통과

---

## Part A — Original Design Items (7/7)

### A1. services/onboardingService.ts

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| A1-1 | `KEY_FIXTURE_SAVED` 상수 | ✅ | Line 8 |
| A1-2 | `isFixtureSaved()` 메서드 | ✅ | Lines 90-92 |
| A1-3 | `markFixtureSaved()` 메서드 | ✅ | Lines 93-95: DB 미동기화 설계 의도 반영 |

### A2. App.tsx

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| A2-1 | Step 3 조건 `isFixtureSaved` | ✅ | Line 465: `state.inventory.length === 0 && !onboardingService.isFixtureSaved(hid)` |
| A2-2 | `markFixtureSaved` 핸들러 호출 | ✅ | Line 2168: `.then(ok => { if (ok && hid) markFixtureSaved })` |

### A3. 세션 완료 항목

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| A3-1 | BillingProgramGate "20~30분" | ✅ | BillingProgramGate.tsx Line 68 |
| A3-2 | confetti z-index 수정 | ✅ | 이전 세션 확인 |

---

## Part B — 확장 구현 항목 (21/21)

### B1. Issue 2 — sizeCorrections sessionStorage 지속 (8/8)

**파일**: `components/onboarding/Step2FixtureUpload.tsx`

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| B1-1 | `SESSION_KEY = 'ob_v2_step2_state'` | ✅ | Line 63 |
| B1-2 | `serializeGroups()` 헬퍼 | ✅ | Lines 66-71: Set → Array 변환 |
| B1-3 | `deserializeGroups()` 헬퍼 | ✅ | Lines 72-77: `new Set<string>()` 복원 |
| B1-4 | `uploadedFileMetaRef` ref | ✅ | Line 250: `{ name, size } \| null` |
| B1-5 | 마운트 시 sessionStorage 복원 | ✅ | Lines 253-269 |
| B1-6 | done 상태 자동 저장 | ✅ | Lines 272-285 |
| B1-7 | 같은 파일 재업로드 시 corrections 보존 | ✅ | Lines 308-312: name+size 비교 |
| B1-8 | `sessionStorage.removeItem` 이동 전 정리 | ✅ | Line 787 |

### B2. Issue 3 — V2 미사용 컴포넌트 삭제 (5/5)

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| B2-1 | `Step2BrandSelect.tsx` 삭제 | ✅ | 파일 없음 |
| B2-2 | `Step3StockInput.tsx` 삭제 | ✅ | 파일 없음 |
| B2-3 | `Step5Complete.tsx` 삭제 | ✅ | 파일 없음 |
| B2-4 | `OnboardingStockItem` interface 제거 | ✅ | grep 매칭 없음 |
| B2-5 | G2/D1 주석 제거 | ✅ | grep 매칭 없음 |

### B3. firstIncompleteStep 계산 (2/2)

**파일**: `App.tsx`

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| B3-1 | `firstIncompleteStep` IIFE 선언 | ✅ | Line 455: `const firstIncompleteStep = (() => {` |
| B3-2 | 7단계 조건 전체 커버 | ✅ | Lines 456-471 |

### B4. Step 5 토스트 피드백 (7/7)

| # | 항목 | 결과 | 근거 |
|---|------|------|------|
| B4-1 | `completedLabel` prop in OnboardingToast | ✅ | OnboardingToast.tsx Line 6 |
| B4-2 | emerald 색조 완료 UI | ✅ | 조건부 `bg-emerald-50`, 체크 아이콘 전환 |
| B4-3 | `toastCompletedLabel` state | ✅ | App.tsx Line 138 |
| B4-4 | `prevFirstIncompleteStepRef` + `toastTimerRef` | ✅ | App.tsx Lines 139-140 |
| B4-5 | 5→6 전환 감지 useEffect | ✅ | App.tsx Lines 499-507: 2500ms 초기화 |
| B4-6 | prop 스레딩: AppUserOverlayStack → OnboardingToast | ✅ | AppUserOverlayStack.tsx Line 133 |
| B4-7 | OnboardingWizard Step 5: `if (!file) onSkip(false)` | ✅ | OnboardingWizard.tsx Line 145 |

---

## Part C — 버그 수정 검증 (5/5)

### C1. BUG-01: markFixtureSaved 업로드 성공 후 호출

**App.tsx** Lines 2167-2168 — 업로드 실패 시 플래그 미기록 → Step 3 재진입 가능 ✅

### C2. BUG-02: 업로드 실패 시 wizard dismiss 방지

**OnboardingWizard.tsx** Line 145 — `if (!file) onSkip(false)` ✅

### C3. BUG-04: 세션 복원 후 파일 picker 재오픈

**Step2FixtureUpload.tsx** — `if (!uploadedFile) { fileInputRef.current?.click(); return; }` + amber 버튼 + "파일을 다시 선택해주세요" ✅

### C4. UX-02: ONBOARDING_STEP_PROGRESS[2] = 15

**App.tsx** Line 490 — `{ 1: 0, 2: 15, 3: 15, ... }` ✅

### C5. Sidebar inert React 19 대응

**Sidebar.tsx** Line 93 — `inert={isCollapsed || undefined}` ✅

---

## Part D — 추가 버그 수정 검증 (3/3)

### D1. BUG-04 잔존: fileSize sessionStorage 왕복

**파일**: `components/onboarding/Step2FixtureUpload.tsx`

| 위치 | 라인 | 코드 | 결과 |
|------|------|------|------|
| 저장 | 282 | `fileSize: uploadedFileMetaRef.current?.size ?? null` | ✅ |
| 복원 파싱 | 257 | `fileSize: fs` 구조분해 | ✅ |
| ref 복원 | 265 | `if (fs != null) uploadedFileMetaRef.current = { name: fn, size: fs }` | ✅ |

복원 후 같은 파일 재선택 → `processFile` line 309 `meta.name === file.name && meta.size === file.size` 매칭 → corrections 보존 ✅

### D2. NEW-02: onAppliedSuccess markFixtureSaved 추가

**파일**: `App.tsx` Lines 1666-1677

```typescript
onAppliedSuccess: () => {
  if (hid) {
    onboardingService.markWelcomeSeen(hid);
    onboardingService.markFixtureDownloaded(hid);
    onboardingService.markFixtureSaved(hid);   // ← 추가
    onboardingService.clearDismissed(hid);
  }
  ...
}
```

"기초재고 반영" 성공 시 플래그 기록 → 새로고침 후 Step 3 회귀 방지 ✅

### D3. NEW-03: handleSaveSettingsAndProceed markFixtureSaved 추가

**파일**: `App.tsx` Line 1604

```typescript
onboardingService.markFixtureSaved(state.user.hospitalId);   // ← 추가
onboardingService.clearDismissed(state.user.hospitalId);
```

fixture_edit에서 설정 저장 후 Step 4 진입 시 플래그 기록 → clearDismissed 이전 실행 순서 보장 ✅

---

## 아키텍처 / 컨벤션 준수

- 레이어 의존성 방향 준수 (Presentation → Application → Infrastructure)
- 금지된 크로스레이어 import 없음
- `onboardingService`는 순수 서비스 모듈 유지 (UI import 없음)
- 명명 규칙: PascalCase(컴포넌트), camelCase(함수), UPPER_SNAKE_CASE(상수)
- 새로운 `markFixtureSaved` 호출들이 기존 패턴과 일관성 유지

## 설계 의도 보존 확인

1. `markFixtureSaved()`가 `persistFlag()` DB 동기화 호출 안 함 — 설계 의도 유지
2. sessionStorage 탭 범위 격리 — 탭 간 wizard 상태 누출 방지
3. Step 5 `if (!file) onSkip(false)` — Step 3/6 패턴 통일
4. `firstIncompleteStep` IIFE — `useMemo` 캐시 불일치 방지
5. `fileSize` sessionStorage 왕복 — 탭 이동 후 `uploadedFileMetaRef` 생존으로 corrections 보존

## 발견된 Gap

없음. 36개 전 체크포인트 통과.
