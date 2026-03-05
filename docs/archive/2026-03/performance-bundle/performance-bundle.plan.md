# performance-bundle Plan Document

> **Summary**: 번들 구조 문제(circular chunk, xlsx lazy loading 무력화)와
> 대형 파일(App.tsx 2,602줄, OrderManager.tsx 2,036줄) 해소.
> 초기 번들 크기 감소 + 유지보수성 개선이 목표.
>
> **Author**: Frontend Architect / Code Analyzer
> **Created**: 2026-03-05
> **Last Modified**: 2026-03-05
> **Status**: Draft

---

## 1. 문제 진단

### 1.1 3팀 병렬 분석 결과 요약

| 팀 | 대상 | 주요 발견 |
|---|---|---|
| Frontend Architect | vite.config.ts + 번들 분할 | circular chunk 원인 + xlsx lazy 무력화 경로 |
| Code Analyzer | App.tsx + OrderManager.tsx | 실제 라인 수 + 분리 가능 단위 목록 |
| Explore | lazy loading 현황 + 번들 크기 | 정적 import 과부하 + xlsx 체인 경로 확인 |

### 1.2 확인된 실제 문제 (무해 항목 제외)

**supabaseClient 이중 import**: 무해. cryptoUtils 의도적 패턴, 런타임·번들 영향 없음. **분석 대상 제외.**

---

## 2. 문제 상세

### Problem 1 — Critical: App.tsx 2,602줄 + 정적 서비스 import 과부하

**실측 라인 수**: 2,602줄 (권장 max 300의 8.7배)

**초기 번들 영향**: App.tsx 상단에 15개 이상 서비스가 정적으로 import됨.
랜딩 페이지 방문자도 `inventoryService`, `orderService`, `surgeryService` 등 전부 포함.

**분리 가능 단위 (팀 B 실측)**:

| 추출 대상 | 현재 위치(라인) | 크기 | 리스크 |
|---|---|---|---|
| `useHashRouting` | L398-474 | ~80줄 | 낮음 |
| `useInventorySync` | L480-767 | ~290줄 | 중간 |
| `useOrderHandlers` | L1232-1891 | ~660줄 | 중간 |
| `useReturnHandlers` | L1453-1680 | ~230줄 | 낮음 |
| `useFileUpload` | L1016-1230 | ~215줄 | 낮음 |
| `useSurgeryUnregistered` | L2052-2118 | ~70줄 | 낮음 |
| `FileUploadLoadingOverlay` | L83-112 | ~30줄 | 없음 |

추출 완료 시 App.tsx: **2,602 → 약 1,050줄** (예상)

**추가 문제**: App.tsx에서 `supabase`를 직접 6회 사용 (서비스 레이어 우회) → 이동 대상.

---

### Problem 2 — High: xlsx lazy loading 무력화

**원인 체인**:
```
App.tsx: await import('./services/excelService')  ← 올바른 의도
  그러나 정적 체인으로 무력화됨:
  AnalyzePage(public) → analysisService.ts → excelService.ts → xlsx
  OnboardingWizard → Step2FixtureUpload.tsx → excelService.ts → xlsx
  OnboardingWizard → Step4UploadGuide.tsx → excelService.ts → xlsx
```

**영향**:
- AnalyzePage는 public 페이지 (신규 유저 방문) → xlsx 325KB가 공개 페이지 로드 시 포함
- 빌드 출력에서 `xlsx-vendor`가 별도 청크로 분리되어 있어도, AnalyzePage 청크 로드 시 함께 다운로드됨

**수정 방향**:
```ts
// excelService.ts 내 함수별 동적 import
export async function parseExcelFile(file: File) {
  const XLSX = await import('xlsx');
  // ...
}
// analysisService.ts: excelService 정적 → 동적 전환
// Step2FixtureUpload.tsx, Step4UploadGuide.tsx: 동일
```

---

### Problem 3 — Medium: manualChunks circular chunk

**원인**:
```ts
// vite.config.ts:34 — 너무 광범위한 매칭
if (id.includes('react')) return 'react-vendor';  // 문제
// qrcode.react가 vendor 배정되나 내부적으로 react 참조
// → vendor → react-vendor 단방향 순환
// → Rollup이 shared-C80LqAbB.js 자동 생성으로 우회 (비효율)
```

**수정 방향**:
```ts
// 정밀 경로 매칭으로 교체
if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('qrcode.react'))
  return 'react-vendor';
```

---

### Problem 4 — Medium: OrderManager.tsx 2,036줄

**실측 라인 수**: 2,036줄 (권장 max 300의 6.8배)
**초기 번들 영향**: 탭 lazy loading으로 초기 로드 무관. **유지보수·HMR 문제**.

**분리 가능 단위**:

