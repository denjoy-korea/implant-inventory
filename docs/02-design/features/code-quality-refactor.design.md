# Design: code-quality-refactor

## 1. Overview

| 항목 | 내용 |
|------|------|
| Feature | code-quality-refactor |
| Plan Ref | `docs/01-plan/features/code-quality-refactor.plan.md` |
| Phase | Design |
| Created | 2026-02-19 |

---

## 2. FR-01: useAppState.ts alert() 폴백 제거

### 현재 코드 (hooks/useAppState.ts:55)

```typescript
// 현재
const notify = onNotify ?? ((msg: string) => alert(msg));
```

### 문제
- `onNotify`가 전달되지 않을 경우 브라우저 native `alert()` 호출
- App.tsx에서 `useAppState`를 사용 중이므로 실제 alert() 실행 가능성 존재
- native alert는 메인스레드 블로킹, UX 불일치

### 현재 호출 위치 분석

```
App.tsx → useAppState(showToast) → notify 전달됨
```

App.tsx에서 `showToast`를 `onNotify`로 전달하므로 실제 production에서는 alert가 불리지 않음.
그러나 **폴백 코드 자체가 존재**하므로 제거.

### 설계: 단순 제거

```typescript
// 변경 후
type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

export function useAppState(onNotify: NotifyFn) {  // optional → required
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  // notify 폴백 제거 — App.tsx에서 항상 전달하므로 불필요
```

**대안: no-op 폴백**

```typescript
// 타입 변경 없이 no-op으로 교체
const notify = onNotify ?? ((msg: string, _type: string) => console.warn('[notify fallback]', msg));
```

→ **채택: no-op 폴백** 방식. `onNotify` 선택적(optional) 유지로 하위 호환성 보장.

### 변경 파일
- `hooks/useAppState.ts` line 55

---

## 3. FR-02: VITE_PATIENT_DATA_KEY 클라이언트 노출 대응

### 위험 분석

```
현재 흐름:
.env → VITE_PATIENT_DATA_KEY → Vite 빌드 인라인 → dist/assets/*.js
                                                  → 브라우저 DevTools Source에서 노출
```

`VITE_` 접두어 환경변수는 빌드 시 `import.meta.env.VITE_XXX` → 리터럴 문자열로 번들에 삽입됨.

### 선택지 비교

| 옵션 | 구현 복잡도 | 보안 | 기존 데이터 호환 |
|------|------------|------|-----------------|
| A. Edge Function 이전 (암·복호화 서버 이전) | 높음 | 완전 | 마이그레이션 필요 |
| B. VITE_ 접두어 제거 + Supabase Vault | 중간 | 완전 | 마이그레이션 필요 |
| C. 런타임 키 주입 (Edge Function → 세션키) | 중간 | 높음 | 호환 |
| **D. 경고 추가 + 문서화** (임시 대응) | **낮음** | **현재 유지** | **완전 호환** |

### 채택 설계: Option D (단기) + Option C 준비 문서화

**단기 (이번 스프린트)**:
- `cryptoUtils.ts` 상단에 명확한 보안 주석 추가
- `.env.example` 키 이름에 `[SERVER-ONLY]` 안내 주석 추가
- `README` 또는 배포 가이드에 Vercel/Netlify 환경변수 설정 필수 명시

**이유**: `VITE_PATIENT_DATA_KEY`는 이미 환경마다 다른 값을 설정해 운영 중. 키 자체를 제거하거나 Edge Function으로 이전하려면 기존 ENCv2 데이터 전량 재암호화가 필요해 별도 마이그레이션 스프린트 필요.

**중기 (다음 스프린트, Out of Scope)**:
- Supabase Edge Function `crypto-proxy` 구현
- 클라이언트 → Edge Function(암호화 요청) → 클라이언트(암호문)
- `VITE_PATIENT_DATA_KEY` → `PATIENT_DATA_KEY` (서버 전용)

### 변경 파일 (단기)
- `services/cryptoUtils.ts`: 주석 강화
- `.env.example`: 안내 주석 추가

---

## 4. FR-03: surgeryParser.ts 추출 (파싱 로직 단일화)

### 현재 중복 위치 파악 필요

ExcelTable.tsx와 InventoryManager.tsx 양쪽에 수술기록 파싱 로직 존재 여부 확인 후 설계.

현재 확인된 바:
- `ExcelTable.tsx`: `ExcelRow` 타입 사용, 길이 추출 등 재고 행 파싱
- `InventoryManager.tsx`: `row['수술기록']` 필드 접근

