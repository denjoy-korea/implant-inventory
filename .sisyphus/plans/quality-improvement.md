# Project Quality Improvement Plan

## TL;DR

> **Quick Summary**: 임플란트 재고관리 시스템의 보안 취약점(xlsx), 테스트 부족, 대형 파일, 타입 안전성, 번들 크기 5가지 영역을 개선한다. xlsx 라이브러리를 클라이언트에서 완전 제거하고 Supabase Edge Function으로 격리하여 보안+번들 동시 해결. 대형 파일(App.tsx, InventoryManager.tsx)을 점진적으로 분리하고, node:test 기반 실행형 테스트를 추가한다.
> 
> **Deliverables**:
> - xlsx 파싱/생성을 담당하는 Supabase Edge Function 2개 (`xlsx-parse`, `xlsx-generate`)
> - 리팩터링된 `excelService.ts` (xlsx 의존성 제거, Edge Function 호출로 전환)
> - 분리된 App.tsx (라우팅/뷰/유틸리티 모듈 추출)
> - 분리된 InventoryManager.tsx (서브 컴포넌트/훅 추출)
> - `as any` 0건 달성
> - 실행형 단위 테스트 추가 (순수 함수 대상)
> - 번들에서 xlsx 청크(429KB) 완전 제거 확인
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 8 → Task 11 → Task 14 → Final

---

## Context

### Original Request
프로젝트 품질 검증 결과를 바탕으로 개선 전략 수립을 요청받았다. `npm run lint && npm run test && npm run build` 모두 통과하지만, 보안/유지보수성/테스트/타입/번들 5개 영역에서 개선이 필요하다.

### Interview Summary
**Key Discussions**:
- **범위**: 5가지 개선 영역 전부 포함
- **xlsx 대응**: 서버사이드 격리 — parseExcelFile + downloadExcelFile 모두 Edge Function 이동
- **리팩터링**: 점진적 분리 — 동작 변경 없이 파일별 순차 추출
- **테스트**: node:test 유지+강화, 새 프레임워크 도입 없음
- **다운로드**: 서버에서 Excel 생성 후 blob으로 클라이언트 전송

**Research Findings**:
- `npm audit`: xlsx@0.18.5 고위험 취약점 2건, fixAvailable=false
- `as any` 5건 (App.tsx 3건, hospitalService.ts 2건), `@ts-ignore` 0건
- 보안 회귀 테스트 16건 전부 pass, 커스텀 lint pass
- fixtureReferenceBase.ts(10555줄)는 이미 동적 import — 분리 불필요

### Metis Review
**Identified Gaps** (addressed):
- **downloadExcelFile 처리**: 서버 생성+blob 다운로드 방식으로 확정
- **analysisService.ts 누락**: parseExcelFile 2회 호출 — 마이그레이션 범위에 포함
- **extractLengthFromSize**: xlsx 의존성 없는 순수 함수 → 별도 유틸 분리 (Edge Function 아님)
- **lint-check.mjs/test 하드코딩**: App.tsx 분리 시 동시 업데이트 의무화
- **Edge Function 제한**: 2MB 요청 제한 + 60초 타임아웃 → 파일 크기 검증 추가
- **generate-fixture-reference-base.mjs**: xlsx를 devDependency로 유지
- **extractLengthFromSize(size: any)**: 파라미터 타입도 `as any` 범위에 포함

---

## Work Objectives

### Core Objective
보안 취약점 제거, 코드 유지보수성 향상, 테스트 커버리지 확대, 타입 안전성 강화, 번들 최적화를 달성한다. 기존 기능의 동작은 100% 보존한다.

### Concrete Deliverables
- `supabase/functions/xlsx-parse/index.ts` — Excel 파싱 Edge Function
- `supabase/functions/xlsx-generate/index.ts` — Excel 생성 Edge Function
- 리팩터링된 `services/excelService.ts` — Edge Function 호출 래퍼
- `services/sizeUtils.ts` — extractLengthFromSize 분리
- `appRouting.ts` — 라우팅 로직 분리
- `components/PausedAccountScreen.tsx` — 인라인 컴포넌트 분리
- `services/inventoryUtils.ts` — InventoryManager 유틸리티 추출
- 실행형 테스트 파일 (순수 함수 대상)
- `as any` 0건 달성된 소스 코드

### Definition of Done
- [ ] `npm run lint` — exit 0
- [ ] `npm run test` — 16건 이상 pass, 0 fail
- [ ] `npm run build` — exit 0, xlsx 청크 없음
- [ ] `npm audit --audit-level=high` — dependencies에 xlsx 없음 (devDependency만)
- [ ] `grep -r "as any" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v dist` — 0건

### Must Have
- xlsx 클라이언트 번들에서 완전 제거
- 기존 기능(엑셀 업로드/다운로드/분석) 동일 동작
- lint-check.mjs + security-regression.test.mjs 통과
- 파일 업로드 시 2MB 제한 검증 + 사용자 안내 메시지

### Must NOT Have (Guardrails)
- 새로운 DB 테이블/RPC 함수 생성 금지
- UI/UX 디자인 변경 금지
- fixtureReferenceBase.ts 분리 금지 (이미 동적 import)
- 상태 관리 구조 변경 금지 (useReducer, Context 전환 등)
- Vitest/Jest 등 새 테스트 프레임워크 도입 금지
- Supabase 타입 자동 생성(supabase gen types) 도입 금지
- `analysisService.ts` 파일 분리 금지 (xlsx 호출 패턴만 변경)
- 스코프 외 파일 리팩터링 금지

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (node:test + node:assert/strict)
- **Automated tests**: Tests-after (구현 후 테스트 추가)
- **Framework**: node:test (기존 유지)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Edge Function**: Bash (curl) — 요청 전송, 상태코드 + 응답 검증
- **클라이언트 서비스**: Bash (node REPL) — import 후 함수 호출, 결과 비교
- **번들 검증**: Bash — `npm run build` 산출물 분석
- **타입 검증**: Bash — `npx tsc --noEmit` + grep 패턴 확인

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — xlsx 서버 마이그레이션 기반):
├── Task 1: extractLengthFromSize 유틸 분리 [quick]
├── Task 2: xlsx-parse Edge Function 생성 [unspecified-high]
├── Task 3: xlsx-generate Edge Function 생성 [unspecified-high]