| 추출 대상 | 내용 | 크기 |
|---|---|---|
| `useOrderManagerFilters` | 필터 상태 + 그룹화 로직 | ~130줄 |
| `OrderKPISummary` | KPI 카드 (mobile+desktop) | ~80줄 |
| `OrderLowStockSection` | 재고 부족 추천 섹션 | ~200줄 |
| `OrderTableBody` | 통합 행 렌더링 | ~400줄 |
| `types/order.ts` | GroupedOrder 등 타입 이동 | ~30줄 |

---

## 3. 요구사항

### 3.1 Must (P1 — 성능 영향)

| ID | 요구사항 | 목표 지표 |
|----|----------|-----------|
| R-01 | `excelService.ts` 내 `xlsx` import를 함수별 동적 import로 전환 | xlsx 초기 번들 제거 |
| R-02 | `analysisService.ts` excelService 정적 → 동적 import 전환 | AnalyzePage xlsx 분리 |
| R-03 | `vite.config.ts` manualChunks 정밀 매칭으로 circular 경고 제거 | 빌드 경고 0 |

### 3.2 Should (P2 — 유지보수)

| ID | 요구사항 |
|----|----------|
| R-04 | App.tsx에서 `useHashRouting`, `useOrderHandlers`, `useReturnHandlers` 추출 |
| R-05 | App.tsx에서 `useInventorySync`, `useFileUpload` 추출 |
| R-06 | `FileUploadLoadingOverlay` 컴포넌트 분리 |

### 3.3 Could (P3 — 장기 개선)

| ID | 요구사항 |
|----|----------|
| R-07 | OrderManager.tsx 서브컴포넌트 분리 (OrderKPISummary, OrderTableBody 등) |
| R-08 | App.tsx의 직접 `supabase` 사용 6곳을 서비스 레이어로 이동 |
| R-09 | Step2FixtureUpload, Step4UploadGuide의 excelService import 동적 전환 |

---

## 4. 작업 우선순위 및 순서

```
Phase 1 (P1 — 성능, 빠른 수정):
  Step 1: vite.config.ts manualChunks 정밀 매칭 (R-03) — 10분, 리스크 없음
  Step 2: excelService.ts 동적 import 전환 (R-01) — 30분, 중간 리스크
  Step 3: analysisService.ts 동적 import 전환 (R-02) — 20분, 낮은 리스크
  Step 4: npm run verify:premerge 통과 확인

Phase 2 (P2 — 유지보수, App.tsx 분리):
  Step 5: useHashRouting 추출 (R-04 일부) — 낮은 리스크
  Step 6: useReturnHandlers 추출 (R-04 일부) — 낮은 리스크
  Step 7: useFileUpload 추출 (R-05 일부) — 낮은 리스크
  Step 8: useOrderHandlers 추출 (R-04 일부) — 중간 리스크 (shared state)
  Step 9: useInventorySync 추출 (R-05 일부) — 중간 리스크 (trigger semantics)
  Step 10: FileUploadLoadingOverlay 컴포넌트 분리 (R-06)

Phase 3 (P3 — 선택적):
  Step 11~: OrderManager 서브컴포넌트 분리 (R-07)
  Step 12~: supabase 직접 사용 서비스 이동 (R-08)
```

---

## 5. 예상 효과

| 지표 | 현재 | 목표 (Phase 1 후) |
|---|---|---|
| 빌드 circular 경고 | 1개 | 0개 |
| AnalyzePage 로드 시 xlsx 포함 여부 | 포함 | 제외 |
| App.tsx 라인 수 | 2,602줄 | ~1,050줄 (Phase 2 후) |
| 초기 번들 감소 (예상) | 225KB | 195-210KB |

---

## 6. 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| useOrderHandlers 추출 시 stale closure | 발주 상태 업데이트 오류 | useCallback + 의존성 배열 엄격 관리 |
| useInventorySync trigger semantics 변경 | 재고 동기화 타이밍 오류 | 추출 전후 useEffect 의존성 동일성 확인 |
| excelService 동적 import 전환 시 타입 추론 | TypeScript 에러 | `typeof import('xlsx')` 패턴 사용 |

---

## 7. Scope

### In Scope
- [ ] Phase 1: Vite 설정 + xlsx lazy loading 복구
- [ ] Phase 2: App.tsx 훅 추출 (5개)
- [ ] Phase 2: FileUploadLoadingOverlay 분리

### Out of Scope (별도 기획)
- OrderManager.tsx 서브컴포넌트 전체 분리 (R-07)
- supabase 직접 사용 마이그레이션 (R-08)
- Onboarding 컴포넌트 xlsx 분리 (R-09)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | 3팀 병렬 분석 결과 기반 초안 | Frontend Architect |
