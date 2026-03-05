# performance-bundle Design Document

> **Summary**: 번들 구조 문제 2가지(circular chunk, xlsx lazy loading 무력화) +
> App.tsx 대형 파일 분리(Phase 2). Phase 1은 3개 파일 수정으로 완료.
>
> **Author**: Frontend Architect
> **Created**: 2026-03-05
> **Status**: Draft

---

## 0. 사전 진단 (실제 코드 확인)

### 확인된 정적 import 체인

```
excelService.ts:1    import * as XLSX from 'xlsx';      ← 항상 정적 로드
analysisService.ts:2 import { parseExcelFile } from './excelService';
Step2FixtureUpload.tsx:2  import { parseExcelFile } from '../../services/excelService';
Step4UploadGuide.tsx:2    import { parseExcelFile } from '../../services/excelService';
```

**핵심 발견**: `downloadExcelFile`은 XLSX를 직접 사용하지 않음 (Edge Function 호출).
`parseExcelFile`만 XLSX를 사용함. → xlsx 동적 import를 `parseExcelFile` 내부로 이동하면
**analysisService, Onboarding 컴포넌트 수정 없이** 모든 정적 체인이 자동 해소됨.

### vite.config.ts 현재 상태

```ts
// vite.config.ts:36
if (id.includes('react')) return 'react-vendor';  // 문제: 너무 광범위
```

`qrcode.react` 경로 → `includes('react')` 매칭 → react-vendor 배정
but `qrcode.react`의 일부 내부 모듈이 `vendor` 폴백 대상과 상호 참조
→ `Circular chunk: vendor -> react-vendor -> vendor`
→ Rollup 자동 우회: `shared-C80LqAbB.js` 생성 (11KB 비효율 청크)

---

## 1. Phase 1 — 성능 수정 (3개 파일)

### 변경 파일 목록

```
vite.config.ts                             ← R-03 (manualChunks 정밀화)
services/excelService.ts                   ← R-01 (xlsx 동적 import)
```

**analysisService.ts, Step2FixtureUpload.tsx, Step4UploadGuide.tsx**: 변경 불필요.
excelService.ts 수정만으로 정적 체인 전체가 자동 해소됨.

---

### 1-A. `vite.config.ts` — manualChunks 정밀화 (R-03)

#### 변경 전 (현재 L36)

```ts
if (id.includes('react')) return 'react-vendor';
```

#### 변경 후

```ts
if (
  id.includes('/react/') ||
  id.includes('/react-dom/') ||
  id.includes('/react-is/') ||
  id.includes('/scheduler/') ||
  id.includes('/use-sync-external-store/') ||
  id.includes('/react-helmet-async/') ||
  id.includes('/qrcode.react/')
) return 'react-vendor';
```

**이유**:
- `id.includes('react')` → `qrcode.react`, `react-helmet-async` 포함 (의도적)이나
  경로에 `/` 구분자 없으면 오탐 가능
- 명시적 패키지 목록으로 교체해 circular 원인 제거
- `qrcode.react`를 react-vendor에 명시적으로 포함 → vendor 청크에서 제거
  → `vendor → react-vendor` 단방향 참조 해소

**기대 결과**: `shared-C80LqAbB.js` 자동 생성 청크 제거, circular 경고 소멸

---

### 1-B. `services/excelService.ts` — xlsx 동적 import (R-01)

#### 변경 전 (현재 L1)

```ts
import * as XLSX from 'xlsx';   // ← 모듈 로드 시 항상 포함
import { ExcelData, ExcelRow } from '../types';
import { supabase } from './supabaseClient';

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  // ... XLSX.utils.sheet_to_json, XLSX.utils.decode_range, XLSX.utils.encode_col
};
```

#### 변경 후

```ts
// import * as XLSX from 'xlsx'; ← 삭제
import { ExcelData, ExcelRow } from '../types';
import { supabase } from './supabaseClient';

export const parseExcelFile = async (file: File): Promise<ExcelData> => {
  const XLSX = await import('xlsx');   // ← 파일 업로드 시점에만 로드
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  // 이하 동일 (XLSX.utils.* 메서드 타입 자동 추론됨)
};

// downloadExcelFile: XLSX 직접 사용 없음 (Edge Function 호출) → 변경 불필요
```

**이유**:
- `downloadExcelFile`은 XLSX를 사용하지 않으므로 static import 불필요
- `parseExcelFile` 내부에서만 `await import('xlsx')` → xlsx-vendor 청크가
  실제 파싱 호출 시점까지 지연 로드됨
- ES 모듈 캐시 덕분에 동일 세션 내 두 번째 호출부터는 즉시 반환 (성능 무관)

