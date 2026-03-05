# performance-bundle 완료 보고서

> **Phase**: Completed
> **Match Rate**: 90%
> **Date**: 2026-03-05
> **Author**: report-generator (bkit)

---

## 1. 개요

번들 구조 문제 2가지(circular chunk, xlsx lazy loading 무력화)와 App.tsx 대형 파일 분리(2,602줄)를
목표로 한 성능 및 유지보수 개선 작업. Phase 1(성능)과 Phase 2(유지보수)로 나누어 진행.

---

## 2. 목표 대비 결과

### Phase 1 — 성능 (Must)

| 목표 지표 | 목표 | 결과 | 상태 |
|----------|------|------|------|
| 빌드 circular 경고 | 0개 | 0개 | ✅ |
| AnalyzePage 초기 로드 시 xlsx 포함 여부 | 제외 | 제외 (별도 청크) | ✅ |
| `shared-*.js` 자동 생성 청크 | 제거 | 빌드에서 미생성 | ✅ |

### Phase 2 — 유지보수 (Should)

| 목표 지표 | 목표 | 결과 | 상태 |
|----------|------|------|------|
| App.tsx 라인 수 | ~1,050줄 | 1,317줄 | ⚠️ |
| 추출 훅/컴포넌트 수 | 6개 | 7개 (useSurgeryUnregistered 추가) | ✅ |
| verify:premerge | Pass | Pass | ✅ |

---

## 3. 구현 상세

### 3-1. Phase 1: 성능 수정

#### R-01 — excelService.ts xlsx 동적 import

- **변경 전**: `import * as XLSX from 'xlsx'` (모듈 최상위 정적 import)
- **변경 후**: `const ExcelJS = await import('exceljs')` (parseExcelFile 함수 내부)
- **효과**: AnalyzePage → analysisService → excelService 체인을 거쳐도 exceljs(940KB)가 초기 청크에 포함되지 않음
- **추가**: xlsx 패키지를 완전히 제거하고 exceljs로 마이그레이션 완료

#### R-03 — vite.config.ts manualChunks 정밀화

- **변경 전**: `if (id.includes('react')) return 'react-vendor'` (광범위 매칭)
- **변경 후**: `/react/`, `/react-dom/`, `/react-is/`, `/scheduler/`, `/use-sync-external-store/`, `/react-helmet-async/`, `/qrcode.react/` 명시적 경로 매칭
- **효과**: qrcode.react 내부 모듈이 vendor와 react-vendor 사이에서 발생하던 circular chunk 해소
- **확인**: `npm run build 2>&1 | grep -i circular` → 출력 없음

### 3-2. Phase 2: App.tsx 훅 추출

7개 파일 신규 생성, App.tsx 2,602줄 → 1,317줄 (49.4% 감소):

| 파일 | 라인 | 추출 내용 |
|------|------|-----------|
| `hooks/useHashRouting.ts` | 92 | URL ↔ state 동기화 4개 useEffect |
| `hooks/useReturnHandlers.ts` | 256 | 반품 CRUD 핸들러 + stockCalcSettings 로드 |
| `hooks/useFileUpload.ts` | 251 | 수술기록/재고 Excel 업로드 처리 |
| `hooks/useSurgeryUnregistered.ts` | 85 | 미등록 수술기록 감지 useMemo |
| `hooks/useOrderHandlers.ts` | 471 | 발주 CRUD + CAS 충돌 처리 + 입고 확인 |
| `hooks/useInventorySync.ts` | 305 | 재고 사용량 계산 + 동기화 trigger |
| `components/FileUploadLoadingOverlay.tsx` | 46 | 업로드 진행 단계 애니메이션 |

**기술적 해결 사항**:
- `stockCalcSettingsRef` 선언 → `useInventorySync` 전달 → `useReturnHandlers` 전달 순서 보장 (stale closure 방지)
- `refreshLatestSurgeryUsage`를 `useInventorySync` 호출 이후로 이동 (hoisting 이슈 수정)
- `mobile-critical-flow.test.mjs`: `refreshOrdersFromServer` 검증 위치를 `App.tsx` → `hooks/useOrderHandlers.ts`로 업데이트

---

## 4. Gap 분석 요약

### GAP-01 — R-02 (Low): analysisService.ts 정적 import 잔존

설계에서는 `analysisService.ts`의 excelService import를 동적으로 전환하도록 명시했으나,
R-01(excelService.ts 내 xlsx 동적화)로 성능 목표가 이미 달성됨.

- `analysisService.ts → excelService.ts`: 정적 import 유지
- `excelService.ts → exceljs`: 동적 import (R-01)
- **실효**: exceljs 940KB가 AnalyzePage 초기 로드 시 제외됨 (성능 목표 달성)
- **미달성 내용**: 모듈 그래프 최적화 수준의 추가 개선 (analysisService를 excelService에서 분리)

### GAP-02 — App.tsx 라인 수 (Low): 1,317줄 vs 목표 ~1,050줄

267줄 차이. 훈련 원인:
1. 계획의 추출 단위별 줄 수 합계(~1,200줄 제거 예상)가 낙관적이었음
2. 훅 호출부(인터페이스 + 구조분해) 추가 비용
3. `resolveManualSurgeryInput` 등 복잡 로직 ~200줄이 P3(Out-of-Scope)로 분류되어 잔존

---

## 5. 남은 작업 (Out-of-Scope P3)

아래 항목은 별도 계획 수립 권장:

| 항목 | 예상 효과 |
|------|-----------|
| `analysisService.ts` excelService import 동적 전환 | 모듈 그래프 최적화 |
| `App.tsx` direct supabase 사용 6곳 서비스 레이어 이동 | 아키텍처 일관성 |
| `resolveManualSurgeryInput` 훅 분리 (~200줄) | App.tsx ~1,100줄로 감소 |
| `AuthForm.tsx` 훅 추출 완료 (useAuthForm) | 별도 세션 미완성 |

---

## 6. 검증

```
npm run verify:premerge  →  PASS (smoke + typecheck + tests + build)
npx tsc --noEmit         →  0 errors (committed state 기준)
npm run build            →  circular 경고 없음, exceljs-vendor 독립 청크 유지
```

---

## 7. 커밋 목록

| 커밋 | 내용 |
|------|------|
| `491160e` | xlsx 패키지 제거 → exceljs 완전 마이그레이션 |
| Phase 1 커밋 | vite.config.ts manualChunks 정밀화, excelService 동적 import |
| Phase 2 Step A–D | useHashRouting, useReturnHandlers, useFileUpload, useSurgeryUnregistered |
| Phase 2 Step E | FileUploadLoadingOverlay 분리 |
| Phase 2 Step F | useOrderHandlers 추출 (CAS 충돌 처리 포함) |
| `202af3d` | useInventorySync 추출 (2602→1317 LOC) |

---

## 8. 결론

**Match Rate: 90%** — 임계값 달성

Phase 1 성능 목표(xlsx lazy loading 복구, circular chunk 제거) 완전 달성.
Phase 2 유지보수 목표(App.tsx 49% 감소, 7개 훅/컴포넌트 분리) 달성.
R-02의 미완성 부분은 R-01의 효과로 성능적 영향이 없으며, P3 개선 항목으로 분류.
