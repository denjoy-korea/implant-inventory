# ops-reliability Planning Document

> **Summary**: 결제 실패 처리, 청크 로드 루프 방어, 로그인 타임아웃 race condition, smoke 게이트 커버리지 확장 — 4건의 운영 안정성 패치
>
> **Project**: implant-inventory (DenJOY / DentWeb)
> **Version**: -
> **Author**: -
> **Date**: 2026-03-31
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

코드 분석을 통해 발견된 4건의 운영 안정성 이슈를 수정합니다.
각 이슈는 독립적이며 기능 추가 없이 기존 코드의 버그/취약점을 패치합니다.

### 1.2 Background

- 이슈 1: `tossPaymentService.ts`에서 `!window.TossPayments` 분기 시 `billing_history`를 `cancelled`로 업데이트하지 않아 orphan pending 레코드가 생길 수 있음
- 이슈 2: `index.tsx`의 ChunkLoadError 핸들러가 sessionStorage 카운터 없이 무한 `window.location.reload()` 루프에 빠질 수 있음
- 이슈 3: `authService.ts`의 `Promise.race` 로그인 타임아웃 이후 실제 `SIGNED_IN` 이벤트가 발화되어 폼 상태와 실제 로그인 상태가 불일치할 수 있음
- 이슈 4: `smoke-auto.mjs`가 `xlsx-parse`/`xlsx-generate` 두 함수만 검증하여 결제·인증·암호화 핵심 Edge Function이 배포 게이트에서 누락됨

### 1.3 관련 파일

- `services/tossPaymentService.ts:277`
- `index.tsx:8–18`
- `services/authService.ts:488`
- `hooks/useAuthForm.ts:384`
- `scripts/smoke-auto.mjs:13`
- `scripts/check-edge-functions.mjs`

---

## 2. Scope

### 2.1 In Scope

- [ ] [이슈 1] `!window.TossPayments` 분기에 `billing_history` 취소 처리 추가
- [ ] [이슈 2] ChunkLoadError 핸들러에 sessionStorage 기반 리로드 횟수 제한 추가 (최대 3회)
- [ ] [이슈 3] 로그인 타임아웃 후 SIGNED_IN 이벤트를 무시하는 플래그 처리 추가
- [ ] [이슈 4] smoke-auto.mjs에 핵심 Edge Function 검증 항목 추가

### 2.2 Out of Scope

- 세션 만료 + `/payment/fail` 경우의 orphan row (RLS 제약으로 클라이언트에서 처리 불가 — 별도 DB 레벨 cleanup job 필요)
- Supabase `signInWithPassword` 요청 자체의 cancel (fetch AbortController는 Supabase SDK 내부 구현 제약)
- 전체 E2E 테스트 자동화 (브라우저 환경 필요)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 상태 |
|----|---------|---------|------|
| FR-01 | `!window.TossPayments` 분기에서 billingId가 있으면 `billing_history`를 `cancelled`로 업데이트 후 에러 반환 | High | Pending |
| FR-02 | ChunkLoadError 발생 시 sessionStorage `_chunkReloadCount`를 증가시키고 3회 초과 시 reload 중단, 안내 메시지 표시 | Medium | Pending |
| FR-03 | 로그인 타임아웃 발생 시 `timedOut` 플래그를 set하여 이후 SIGNED_IN 이벤트에서 자동 리다이렉트를 억제 | Medium | Pending |
| FR-04 | smoke-auto.mjs에 `toss-payment-confirm`, `crypto-service`, `notify-signup`, `auth-send-email` Edge Function 검증 추가 | High | Pending |

### 3.2 Non-Functional Requirements

| 카테고리 | 기준 | 검증 방법 |
|---------|------|---------|
| 안정성 | 기존 테스트 126개 전부 통과 유지 | `npm test` |
| 빌드 | TypeScript 오류 없음 | `npm run typecheck` |
| 연기 | 신규 smoke 게이트 CI 통과 | `npm run smoke:edge:strict` |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] FR-01~FR-04 모두 구현
- [ ] `npm run typecheck` 통과
- [ ] `npm test` 126개 이상 통과
- [ ] `npm run build` 통과
- [ ] `npm run verify:premerge` 통과

### 4.2 Quality Criteria

- [ ] 신규 코드 줄 수 최소화 (각 이슈 10줄 이하)
- [ ] 기존 동작 변경 없음 (정상 경로 영향 없음)

---

## 5. Risks and Mitigation

| 리스크 | 영향 | 가능성 | 대응 |
|--------|------|--------|------|
| `billing_history` 취소 처리가 네트워크 오류로 실패 | Low | Low | fire-and-forget 유지, 실패 시 로그만 남김 |
| ChunkLoad 카운터가 sessionStorage 불지원 환경에서 오작동 | Low | Very Low | try-catch로 감싸 fallback으로 reload 허용 |
| smoke 확장 후 신규 함수가 CI에서 404 → 파이프라인 차단 | Medium | Low | 환경변수 없으면 SKIP 유지 (기존 패턴 동일) |
| 로그인 race 플래그가 정상 로그인 흐름 차단 | High | Low | 타임아웃 발생 시에만 플래그 set, 정상 완료 시 적용 안 됨 |

---

## 6. Architecture Considerations

### 6.1 Project Level

**Dynamic** — 기존 프로젝트 구조 유지, 신규 파일 생성 없음

### 6.2 수정 대상 파일 및 접근 방식

| 파일 | 수정 방식 | 예상 변경 |
|------|---------|---------|
| `services/tossPaymentService.ts` | `!window.TossPayments` 분기에 async DB 업데이트 추가 | +6줄 |
| `index.tsx` | ChunkLoad 핸들러에 sessionStorage 카운터 로직 추가 | +8줄 |
| `services/authService.ts` | `timedOut` 플래그 선언 및 catch 블록 내 set | +3줄 |
| `hooks/useAuthForm.ts` | SIGNED_IN 이벤트 핸들러에서 `timedOut` 플래그 확인 | +4줄 |
| `scripts/smoke-auto.mjs` | checks 배열에 핵심 Edge Function 항목 추가 | +4줄 |
| `scripts/check-edge-functions.mjs` | 검증 대상 함수 목록에 신규 함수 추가 | +4줄 |

---

## 7. Convention Prerequisites

- [x] `CLAUDE.md` 존재 (Edge Function 배포 규칙 포함)
- [x] TypeScript + ESLint 설정 (`tsconfig.json`)
- [x] `verify:premerge` 파이프라인 존재

### 7.1 Environment Variables (신규 없음)

이번 패치에서 신규 환경변수는 필요하지 않습니다.
smoke 확장도 기존 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 환경변수를 재사용합니다.

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`ops-reliability.design.md`) — 각 이슈별 Before/After 코드 스펙 정의
2. [ ] 구현 (Do phase) — 파일별 최소 수정
3. [ ] Gap analysis (`/pdca analyze ops-reliability`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-31 | Initial draft | - |