**수술기록 파싱 중복 실제 위치**: `services/analysisService.ts` (수술기록 → 통계 변환) 와 `App.tsx` (업로드 시 파싱) 가능성이 높음.

### 설계: surgeryParser.ts 신규 파일

```typescript
// services/surgeryParser.ts

export interface SurgeryRow {
  '수술일': string | number;
  '환자명'?: string;
  '제조사'?: string;
  '브랜드'?: string;
  '규격(SIZE)'?: string;
  '규격'?: string;
  '수량'?: string | number;
  '수술기록'?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ParsedSurgery {
  date: string;            // YYYY-MM-DD
  patientName: string;
  manufacturer: string;
  brand: string;
  size: string;
  quantity: number;
  rawRow: SurgeryRow;
}

export function parseSurgeryRow(row: SurgeryRow): ParsedSurgery | null {
  // 수술일 필드 파싱 (숫자 → Excel 시리얼 날짜 변환 포함)
  // 환자명, 제조사 등 필드 추출
  // 유효하지 않은 행 → null 반환
}
```

### 변경 파일
- `services/surgeryParser.ts` (신규)
- 기존 중복 로직 사용 파일들 (분석 후 결정)

---

## 5. FR-04: SurgeryRow / FixtureRow 타입 정의

### 현재 상태

```typescript
// types.ts
export interface ExcelRow {
  [key: string]: any;  // ← any 타입
}
```

### 설계

`ExcelRow`는 유연성을 위해 `any` 인덱스 시그니처를 유지하되, 구체적인 도메인 타입을 추가:

```typescript
// types.ts 에 추가 (또는 services/excelTypes.ts 신규)

/** 재고(Fixture) 엑셀 행 — 알려진 컬럼 명시 */
export interface FixtureRow {
  '제조사'?: string;
  '브랜드'?: string;
  '규격(SIZE)'?: string;
  '규격'?: string;
  '사이즈'?: string;
  '수량'?: string | number;
  '사용안함'?: boolean;
  '발주수량'?: string | number;
  [key: string]: string | number | boolean | undefined;
}

/** 수술기록 엑셀 행 — 알려진 컬럼 명시 */
export interface SurgeryRow {
  '수술일'?: string | number;
  '환자명'?: string;
  '제조사'?: string;
  '브랜드'?: string;
  '규격(SIZE)'?: string;
  '규격'?: string;
  '수량'?: string | number;
  '수술기록'?: string;
  [key: string]: string | number | boolean | undefined;
}
```

**배치 위치**: `types.ts` 기존 `ExcelRow` 아래에 추가. 별도 파일은 import 경로 증가로 오버엔지니어링.

---

## 6. 파일 변경 요약

| 파일 | 변경 종류 | 내용 |
|------|----------|------|
| `hooks/useAppState.ts` | 수정 | line 55: alert() → no-op |
| `services/cryptoUtils.ts` | 수정 | 보안 주석 강화 |
| `.env.example` | 수정 | VITE_PATIENT_DATA_KEY 경고 추가 |
| `types.ts` | 수정 | FixtureRow, SurgeryRow 타입 추가 |
| `services/surgeryParser.ts` | 신규 | 수술기록 파싱 함수 |

---

## 7. 구현 순서 (Do Phase Checklist)

```
[ ] Step 1: hooks/useAppState.ts — alert() 폴백 제거 (5분)
[ ] Step 2: types.ts — FixtureRow, SurgeryRow 타입 추가 (15분)
[ ] Step 3: services/surgeryParser.ts — 신규 파서 구현 (30분)
[ ] Step 4: 기존 코드에서 SurgeryRow 타입 적용 (15분)
[ ] Step 5: cryptoUtils.ts + .env.example 주석 강화 (10분)
[ ] Step 6: TypeScript 빌드 확인 (5분)
```

---

## 8. 검증 기준 (Gap Analysis 기준)

| 항목 | 검증 방법 |
|------|----------|
| alert() 0건 | `grep -r "alert(" --include="*.ts" --include="*.tsx"` |
| SurgeryRow 타입 존재 | `types.ts`에서 interface 확인 |
| FixtureRow 타입 존재 | `types.ts`에서 interface 확인 |
| surgeryParser.ts 존재 | 파일 존재 + export 확인 |
| 빌드 성공 | `npm run build` 에러 0건 |