**자동 해소 범위**:
- `analysisService.ts` → excelService import 유지, 그러나 excelService 로드 시
  xlsx-vendor가 포함되지 않으므로 AnalyzePage 청크에서 xlsx 제거 자동 완료
- `Step2FixtureUpload.tsx`, `Step4UploadGuide.tsx` → 동일하게 자동 해소
- `App.tsx`의 `await import('./services/excelService')` → 기존 동적 import 유지

**타입 안전성**: `await import('xlsx')`는 TypeScript가 `node_modules/xlsx` 타입 선언에서
자동으로 `XLSX` 타입을 추론. `XLSX.read()`, `XLSX.utils.*` 모두 타입 유지.

---

### 1-C. Phase 1 변경 범위 요약

```
변경 파일: 2개
  vite.config.ts        — L36: 1줄 → 7줄 (react-vendor 매칭 정밀화)
  services/excelService.ts — L1 삭제, parseExcelFile 내부 1줄 추가

자동 해소 (변경 불필요):
  services/analysisService.ts
  components/onboarding/Step2FixtureUpload.tsx
  components/onboarding/Step4UploadGuide.tsx
```

---

## 2. Phase 2 — App.tsx 훅 추출 (유지보수)

### 2-A. 추출 순서 및 설계 원칙

**원칙**:
1. 낮은 리스크부터 시작 (공유 상태 없는 순수 로직 먼저)
2. 각 단계 후 `npm run verify:premerge` 통과 확인
3. `useOrderHandlers`/`useInventorySync`는 shared state 위험 → 마지막

**추출 목표 파일 구조**:

```
hooks/
  useHashRouting.ts        ← Step A (80줄, 낮은 리스크)
  useReturnHandlers.ts     ← Step B (230줄, 낮은 리스크)
  useFileUpload.ts         ← Step C (215줄, 낮은 리스크)
  useSurgeryUnregistered.ts ← Step D (70줄, 없음)
  useOrderHandlers.ts      ← Step E (660줄, 중간 리스크)
  useInventorySync.ts      ← Step F (290줄, 중간 리스크)
components/
  FileUploadLoadingOverlay.tsx ← Step G (30줄, 없음)
```

---

### 2-B. `useHashRouting` (Step A — 낮은 리스크)

**추출 범위**: App.tsx L398-474 (4개 useEffect, URL ↔ state 동기화)

```ts
// hooks/useHashRouting.ts
export function useHashRouting(
  activeTab: ActiveTab,
  setActiveTab: (tab: ActiveTab) => void,
  activeModal: string | null,
  setActiveModal: (modal: string | null) => void,
) {
  // 4개 useEffect 그대로 이동
  // state-to-URL, URL-to-state, initial load, deep-link restore
}
```

**App.tsx 변경**: `useHashRouting(activeTab, setActiveTab, activeModal, setActiveModal);`

---

### 2-C. `useReturnHandlers` (Step B — 낮은 리스크)

**추출 범위**: App.tsx L1453-1680 (handleReturnCreate, handleReturnUpdateStatus, 등)

```ts
// hooks/useReturnHandlers.ts
export function useReturnHandlers(
  hospitalId: string,
  orders: Order[],
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  showAlertToast: (msg: string, type: ToastType) => void,
) {
  const handleReturnCreate = useCallback(...);
  const handleReturnUpdateStatus = useCallback(...);
  // ... 기타 return 핸들러
  return { handleReturnCreate, handleReturnUpdateStatus, ... };
}
```

---

### 2-D. `useFileUpload` (Step C — 낮은 리스크)

**추출 범위**: App.tsx L1016-1230 (handleFileUpload)

```ts
// hooks/useFileUpload.ts
export function useFileUpload(
  hospitalId: string,
  inventory: InventoryItem[],
  surgeryMaster: SurgeryMaster[],
  setInventory: ...,
  showAlertToast: ...,
) {
  const handleFileUpload = useCallback(async (file: File, fileType: FileType) => {
    // await import('./services/excelService') — 기존 동적 import 유지
    ...
  }, [...]);
  return { handleFileUpload };
}
```

---

### 2-E. `useSurgeryUnregistered` (Step D — 리스크 없음)

**추출 범위**: App.tsx L2052-2118 (surgeryUnregisteredItems useMemo)

```ts
// hooks/useSurgeryUnregistered.ts
export function useSurgeryUnregistered(
  surgeryRecords: SurgeryRecord[],
  inventory: InventoryItem[],
  surgeryMaster: SurgeryMaster[],
) {
  return useMemo(() => computeSurgeryUnregisteredItems(...), [...]);
}
```

