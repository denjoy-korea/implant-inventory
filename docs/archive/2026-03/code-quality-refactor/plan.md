# Plan: code-quality-refactor

## 1. Overview

| 항목 | 내용 |
|------|------|
| Feature | code-quality-refactor |
| Priority | P0 (보안) + P1 (유지보수) |
| Phase | Plan |
| Created | 2026-02-19 |

### 배경

전체 프로젝트 코드 품질 분석(62/100점) 결과 발견된 이슈들을 우선순위별로 수정한다.

- **P0 (Critical)**: 보안 취약점 — 즉시 수정 필요
- **P1 (High)**: 유지보수성 저하 — 이번 스프린트 처리
- **P2 (Medium)**: 성능/코드 품질 — 다음 기회에

---

## 2. Scope

### In Scope (이번에 할 것)

#### P0-1: `useAppState.ts` alert() 폴백 제거
- `useAppState.ts:55` — UI 이벤트 없이 `alert()` 호출 잔존
- ConfirmModal / useToast 패턴으로 교체

#### P0-2: VITE_PATIENT_DATA_KEY 클라이언트 노출 대응
- `VITE_` 접두어 → Vite 빌드 시 클라이언트 번들에 인라인됨
- 환자 데이터 암호화 키가 브라우저 소스에 노출
- **방향**: Supabase Edge Function으로 암·복호화 이전, 또는 키를 서버사이드 환경변수로 이동

#### P1-1: 수술기록 파싱 중복 통합 (`surgeryParser.ts` 추출)
- `ExcelTable.tsx`, `InventoryManager.tsx` 에 90% 동일한 파싱 로직 중복
- `services/surgeryParser.ts`로 분리

#### P1-2: `SurgeryRow` / `FixtureRow` 타입 정의
- 현재 `any` 타입으로 ExcelRow 처리
- `types.ts` 또는 별도 `excelTypes.ts`에 명시적 타입 추가

### Out of Scope (이번에 하지 않을 것)

- App.tsx 모노리스 전체 분해 (규모가 커서 별도 기획)
- O(n×m) 제조사 매칭 최적화 (성능 영향 미미)
- console.log 105건 일괄 제거 (빌드 시 tree-shake 되므로 낮은 우선순위)

---

## 3. Requirements

### FR-01: alert() 제거 (P0)

- `useAppState.ts:55` 의 `alert()` 호출 제거
- useToast 또는 에러 상태로 대체
- 브라우저 native alert가 0건이어야 함

### FR-02: 암호화 키 보안 강화 (P0)

- `VITE_PATIENT_DATA_KEY` 환경변수를 클라이언트 번들에서 제거
- 암호화/복호화 연산을 서버사이드(Edge Function)로 이전
- 또는: 키를 `PATIENT_DATA_KEY` (VITE_ 접두어 제거)로 변경 후 Edge Function에서만 사용
- 클라이언트는 암호화된 데이터만 저장/전달

### FR-03: 파싱 로직 단일화 (P1)

- `services/surgeryParser.ts` 생성
- `parseSurgeryRecord(row: SurgeryRow): ParsedSurgery` 함수 제공
- `parseFixtureData(row: FixtureRow): ParsedFixture` 함수 제공
- ExcelTable.tsx, InventoryManager.tsx에서 import하여 사용

### FR-04: 타입 강화 (P1)

- `types.ts` 또는 `services/excelTypes.ts`에 타입 추가:
  ```typescript
  interface SurgeryRow { /* 수술기록 엑셀 컬럼 */ }
  interface FixtureRow { /* 재고 엑셀 컬럼 */ }
  ```
- `any` 타입 제거율: 목표 80% 이상

---

## 4. Non-Functional Requirements

- 기존 기능 동작 변경 없음 (순수 리팩터링 + 보안 수정)
- TypeScript 컴파일 에러 0건 유지
- 빌드 성공 유지

---

## 5. Implementation Order

```
1. [P0] useAppState.ts alert() 제거           ← 가장 쉽고 빠름
2. [P0] VITE_PATIENT_DATA_KEY 대응            ← 보안 임팩트 최대
3. [P1] SurgeryRow/FixtureRow 타입 정의       ← P1-2 먼저 (P1-1 의존)
4. [P1] surgeryParser.ts 추출                 ← 타입 기반으로 구현
```

---

## 6. Risks

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Edge Function 이전 시 레이턴시 증가 | 중 | 로컬 캐시 전략 검토 |
| 파싱 로직 추출 시 기존 동작 변경 | 중 | 단위 테스트 또는 수동 검증 |
| useAppState 수정 시 상태 흐름 변경 | 낮 | 최소 변경 원칙 |

---

## 7. Success Criteria

- [ ] `alert()` 호출 0건 (grep 검증)
- [ ] `VITE_PATIENT_DATA_KEY` 클라이언트 번들 미포함
- [ ] `surgeryParser.ts` 생성 및 2개 컴포넌트에서 import
- [ ] `SurgeryRow`, `FixtureRow` 타입 정의 완료
- [ ] TypeScript 빌드 성공
- [ ] 기존 기능 정상 동작 확인

---

## 8. Timeline

| 단계 | 작업 | 예상 |
|------|------|------|
| Do-1 | alert() 제거 | 30분 |
| Do-2 | 암호화 키 보안 대응 | 2시간 |
| Do-3 | 타입 정의 + 파서 추출 | 1시간 |
| Check | Gap Analysis | 30분 |
