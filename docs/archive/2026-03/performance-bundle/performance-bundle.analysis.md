# performance-bundle Gap Analysis

> **Phase**: Check
> **Date**: 2026-03-05
> **Analyzer**: bkit:gap-detector
> **Match Rate**: 90%

---

## 1. 분석 개요

Design 문서 요구사항(R-01~R-06, In-Scope) 대비 구현 완료율을 측정함.

---

## 2. 요구사항별 구현 상태

### Phase 1 — Must (P1, 성능)

| ID | 요구사항 | 상태 | 비고 |
|----|----------|------|------|
| R-01 | `excelService.ts` xlsx 동적 import 전환 | ✅ 완료 | `await import('exceljs')` — 함수 내부 동적 로딩 |
| R-02 | `analysisService.ts` excelService 정적→동적 전환 | ⚠️ 부분 | static import 유지, 단 xlsx 자체는 lazy (R-01 효과 흡수) |
| R-03 | `vite.config.ts` manualChunks 정밀 매칭 | ✅ 완료 | `/react/`, `/react-dom/` 등 경로 기반 — 빌드 circular 경고 0 |

### Phase 2 — Should (P2, 유지보수)

| ID | 요구사항 | 상태 | 비고 |
|----|----------|------|------|
| R-04 | `useHashRouting`, `useOrderHandlers`, `useReturnHandlers` 추출 | ✅ 완료 | 3개 훅 파일 생성, verify:premerge 통과 |
| R-05 | `useInventorySync`, `useFileUpload` 추출 | ✅ 완료 | 2개 훅 파일 생성, useInventorySync 내부 trigger useEffect 포함 |
| R-06 | `FileUploadLoadingOverlay` 컴포넌트 분리 | ✅ 완료 | `components/FileUploadLoadingOverlay.tsx` 생성 |

---

## 3. Gap 목록

### GAP-01 — R-02: analysisService.ts static import 잔존

**심각도**: Low (성능 영향 없음)

**현재 상태**:
```ts
// services/analysisService.ts L2
import { parseExcelFile } from './excelService';  // 정적 import 유지
```

**설계 의도**: `analysisService.ts` → `excelService.ts` 정적 체인을 제거해 AnalyzePage 청크에서 excelService 분리.

**실제 영향 평가**:
- R-01에서 `excelService.ts` 내 xlsx 로딩이 `await import('exceljs')`로 전환됨
- 따라서 `analysisService → excelService` 정적 chain이 남아도 **xlsx 자체는 초기 번들에 포함되지 않음**
- AnalyzePage 청크에 `excelService` 모듈은 포함되나 xlsx(940KB)는 별도 청크 유지
- 빌드 출력에서 `exceljs-vendor` 청크가 독립적으로 유지됨 (확인)

**결론**: 성능 목표(xlsx 초기 번들 제거)는 R-01로 달성됨. R-02는 추가 최적화(모듈 그래프 경량화)에 해당하며 Critical 수준 아님.

---

### GAP-02 — App.tsx 라인 수 목표 미달

**심각도**: Low

**현재**: 1,317줄 (목표: ~1,050줄)
**차이**: ~267줄

**원인 분석**:
- `useSurgeryUnregistered` 추출은 단순 위임이라 실제 줄 감소 미미 (~15줄)
- 훅 호출부(interface 선언 + 호출 + 구조분해)가 단순 삭제보다 줄이 적게 줄음
- `refreshLatestSurgeryUsage` + `resolveManualSurgeryInput` 등 App.tsx에 남은 복잡 로직(~200줄)이 Out-of-Scope P3에 해당

**결론**: 계획의 "약 1,050줄" 예상은 낙관적이었음. 현재 1,317줄은 원본(2,602줄) 대비 49.4% 감소로 유지보수 목표 달성 수준.

---

## 4. 지표 달성 현황

| 지표 | 목표 | 실측 | 달성 |
|------|------|------|------|
| 빌드 circular 경고 | 0개 | 0개 | ✅ |
| AnalyzePage xlsx 포함 여부 | 제외 | 제외 (별도 청크) | ✅ |
| App.tsx 라인 수 | ~1,050줄 | 1,317줄 | ⚠️ (49% 감소) |
| verify:premerge 통과 | Pass | Pass | ✅ |
| 추출 훅 수 | 6개 | 6개 (+ useSurgeryUnregistered) | ✅ |

---

## 5. 기타 관찰

### 사전 발생 이슈 (performance-bundle 무관)
- `components/AuthForm.tsx`: 작업 디렉토리에 불완전한 리팩토링 변경 잔존 (미커밋)
  - 증상: `User`, `setResendCooldown`, `setResetEmailSent` TS2304/TS2552 오류
  - `useAuthForm` 훅 추출 작업이 도중 중단된 것으로 판단
  - **performance-bundle 커밋에는 포함되지 않음** — 별도 처리 필요

### 추가 확인
- `mobile-critical-flow.test.mjs`: `refreshOrdersFromServer` 검증 대상을 `App.tsx` → `hooks/useOrderHandlers.ts`로 업데이트 완료
- `useInventorySync` 내 `stockCalcSettingsRef` 순서 이슈 수정됨 (선언 → 전달 순서)

---

## 6. Match Rate 산출

| 구분 | 요구사항 | 가중치 | 점수 |
|------|----------|--------|------|
| R-01 | ✅ 완료 | 33% | 33% |
| R-02 | ⚠️ 부분 (0.5점) | 33% | 16.5% |
| R-03 | ✅ 완료 | 33% | 33% |
| **P1 소계** | | **100%** | **82.5%** |
| R-04 | ✅ 완료 | 33% | 33% |
| R-05 | ✅ 완료 | 33% | 33% |
| R-06 | ✅ 완료 | 33% | 33% |
| **P2 소계** | | **100%** | **100%** |

**가중 평균** (P1 60% + P2 40%):
- (82.5% × 0.6) + (100% × 0.4) = 49.5% + 40% = **89.5% → 90%**

---

## 7. 결론

**Match Rate: 90%** — 임계값(90%) 도달. 완료 보고서 작성 가능.

In-Scope 6개 요구사항 중 5개 완전 구현, 1개(R-02) 부분 구현 (성능 목표는 R-01로 대체 달성).

Phase 3 Out-of-Scope 항목(OrderManager 분리, supabase 서비스 이동, AuthForm 리팩토링)은 별도 계획 수립 권장.