---

### 2-F. `useOrderHandlers` (Step E — 중간 리스크)

**추출 범위**: App.tsx L1232-1891 (660줄, 발주 CRUD 핸들러 전체)

**주의사항**:
- 17개 이상 파라미터 필요 → `OrderHandlersDeps` 인터페이스로 묶기
- optimistic update + rollback 패턴 유지 필수
- `useCallback` 의존성 배열 엄격 관리

```ts
// hooks/useOrderHandlers.ts
interface OrderHandlersDeps {
  hospitalId: string;
  orders: Order[];
  inventory: InventoryItem[];
  setOrders: React.Dispatch<...>;
  setInventory: React.Dispatch<...>;
  showAlertToast: (msg: string, type: ToastType) => void;
}

export function useOrderHandlers(deps: OrderHandlersDeps) {
  const { hospitalId, orders, inventory, setOrders, setInventory, showAlertToast } = deps;
  // 모든 order CRUD 핸들러
  return { handleUpdateOrderStatus, handleDeleteOrder, ... };
}
```

---

### 2-G. `useInventorySync` (Step F — 중간 리스크)

**추출 범위**: App.tsx L480-767 (computeUsageByInventoryFromRecords + syncInventoryWithUsageAndOrders)

**주의사항**:
- 이 훅은 `state.orders` 변경 시 trigger됨 + surgery master 변경 시도 trigger
- trigger semantics 보존 필수: useEffect 의존성 배열을 원본과 동일하게 유지

```ts
// hooks/useInventorySync.ts
export function useInventorySync(
  surgeryRecords: SurgeryRecord[],
  orders: Order[],
  inventory: InventoryItem[],
  setInventory: React.Dispatch<...>,
) {
  // computeUsageByInventoryFromRecords 함수 포함
  // syncInventoryWithUsageAndOrders 포함
  // useEffect trigger 동일하게 유지
}
```

---

### 2-H. `FileUploadLoadingOverlay` (Step G — 리스크 없음)

**추출 범위**: App.tsx L83-112 (standalone React.FC)

```ts
// components/FileUploadLoadingOverlay.tsx
interface Props { isVisible: boolean; }
export const FileUploadLoadingOverlay: React.FC<Props> = ({ isVisible }) => {
  // 기존 JSX 그대로 이동
};
```

---

## 3. 구현 순서

```
Phase 1 (P1):
  Step 1: vite.config.ts manualChunks 정밀화
  Step 2: excelService.ts xlsx 동적 import
  Step 3: npm run build → circular 경고 없음 + xlsx lazy 확인
  Step 4: npm run verify:premerge → 전체 통과

Phase 2 (P2, 각 step마다 verify:premerge):
  Step A: useHashRouting 추출
  Step B: useReturnHandlers 추출
  Step C: useFileUpload 추출
  Step D: useSurgeryUnregistered 추출
  Step E: FileUploadLoadingOverlay 분리
  Step F: useOrderHandlers 추출 (중간 리스크)
  Step G: useInventorySync 추출 (중간 리스크)
```

---

## 4. 검증 기준

### Phase 1 검증

| 항목 | 명령 | 기대 결과 |
|---|---|---|
| circular 경고 제거 | `npm run build 2>&1 \| grep -i circular` | 출력 없음 |
| shared 청크 제거 | 빌드 결과 확인 | `shared-*.js` 미생성 |
| xlsx 지연 로드 확인 | `npm run build` 후 청크 확인 | xlsx-vendor가 excelService 청크에 정적 링크 없음 |
| 기능 정상 동작 | `npm run verify:premerge` | 전체 통과 |

### Phase 2 검증

| 항목 | 기대 결과 |
|---|---|
| App.tsx 라인 수 | 2,602 → ~1,050줄 |
| 각 step 후 verify:premerge | GREEN |
| 타입 에러 없음 | `npm run typecheck` GREEN |

---

## 5. 하위 호환성

| 항목 | 변경 | 영향 |
|---|---|---|
| `excelService` export API | 변경 없음 | 호출자 전부 안전 |
| `parseExcelFile` 시그니처 | 변경 없음 | 동일 `async (file: File): Promise<ExcelData>` |
| `downloadExcelFile` | 변경 없음 | XLSX 사용 안 했으므로 무관 |
| `analysisService` | 변경 없음 | import 그대로 유지 |
| Onboarding 컴포넌트 | 변경 없음 | import 그대로 유지 |
| App.tsx 외부 인터페이스 | 변경 없음 | props, export 동일 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | 실제 코드 확인 기반 설계 | Frontend Architect |