Wave 2 (After Wave 1 — xlsx 클라이언트 전환 + 파일 분리 시작):
├── Task 4: excelService.ts 리팩터링 (Edge Function 호출로 전환) [deep]
├── Task 5: analysisService.ts xlsx 호출 패턴 전환 [unspecified-high]
├── Task 6: App.tsx 유틸리티/상수 추출 [quick]
├── Task 7: App.tsx 라우팅 로직 분리 [quick]

Wave 3 (After Wave 2 — 파일 분리 계속 + 타입 + 테스트):
├── Task 8: App.tsx lint-check/test 가드 업데이트 [quick]
├── Task 9: InventoryManager.tsx 서브 컴포넌트 추출 [unspecified-high]
├── Task 10: as any 제거 + 타입 안전성 강화 [unspecified-high]
├── Task 11: 실행형 단위 테스트 추가 [unspecified-high]

Wave 4 (After Wave 3 — xlsx 제거 + 번들 검증):
├── Task 12: xlsx를 devDependency로 이동 + package.json 정리 [quick]
├── Task 13: npm test 스크립트 업데이트 (glob 패턴) [quick]
├── Task 14: 최종 번들 검증 + 빌드 확인 [quick]

Wave FINAL (After ALL tasks — 독립 검증, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
├── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 4 → Task 8 → Task 12 → Task 14 → Final
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 4 | 1 |
| 2 | — | 4, 5 | 1 |
| 3 | — | 4 | 1 |
| 4 | 1, 2, 3 | 12 | 2 |
| 5 | 2 | 12 | 2 |
| 6 | — | 7, 8 | 2 |
| 7 | 6 | 8 | 2 |
| 8 | 7 | — | 3 |
| 9 | — | — | 3 |
| 10 | 1, 4 | — | 3 |
| 11 | 1 | 13 | 3 |
| 12 | 4, 5 | 14 | 4 |
| 13 | 11 | 14 | 4 |
| 14 | 12, 13 | Final | 4 |
| F1-F4 | 14 | — | Final |

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `quick`, T2 → `unspecified-high`, T3 → `unspecified-high`
- **Wave 2**: **4** — T4 → `deep`, T5 → `unspecified-high`, T6 → `quick`, T7 → `quick`
- **Wave 3**: **4** — T8 → `quick`, T9 → `unspecified-high`, T10 → `unspecified-high`, T11 → `unspecified-high`
- **Wave 4**: **3** — T12 → `quick`, T13 → `quick`, T14 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. extractLengthFromSize 유틸리티 분리

  **What to do**:
  - `services/excelService.ts`에서 `extractLengthFromSize` 함수를 `services/sizeUtils.ts`로 이동
  - `services/excelService.ts`에서 해당 함수 제거하고 `services/sizeUtils.ts`에서 re-export 또는 직접 import 경로 변경
  - `components/ExcelTable.tsx`, `components/LengthFilter.tsx`의 import 경로를 `services/sizeUtils.ts`로 변경
  - 함수 시그니처의 `(size: any)` 파라미터를 `(size: string | number | null | undefined)` 로 변경

  **Must NOT do**:
  - xlsx 관련 코드 수정 (이 태스크는 순수 함수 분리만)
  - excelService.ts의 parseExcelFile/downloadExcelFile 수정

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 함수 이동 + import 경로 변경, 3-4개 파일 수정
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `vercel-react-best-practices`: 리팩터링이 아닌 단순 파일 이동

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Task 4, Task 10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `services/excelService.ts:13-34` — extractLengthFromSize 함수 전체 (이동 대상)

  **API/Type References**:
  - `types.ts` — ExcelData, ExcelSheet, ExcelRow 타입 (excelService에서 사용, sizeUtils에서는 불필요)

  **External References**: 없음

  **WHY Each Reference Matters**:
  - `excelService.ts:13-34`: 이동할 함수의 전체 코드. 파라미터 타입 변경 시 이 함수의 내부 로직(null check, String 변환)이 새 타입과 호환되는지 확인 필요
  - `ExcelTable.tsx`, `LengthFilter.tsx`: import 경로를 `../services/excelService` → `../services/sizeUtils`로 변경할 파일들

  **Acceptance Criteria**:

  - [ ] `services/sizeUtils.ts` 파일 존재
  - [ ] `extractLengthFromSize` 함수의 파라미터 타입이 `string | number | null | undefined`
  - [ ] `npm run build` — exit 0
  - [ ] `npm run lint` — exit 0

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: sizeUtils에서 extractLengthFromSize 정상 export 확인
    Tool: Bash
    Preconditions: npm run build 성공
    Steps:
      1. grep -n "export const extractLengthFromSize" services/sizeUtils.ts
      2. grep -n "extractLengthFromSize" services/excelService.ts (존재하지 않아야 함)
      3. grep -rn "from.*sizeUtils" components/ExcelTable.tsx components/LengthFilter.tsx
    Expected Result: sizeUtils.ts에 export 존재, excelService.ts에 없음, 컴포넌트에서 sizeUtils import
    Failure Indicators: excelService.ts에 여전히 extractLengthFromSize가 남아있음
    Evidence: .sisyphus/evidence/task-1-sizeutils-export.txt

  Scenario: 파라미터 타입이 any에서 변경되었는지 확인
    Tool: Bash
    Preconditions: Task 1 완료
    Steps:
      1. grep "size: any" services/sizeUtils.ts
      2. grep "size: string | number | null | undefined" services/sizeUtils.ts
    Expected Result: `size: any` 없음, 구체적 타입 존재
    Failure Indicators: `size: any`가 여전히 존재
    Evidence: .sisyphus/evidence/task-1-param-type.txt
  ```

  **Commit**: YES
  - Message: `refactor(services): extract extractLengthFromSize to sizeUtils`
  - Files: `services/sizeUtils.ts`, `services/excelService.ts`, `components/ExcelTable.tsx`, `components/LengthFilter.tsx`
  - Pre-commit: `npm run lint && npm run build`

- [x] 2. xlsx-parse Edge Function 생성

  **What to do**:
  - `supabase/functions/xlsx-parse/index.ts` 생성
  - 기존 `services/excelService.ts`의 `parseExcelFile` 로직을 Deno Edge Function으로 포팅
  - 클라이언트에서 base64 인코딩된 파일 데이터를 받아 JSON(ExcelData 구조)으로 반환
  - 요청 본문 크기 검증 (≤2MB) + 에러 응답
  - CORS 헤더 처리 (기존 Edge Function 패턴 따름)
  - Deno 환경에서 xlsx를 `npm:xlsx` specifier로 import
  - `'사용안함'` 불린 정규화 로직 포함 (기존 parseExcelFile의 비즈니스 로직)

  **Must NOT do**:
  - 새 DB 테이블/RPC 함수 생성
  - 기존 excelService.ts 수정 (Task 4에서 처리)
  - 클라이언트 코드 수정

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Deno Edge Function 작성 + xlsx 포팅 + 에러 처리 + CORS
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `vercel-react-best-practices`: Deno 서버 코드, React 무관

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Task 4, Task 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `supabase/functions/payment-request-proxy/index.ts` — Edge Function CORS + auth 패턴 (Deno.serve, createClient, 헤더 처리)
  - `supabase/functions/payment-callback/index.ts` — Edge Function 요청 검증 + JSON 응답 패턴

  **API/Type References**:
  - `services/excelService.ts:36-77` — parseExcelFile 전체 로직 (포팅 대상)
  - `types.ts:ExcelData, ExcelSheet, ExcelRow` — 반환 JSON 구조

  **External References**:
  - Supabase Edge Functions Deno: `https://supabase.com/docs/guides/functions`
  - xlsx npm specifier in Deno: `npm:xlsx`

  **WHY Each Reference Matters**:
  - `payment-request-proxy/index.ts`: CORS 헤더, Deno.serve 패턴, 에러 응답 형식의 표준. 이 패턴을 그대로 따라야 기존 인프라와 일관성 유지
  - `excelService.ts:36-77`: 포팅할 파싱 로직 전체. FileReader 대신 ArrayBuffer 직접 처리로 변환 필요
  - `types.ts`: 반환 JSON이 이 타입과 1:1 매핑되어야 클라이언트 측 변경 최소화

  **Acceptance Criteria**:

  - [ ] `supabase/functions/xlsx-parse/index.ts` 파일 존재
  - [ ] Deno.serve 패턴 사용
  - [ ] CORS 헤더 처리 포함
  - [ ] 2MB 초과 요청 시 413 상태코드 + 에러 메시지 반환
  - [ ] `npm run build` — exit 0 (기존 빌드 영향 없음)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Edge Function 파일 구조 검증
    Tool: Bash
    Preconditions: Task 2 완료
    Steps:
      1. test -f supabase/functions/xlsx-parse/index.ts && echo "EXISTS"
      2. grep -c "Deno.serve" supabase/functions/xlsx-parse/index.ts
      3. grep -c "Access-Control-Allow-Origin" supabase/functions/xlsx-parse/index.ts
      4. grep -c "사용안함" supabase/functions/xlsx-parse/index.ts
    Expected Result: 파일 존재, Deno.serve 1회, CORS 헤더 존재, 사용안함 정규화 로직 존재
    Failure Indicators: 파일 없음 또는 필수 패턴 누락
    Evidence: .sisyphus/evidence/task-2-edge-function-structure.txt

  Scenario: 2MB 제한 로직 존재 확인
    Tool: Bash
    Preconditions: Task 2 완료
    Steps:
      1. grep -n "2.*MB\|2097152\|2_000_000\|contentLength" supabase/functions/xlsx-parse/index.ts
      2. grep -n "413\|too large\|파일.*크기\|size.*limit" supabase/functions/xlsx-parse/index.ts
    Expected Result: 파일 크기 제한 로직과 413 에러 응답 존재
    Failure Indicators: 크기 검증 로직 없음
    Evidence: .sisyphus/evidence/task-2-size-limit.txt
  ```

  **Commit**: YES
  - Message: `feat(edge): add xlsx-parse edge function for server-side excel parsing`
  - Files: `supabase/functions/xlsx-parse/index.ts`
  - Pre-commit: `npm run build`

- [x] 3. xlsx-generate Edge Function 생성

  **What to do**:
  - `supabase/functions/xlsx-generate/index.ts` 생성
  - 기존 `services/excelService.ts`의 `downloadExcelFile` 로직을 Edge Function으로 포팅
  - 클라이언트에서 JSON 데이터(행, 컬럼, 시트명, 파일명, 선택 인덱스)를 받아 xlsx 바이너리 생성
  - 응답: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` + 바이너리 데이터
  - `사용안함` 체크된 항목 필터링 로직 포함 (기존 downloadExcelFile의 비즈니스 로직)
  - CORS 헤더 처리 (기존 Edge Function 패턴)

  **Must NOT do**:
  - 새 DB 테이블/RPC 함수 생성
  - 기존 excelService.ts 수정 (Task 4에서 처리)
  - 클라이언트 코드 수정

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Deno Edge Function + xlsx 바이너리 생성 + Content-Type 설정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `supabase/functions/payment-request-proxy/index.ts` — Edge Function CORS + Deno.serve 패턴
  - `services/excelService.ts:79-93` — downloadExcelFile 전체 로직 (포팅 대상)

  **API/Type References**:
  - `types.ts:ExcelData, ExcelSheet` — 입력 JSON 구조

  **WHY Each Reference Matters**:
  - `excelService.ts:79-93`: 포팅할 생성 로직. `XLSX.writeFile(workbook, fileName)` 대신 `XLSX.write(workbook, {type:'buffer'})` 로 바이너리 반환으로 변환
  - `payment-request-proxy`: CORS, Deno.serve 패턴 일관성

  **Acceptance Criteria**:

  - [ ] `supabase/functions/xlsx-generate/index.ts` 파일 존재
  - [ ] 바이너리 응답 Content-Type 설정
  - [ ] CORS 헤더 처리 포함
  - [ ] `npm run build` — exit 0

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Edge Function 파일 구조 및 바이너리 응답 검증
    Tool: Bash
    Preconditions: Task 3 완료
    Steps:
      1. test -f supabase/functions/xlsx-generate/index.ts && echo "EXISTS"
      2. grep -c "Deno.serve" supabase/functions/xlsx-generate/index.ts
      3. grep -c "application/vnd.openxmlformats" supabase/functions/xlsx-generate/index.ts
      4. grep -c "사용안함" supabase/functions/xlsx-generate/index.ts
    Expected Result: 파일 존재, Deno.serve, Content-Type, 사용안함 필터링 로직 존재
    Failure Indicators: 파일 없음 또는 바이너리 응답 헤더 누락
    Evidence: .sisyphus/evidence/task-3-edge-function-structure.txt

  Scenario: write 방식이 buffer 반환인지 확인 (writeFile 아님)
    Tool: Bash
    Preconditions: Task 3 완료
    Steps:
      1. grep "XLSX.write(" supabase/functions/xlsx-generate/index.ts
      2. grep "XLSX.writeFile" supabase/functions/xlsx-generate/index.ts (없어야 함)
    Expected Result: XLSX.write 사용, XLSX.writeFile 미사용
    Failure Indicators: writeFile 사용 시 서버에서 파일 시스템 쓰기 시도하게 됨
    Evidence: .sisyphus/evidence/task-3-write-method.txt
  ```

  **Commit**: YES
  - Message: `feat(edge): add xlsx-generate edge function for server-side excel generation`
  - Files: `supabase/functions/xlsx-generate/index.ts`
  - Pre-commit: `npm run build`

- [ ] 4. excelService.ts 리팩터링 (Edge Function 호출로 전환)

  **What to do**:
  - `services/excelService.ts`에서 `parseExcelFile` 수정: File → ArrayBuffer → base64 변환 후 `supabase.functions.invoke('xlsx-parse', { body })` 호출
  - `services/excelService.ts`에서 `downloadExcelFile` 수정: JSON 데이터를 `supabase.functions.invoke('xlsx-generate', { body })` 호출 → blob 수신 → `URL.createObjectURL` + `<a>` 클릭으로 다운로드
  - `loadXlsx()` 함수 및 `type XlsxModule` 제거 (더 이상 클라이언트에서 xlsx 불필요)
  - 파일 업로드 시 2MB 크기 검증 추가 + 한국어 에러 메시지
  - 기존 함수 시그니처(파라미터, 반환 타입) 유지하여 호출부 변경 최소화

  **Must NOT do**:
  - 함수 시그니처 변경 (App.tsx, analysisService.ts 호출부가 의존)
  - extractLengthFromSize 관련 수정 (Task 1에서 완료)
  - UI 코드 수정

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 기존 로직을 Edge Function 호출로 전환하는 핵심 리팩터링. base64 인코딩, blob 다운로드, 에러 핸들링 등 세밀한 작업
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7 — but 5 also depends on 2)
  - **Blocks**: Task 12
  - **Blocked By**: Task 1, Task 2, Task 3

  **References**:

  **Pattern References**:
  - `services/makePaymentService.ts` — `supabase.functions.invoke()` 호출 패턴 (에러 처리 포함)
  - `services/hospitalService.ts:113-131` — `supabase.functions.invoke('invite-member')` 에러 처리 패턴

  **API/Type References**:
  - `services/excelService.ts` — 전체 파일 (리팩터링 대상)
  - `types.ts:ExcelData` — parseExcelFile 반환 타입
  - `services/supabaseClient.ts` 또는 supabase 클라이언트 인스턴스 위치

  **WHY Each Reference Matters**:
  - `makePaymentService.ts`: `supabase.functions.invoke` 호출의 프로젝트 표준 패턴. 에러 추출, 타입 처리 방식을 동일하게 따라야 함
  - `excelService.ts`: 리팩터링 대상 전체. `loadXlsx`, `XlsxModule` 타입, FileReader 사용 등을 Edge Function 호출로 대체

  **Acceptance Criteria**:

  - [ ] `services/excelService.ts`에서 `import('xlsx')` 구문 완전 제거
  - [ ] `parseExcelFile` 함수 시그니처 유지: `(file: File) => Promise<ExcelData>`
  - [ ] `downloadExcelFile` 함수 시그니처 유지: `(data: ExcelData, selectedIndices: Set<number>, fileName: string) => Promise<void>`
  - [ ] 2MB 초과 파일 시 한국어 에러 메시지 throw
  - [ ] `npm run build` — exit 0
  - [ ] `npm run lint` — exit 0

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: xlsx import 완전 제거 확인
    Tool: Bash
    Preconditions: Task 4 완료
    Steps:
      1. grep "import.*xlsx" services/excelService.ts (없어야 함)
      2. grep "loadXlsx\|XlsxModule" services/excelService.ts (없어야 함)
      3. grep "functions.invoke.*xlsx-parse" services/excelService.ts
      4. grep "functions.invoke.*xlsx-generate" services/excelService.ts
    Expected Result: xlsx import 없음, Edge Function invoke 존재
    Failure Indicators: xlsx 관련 import가 남아있음
    Evidence: .sisyphus/evidence/task-4-xlsx-removed.txt

  Scenario: 함수 시그니처 보존 확인
    Tool: Bash
    Preconditions: Task 4 완료
    Steps:
      1. grep "parseExcelFile.*file: File.*Promise<ExcelData>" services/excelService.ts
      2. grep "downloadExcelFile.*data: ExcelData.*selectedIndices.*fileName" services/excelService.ts
    Expected Result: 기존 시그니처 유지
    Failure Indicators: 시그니처 변경됨
    Evidence: .sisyphus/evidence/task-4-signature-preserved.txt

  Scenario: 2MB 제한 클라이언트 검증 로직 확인
    Tool: Bash
    Preconditions: Task 4 완료
    Steps:
      1. grep -n "2.*MB\|2097152\|2_000_000\|size.*limit\|크기" services/excelService.ts
    Expected Result: 파일 크기 검증 로직 존재
    Failure Indicators: 크기 검증 없음
    Evidence: .sisyphus/evidence/task-4-size-validation.txt
  ```

  **Commit**: YES
  - Message: `refactor(services): migrate excelService to use edge functions`
  - Files: `services/excelService.ts`
  - Pre-commit: `npm run lint && npm run build`

- [ ] 5. analysisService.ts xlsx 호출 패턴 전환

  **What to do**:
  - `services/analysisService.ts`에서 `parseExcelFile` 호출부를 확인 — 이미 `excelService.ts`의 함수를 import해서 쓰고 있다면 Task 4 완료 시 자동 전환됨
  - 만약 직접 xlsx를 import하는 경우 `excelService.parseExcelFile`을 사용하도록 변경
  - `npm run build` 통과 확인

  **Must NOT do**:
  - analysisService.ts의 분석 로직 수정
  - 파일 분리/리팩터링

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 의존성 경로 확인 + 필요 시 import 변경
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Task 12
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `services/analysisService.ts:1-10` — import 구문 확인
  - `services/analysisService.ts:133`, `services/analysisService.ts:140` — parseExcelFile 호출부

  **API/Type References**:
  - `services/excelService.ts:parseExcelFile` — 리팩터링된 함수

  **WHY Each Reference Matters**:
  - `analysisService.ts:133,140`: parseExcelFile 호출 2건이 Task 4에서 변경된 excelService를 통해 호출되는지 확인 필요

  **Acceptance Criteria**:

  - [ ] `analysisService.ts`에서 직접 xlsx import 없음
  - [ ] `npm run build` — exit 0

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: analysisService가 xlsx 직접 의존성 없는지 확인
    Tool: Bash
    Preconditions: Task 5 완료
    Steps:
      1. grep "import.*xlsx" services/analysisService.ts (없어야 함)
      2. grep "parseExcelFile" services/analysisService.ts
    Expected Result: xlsx direct import 없음, parseExcelFile은 excelService에서 import
    Failure Indicators: xlsx 직접 import 존재
    Evidence: .sisyphus/evidence/task-5-analysis-xlsx-clean.txt
  ```

  **Commit**: YES (groups with Task 4 if trivial)
  - Message: `refactor(services): migrate analysisService xlsx calls to edge function`
  - Files: `services/analysisService.ts`
  - Pre-commit: `npm run build`

- [ ] 6. App.tsx 유틸리티/상수 추출

  **What to do**:
  - `App.tsx` 상단의 유틸리티 함수들을 별도 파일로 추출:
    - `manufacturerAliasKey()` (App.tsx에서 추출, InventoryManager.tsx의 중복도 이 파일에서 import하도록 변경)
    - 뷰/탭 상수 (`VIEW_*`, `TAB_*` 등이 있다면)
    - 기타 순수 헬퍼 함수
  - 추출 대상 파일: `services/appUtils.ts` 또는 적절한 이름
  - App.tsx와 InventoryManager.tsx 모두에서 새 파일을 import

  **Must NOT do**:
  - 상태 관리 로직(useState, useEffect) 수정
  - 컴포넌트 JSX 구조 변경
  - 라우팅 로직 이동 (Task 7에서 처리)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 상수/함수 추출 + import 경로 변경
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Task 7, Task 8
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `App.tsx:102` — `manufacturerAliasKey` 함수 위치
  - `components/InventoryManager.tsx:~163` — `manufacturerAliasKey` 중복 위치

  **WHY Each Reference Matters**:
  - 두 파일에서 동일 함수가 중복 정의됨. 하나의 유틸리티로 통합 필수

  **Acceptance Criteria**:

  - [ ] `manufacturerAliasKey`가 단일 파일에서만 정의됨
  - [ ] App.tsx와 InventoryManager.tsx 모두 새 파일에서 import
  - [ ] `npm run build` — exit 0, `npm run lint` — exit 0

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: manufacturerAliasKey 중복 제거 확인
    Tool: Bash
    Preconditions: Task 6 완료
    Steps:
      1. grep -rn "function manufacturerAliasKey\|const manufacturerAliasKey" --include="*.ts" --include="*.tsx" . | grep -v node_modules
    Expected Result: 정확히 1개 파일에서만 정의
    Failure Indicators: 2개 이상 파일에서 정의
    Evidence: .sisyphus/evidence/task-6-dedup-alias.txt
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `refactor(app): extract utilities and constants from App.tsx`
  - Files: `services/appUtils.ts`, `App.tsx`, `components/InventoryManager.tsx`
  - Pre-commit: `npm run lint && npm run build`

- [ ] 7. App.tsx 라우팅 로직 분리

  **What to do**:
  - App.tsx의 해시 라우팅 관련 로직(`buildHash`, `parseHash`, 뷰/탭 상수, hash change 이벤트 핸들러)을 `appRouting.ts`로 추출
  - `PausedAccountScreen` 인라인 컴포넌트를 `components/PausedAccountScreen.tsx`로 분리
  - App.tsx에서 새 모듈들을 import

  **Must NOT do**:
  - 라우팅 동작 변경
  - 상태 관리 구조 변경
  - useAppState 훅 수정

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 코드 이동 + import 정리
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (Task 6 이후)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 8
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `App.tsx:459+` — `/* ── Hash Routing: State → URL ── */` 섹션
  - `hooks/useAppState.ts` — 이미 분리된 상태 관리 훅 (참고 패턴)

  **WHY Each Reference Matters**:
  - `App.tsx:459+`: 추출 대상 코드의 시작점. 라우팅 관련 함수/상수를 식별하는 기준

  **Acceptance Criteria**:

  - [ ] `appRouting.ts` 파일 존재
  - [ ] `components/PausedAccountScreen.tsx` 파일 존재
  - [ ] App.tsx 줄 수 감소 (최소 200줄 이상)
  - [ ] `npm run build` — exit 0, `npm run lint` — exit 0

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: App.tsx 줄 수 감소 확인
    Tool: Bash
    Preconditions: Task 7 완료
    Steps:
      1. wc -l App.tsx
      2. test -f appRouting.ts && echo "EXISTS"
      3. test -f components/PausedAccountScreen.tsx && echo "EXISTS"
    Expected Result: App.tsx < 2645줄 (200줄 이상 감소), 새 파일들 존재
    Failure Indicators: App.tsx 줄 수 변화 없음
    Evidence: .sisyphus/evidence/task-7-app-split.txt
  ```

  **Commit**: YES (groups with Task 6)
  - Message: `refactor(app): extract routing logic and PausedAccountScreen from App.tsx`
  - Files: `appRouting.ts`, `components/PausedAccountScreen.tsx`, `App.tsx`
  - Pre-commit: `npm run lint && npm run build`

- [ ] 8. lint-check/test 가드 업데이트 (App.tsx 분리 대응)

  **What to do**:
  - `scripts/lint-check.mjs`의 `checkMaintenanceServiceWiring()` 함수 수정:
    - `read('App.tsx')` 대신 분리된 파일 경로에서도 패턴을 찾도록 업데이트
    - 또는 App.tsx에 여전히 해당 패턴이 존재하면 경로 유지 (분리 결과에 따라 판단)
  - `scripts/security-regression.test.mjs`의 `maintenance service is wired for dev operations` 테스트 수정:
    - 같은 원칙: 분리 후 패턴이 존재하는 파일 경로로 업데이트
  - 둘 다 분리 후 상태에서 `npm run lint && npm run test` 통과 확인

  **Must NOT do**:
  - 검증 로직 삭제/약화
  - 새 검증 패턴 추가 (기존 가드 유지만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 파일 경로 참조 업데이트
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (순차)
  - **Blocks**: None
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `scripts/lint-check.mjs:165-195` — checkMaintenanceServiceWiring 함수 전체
  - `scripts/security-regression.test.mjs:120-131` — maintenance service 테스트

  **WHY Each Reference Matters**:
  - `lint-check.mjs:166`: `read('App.tsx')`가 하드코딩됨. App.tsx에서 maintenance service import가 이동했으면 경로 변경 필수
  - `security-regression.test.mjs:122`: 같은 하드코딩 패턴

  **Acceptance Criteria**:

  - [ ] `npm run lint` — exit 0, "Custom lint checks passed."
  - [ ] `npm run test` — 16건 pass, 0 fail

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 기존 검증 가드 전부 통과
    Tool: Bash
    Preconditions: Task 8 완료
    Steps:
      1. npm run lint
      2. npm run test
    Expected Result: lint 통과 + 테스트 16건 pass 0 fail
    Failure Indicators: lint 또는 test 실패
    Evidence: .sisyphus/evidence/task-8-guards-pass.txt
  ```

  **Commit**: YES
  - Message: `fix(scripts): update lint-check and tests for App.tsx split`
  - Files: `scripts/lint-check.mjs`, `scripts/security-regression.test.mjs`
  - Pre-commit: `npm run lint && npm run test`

- [ ] 9. InventoryManager.tsx 서브 컴포넌트 추출

  **What to do**:
  - `components/InventoryManager.tsx` (2852줄)에서 독립적인 서브 컴포넌트/훅을 추출:
    - 큰 인라인 JSX 블록을 별도 컴포넌트로 분리 (예: 테이블 행, 필터 패널, 모달 등)
    - 복잡한 useEffect/useCallback을 커스텀 훅으로 추출
  - 타겟: InventoryManager.tsx를 2000줄 미만으로 축소
  - 분리된 컴포넌트는 `components/inventory/` 디렉터리에 배치

  **Must NOT do**:
  - 기능 동작 변경
  - 상태 관리 구조 변경
  - prop drilling 과도한 도입 (기존 패턴 유지)
  - fixtureReferenceBase.ts 분리

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 2852줄 파일 분석 + 안전한 추출 지점 식별 + 다중 파일 생성
  - **Skills**: [`vercel-react-best-practices`]
    - `vercel-react-best-practices`: 컴포넌트 분리 시 렌더링 최적화 패턴 참고

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 10, 11)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `components/InventoryManager.tsx` — 전체 파일 (분석 대상)
  - `hooks/useAppState.ts` — 커스텀 훅 추출 패턴 참고

  **WHY Each Reference Matters**:
  - `InventoryManager.tsx`: 어디를 잘라야 하는지 파일 전체 분석 필요. JSX return 내의 독립 섹션 식별
  - `useAppState.ts`: 이 프로젝트에서 훅 추출을 어떤 패턴으로 하는지 참고

  **Acceptance Criteria**:

  - [ ] `InventoryManager.tsx` < 2000줄
  - [ ] `components/inventory/` 디렉터리에 1개 이상 서브 컴포넌트 존재
  - [ ] `npm run build` — exit 0, `npm run lint` — exit 0

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: InventoryManager 줄 수 감소 + 서브 컴포넌트 존재
    Tool: Bash
    Preconditions: Task 9 완료
    Steps:
      1. wc -l components/InventoryManager.tsx
      2. ls components/inventory/ | wc -l
      3. npm run build
    Expected Result: InventoryManager.tsx < 2000줄, inventory/ 내 1개 이상 파일, 빌드 성공
    Failure Indicators: 줄 수 미감소 또는 빌드 실패
    Evidence: .sisyphus/evidence/task-9-inventory-split.txt
  ```

  **Commit**: YES
  - Message: `refactor(components): extract sub-components from InventoryManager`
  - Files: `components/InventoryManager.tsx`, `components/inventory/*.tsx`
  - Pre-commit: `npm run lint && npm run build`

- [ ] 10. as any 제거 + 타입 안전성 강화

  **What to do**:
  - `services/hospitalService.ts:122,216` — `(error as any).context?.json?.()` 수정:
    - Supabase `FunctionsHttpError` 타입을 import하거나 커스텀 타입 정의
    - `error instanceof FunctionsHttpError` 타입 가드 사용 또는 `error` 파라미터에 적절한 타입 지정
  - `App.tsx:410` — `(data.hospitals as any)?.name` 수정:
    - Supabase relation query 결과에 대한 타입 정의
    - `data.hospitals`를 `{ name: string } | null` 등으로 타이핑
  - `App.tsx:436,438` — `(globalThis as any).__securityMaintenanceService` 수정:
    - `declare global { var __securityMaintenanceService: typeof securityMaintenanceService | undefined }` 선언
  - `services/sizeUtils.ts` — Task 1에서 이미 `size: any` → 구체적 타입으로 변경 완료 확인

  **Must NOT do**:
  - Supabase 타입 자동 생성 도입
  - 타입을 `unknown`으로만 바꾸고 로직 수정 없이 방치

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Supabase 타입 시스템 이해 + 안전한 타입 가드 작성
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 11)
  - **Blocks**: None
  - **Blocked By**: Task 1, Task 4

  **References**:

  **Pattern References**:
  - `App.tsx:410` — Supabase relation query `as any` 위치
  - `App.tsx:436,438` — globalThis `as any` 위치
  - `services/hospitalService.ts:122,216` — FunctionsHttpError `as any` 위치

  **API/Type References**:
  - `@supabase/supabase-js` — FunctionsHttpError 타입 (node_modules에서 확인)

  **WHY Each Reference Matters**:
  - `hospitalService.ts:122,216`: 동일 패턴 2회 반복. 하나의 타입 정의로 둘 다 해결
  - `App.tsx:410`: Supabase `.select('hospitals(name)')` 결과의 타입 추론 한계. 수동 타입 필요

  **Acceptance Criteria**:

  - [ ] `grep -r "as any" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v dist | wc -l` — 0
  - [ ] `npm run build` — exit 0 (타입 에러 없음)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: as any 완전 제거 확인
    Tool: Bash
    Preconditions: Task 10 완료
    Steps:
      1. grep -rn "as any" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v dist
      2. npx tsc --noEmit
    Expected Result: grep 결과 0건, tsc 에러 없음
    Failure Indicators: as any 잔존 또는 타입 에러
    Evidence: .sisyphus/evidence/task-10-no-as-any.txt

  Scenario: FunctionsHttpError 타입 가드 동작 확인
    Tool: Bash
    Preconditions: Task 10 완료
    Steps:
      1. grep -A3 "FunctionsHttpError\|error.*context.*json" services/hospitalService.ts
    Expected Result: 타입 가드 또는 명시적 타입 사용
    Failure Indicators: 여전히 untyped error 접근
    Evidence: .sisyphus/evidence/task-10-type-guard.txt
  ```

  **Commit**: YES
  - Message: `fix(types): remove all as-any casts with proper typing`
  - Files: `App.tsx`, `services/hospitalService.ts`
  - Pre-commit: `npm run lint && npm run build`

- [ ] 11. 실행형 단위 테스트 추가

  **What to do**:
  - 순수 함수 대상으로 node:test 기반 실행형 테스트 작성:
    - `services/sizeUtils.ts` — `extractLengthFromSize` (다양한 입력 패턴)
    - `services/normalizationService.ts` — 정규화 함수들 (존재하면)
    - 기타 순수 함수 (xlsx/DOM/Supabase 의존성 없는 것만)
  - 테스트 파일: `scripts/unit.test.mjs` 또는 `scripts/sizeUtils.test.mjs`
  - node:test + node:assert/strict 사용
  - 실제 함수를 import하여 실행하고 결과를 assert

  **Must NOT do**:
  - Vitest/Jest 등 새 프레임워크 도입
  - 브라우저 의존 코드 테스트 (htmlSanitizer, cryptoUtils)
  - lint-check.mjs와 중복되는 정적 패턴 매칭 테스트
  - 기존 security-regression.test.mjs 수정

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 테스트 가능한 순수 함수 식별 + 엣지 케이스 설계
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9, 10)
  - **Blocks**: Task 13
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `scripts/security-regression.test.mjs` — 기존 테스트 파일 구조 (node:test, node:assert/strict 사용법)
  - `services/sizeUtils.ts` — extractLengthFromSize 테스트 대상

  **WHY Each Reference Matters**:
  - `security-regression.test.mjs`: 이 프로젝트의 테스트 작성 컨벤션. import 스타일, assert 사용법을 따라야 함
  - `sizeUtils.ts`: 테스트 대상 함수. 다양한 입력(null, undefined, "4.5x13", "L10", "410016" 등)에 대한 기대값 설계

  **Acceptance Criteria**:

  - [ ] 최소 1개 새 테스트 파일 존재
  - [ ] 실제 함수 import + 실행 + assert 패턴 사용
  - [ ] `node --test scripts/*.test.mjs` — 새 테스트 포함 전부 pass

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: 실행형 테스트가 실제 함수를 호출하는지 확인
    Tool: Bash
    Preconditions: Task 11 완료
    Steps:
      1. ls scripts/*test*.mjs | wc -l
      2. grep "import.*from.*services\|import.*from.*\.\./" scripts/*test*.mjs | head -5
      3. node --test scripts/*.test.mjs 2>&1 | tail -10
    Expected Result: 2개 이상 테스트 파일, 실제 서비스 import 존재, 전부 pass
    Failure Indicators: 테스트가 패턴 매칭만 하고 실제 함수 미호출
    Evidence: .sisyphus/evidence/task-11-runtime-tests.txt
  ```

  **Commit**: YES
  - Message: `test: add runtime execution tests for pure service functions`
  - Files: `scripts/*.test.mjs`
  - Pre-commit: `node --test scripts/*.test.mjs`

- [ ] 12. xlsx를 devDependency로 이동 + package.json 정리

  **What to do**:
  - `package.json`의 `dependencies`에서 `xlsx` 제거
  - `devDependencies`에 `xlsx` 추가 (generate-fixture-reference-base.mjs 스크립트용)
  - `npm install` 실행하여 lockfile 업데이트
  - `npm audit` 실행하여 prod dependencies에서 xlsx 취약점 사라진 것 확인

  **Must NOT do**:
  - generate-fixture-reference-base.mjs 수정
  - xlsx 버전 변경 (devDependency로 이동만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: package.json 한 줄 이동
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 13)
  - **Blocks**: Task 14
  - **Blocked By**: Task 4, Task 5

  **References**:

  **Pattern References**:
  - `package.json:15-19` — 현재 dependencies
  - `scripts/generate-fixture-reference-base.mjs` — xlsx devDependency 소비자

  **Acceptance Criteria**:

  - [ ] `xlsx`가 `devDependencies`에만 존재
  - [ ] `npm run build` — exit 0
  - [ ] `npm audit --omit=dev` — xlsx 취약점 없음

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: xlsx가 devDependency로 이동 확인
    Tool: Bash
    Preconditions: Task 12 완료
    Steps:
      1. node -e "const p=require('./package.json'); console.log('deps:', !!p.dependencies?.xlsx, 'devDeps:', !!p.devDependencies?.xlsx)"
      2. npm audit --omit=dev --json 2>&1 | grep -c '"xlsx"'
    Expected Result: deps: false, devDeps: true, audit에서 xlsx 없음
    Failure Indicators: xlsx가 여전히 dependencies에 존재
    Evidence: .sisyphus/evidence/task-12-xlsx-devdep.txt
  ```

  **Commit**: YES (groups with Task 13)
  - Message: `chore: move xlsx to devDependency`
  - Files: `package.json`, `package-lock.json`
  - Pre-commit: `npm run build`

- [ ] 13. npm test 스크립트 업데이트 (glob 패턴)

  **What to do**:
  - `package.json`의 `"test"` 스크립트를 단일 파일에서 glob 패턴으로 변경:
    - 기존: `"node --test scripts/security-regression.test.mjs"`
    - 변경: `"node --test scripts/*.test.mjs"`
  - 새로 추가된 테스트 파일(Task 11)이 자동으로 포함되는지 확인

  **Must NOT do**:
  - 테스트 프레임워크 변경
  - 기존 테스트 파일 수정

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: package.json 한 줄 수정
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 12)
  - **Blocks**: Task 14
  - **Blocked By**: Task 11

  **References**:

  **Pattern References**:
  - `package.json:10` — 현재 test 스크립트

  **Acceptance Criteria**:

  - [ ] `npm run test` — 기존 16건 + 새 테스트 전부 pass
  - [ ] `grep '"test"' package.json`에 glob 패턴 포함

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: glob 패턴으로 모든 테스트 파일 실행 확인
    Tool: Bash
    Preconditions: Task 13 완료
    Steps:
      1. npm run test 2>&1 | grep -E "^ℹ tests"
      2. npm run test 2>&1 | grep "fail 0"
    Expected Result: tests > 16, fail 0
    Failure Indicators: 테스트 수가 16 이하 (새 테스트 미포함)
    Evidence: .sisyphus/evidence/task-13-test-glob.txt
  ```

  **Commit**: YES (groups with Task 12)
  - Message: `chore: update test script to glob pattern for all test files`
  - Files: `package.json`
  - Pre-commit: `npm run test`

- [ ] 14. 최종 번들 검증 + 빌드 확인

  **What to do**:
  - `npm run build` 실행하여 최종 번들 산출물 확인
  - `dist/assets/` 내 xlsx 관련 청크가 없는지 검증
  - 전체 번들 크기 비교 (이전 baseline vs 현재)
  - `npm run lint && npm run test` 최종 통과 확인
  - `npm audit --omit=dev` 최종 확인

  **Must NOT do**:
  - 코드 수정 (검증만)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 명령어 실행 + 결과 비교만
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (마지막)
  - **Blocks**: Final Wave
  - **Blocked By**: Task 12, Task 13

  **References**: 없음 (검증만)

  **Acceptance Criteria**:

  - [ ] `npm run build` — exit 0
  - [ ] `dist/assets/` 내 "xlsx" 포함 파일명 없음
  - [ ] `npm run lint` — exit 0
  - [ ] `npm run test` — 전부 pass
  - [ ] `npm audit --omit=dev` — high/critical 0건

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: xlsx 클라이언트 번들 완전 제거 최종 확인
    Tool: Bash
    Preconditions: 전체 태스크 완료
    Steps:
      1. npm run build
      2. ls dist/assets/*.js | xargs grep -l "xlsx" || echo "CLEAN"
      3. ls dist/assets/ | grep -i xlsx || echo "NO_XLSX_CHUNK"
      4. npm run lint
      5. npm run test 2>&1 | tail -8
      6. npm audit --omit=dev --audit-level=high 2>&1 | tail -5
    Expected Result: 빌드 성공, xlsx 청크 없음, lint/test 통과, audit clean
    Failure Indicators: xlsx 청크 잔존 또는 lint/test 실패
    Evidence: .sisyphus/evidence/task-14-final-verification.txt

  Scenario: 번들 크기 개선 확인
    Tool: Bash
    Preconditions: Task 14 빌드 완료
    Steps:
      1. npm run build 2>&1 | grep "dist/assets" | sort -t'│' -k2 -rn | head -10
    Expected Result: 최대 청크가 이전 xlsx 429KB보다 작음 (index ~384KB가 최대)
    Failure Indicators: 429KB 이상 청크 존재
    Evidence: .sisyphus/evidence/task-14-bundle-size.txt
  ```

  **Commit**: NO (검증만)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + `npm run lint` + `npm run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (xlsx upload → server parse → display → server generate → download). Test edge cases: empty file, 2MB+ file, malformed xlsx. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes (new DB tables, UI changes, framework additions).
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Task | Commit Message | Key Files |
|------|---------------|-----------|
| 1 | `refactor(services): extract extractLengthFromSize to sizeUtils` | services/sizeUtils.ts, services/excelService.ts |
| 2 | `feat(edge): add xlsx-parse edge function for server-side excel parsing` | supabase/functions/xlsx-parse/index.ts |
| 3 | `feat(edge): add xlsx-generate edge function for server-side excel generation` | supabase/functions/xlsx-generate/index.ts |
| 4 | `refactor(services): migrate excelService to use edge functions` | services/excelService.ts |
| 5 | `refactor(services): migrate analysisService xlsx calls to edge function` | services/analysisService.ts |
| 6+7 | `refactor(app): extract routing logic and utilities from App.tsx` | appRouting.ts, App.tsx |
| 8 | `fix(scripts): update lint-check and tests for App.tsx split` | scripts/lint-check.mjs, scripts/security-regression.test.mjs |
| 9 | `refactor(components): extract sub-components from InventoryManager` | components/InventoryManager.tsx |
| 10 | `fix(types): remove all as-any casts with proper typing` | App.tsx, services/hospitalService.ts, services/sizeUtils.ts |
| 11 | `test: add runtime execution tests for pure service functions` | scripts/*.test.mjs |
| 12+13 | `chore: move xlsx to devDependency and update test script glob` | package.json |
| 14 | `chore: verify final build with no xlsx client bundle` | (verification only) |

---

## Success Criteria

### Verification Commands
```bash
npm run lint                    # Expected: exit 0, "Custom lint checks passed."
npm run test                    # Expected: ≥17 pass, 0 fail
npm run build                   # Expected: exit 0, no xlsx chunk in dist/assets/
npm audit --audit-level=high    # Expected: xlsx not in prod dependencies
grep -r "as any" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v dist | wc -l  # Expected: 0
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] xlsx completely removed from client bundle
- [ ] Edge Functions deployed and functional
- [ ] File sizes: App.tsx < 1500 lines, InventoryManager.tsx < 2000 lines
