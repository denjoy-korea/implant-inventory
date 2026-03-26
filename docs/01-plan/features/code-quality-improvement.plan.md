# Plan: code-quality-improvement

## 목표
코드 품질 점수 **72/100 → 90/100** 달성

## 현재 vs 목표 점수

| 항목 | 현재 | 목표 | 가중치 | 현재 기여 | 목표 기여 |
|------|------|------|--------|----------|----------|
| 코드 완성도 | 8/10 | 9/10 | 10% | 0.80 | 0.90 |
| **아키텍처 품질** | **6/10** | **9/10** | **20%** | 1.20 | **1.80** |
| 타입 안전성 | 8/10 | 9/10 | 10% | 0.80 | 0.90 |
| 에러 핸들링 | 7/10 | 9/10 | 10% | 0.70 | 0.90 |
| **성능** | **6/10** | **9/10** | **15%** | 0.90 | **1.35** |
| **테스트 커버리지** | **5/10** | **9/10** | **15%** | 0.75 | **1.35** |
| 코드 중복 | 7/10 | 9/10 | 10% | 0.70 | 0.90 |
| 프로덕션 준비도 | 8/10 | 9/10 | 10% | 0.80 | 0.90 |
| **합계** | **72** | **90** | 100% | 6.65 | **8.95→90** |

## 점수 달성 전략

72 → 90 = **+18점** 필요.
최대 ROI 3개 영역에 집중:
- 테스트 커버리지 5→9: **+0.60점** (15% 가중)
- 아키텍처 6→9: **+0.60점** (20% 가중)
- 성능 6→9: **+0.45점** (15% 가중)
- 나머지 5개 항목 각 +0.1~0.2점

## 요구사항 (P1 → P2 → P3 순)

### P1 — 테스트 인프라 (5→9, +0.60점) [최우선]

> **Vitest 전략: 이관(migration) ❌ → 추가(additive) ✅**
> 기존 137개 `node:test`는 유지한다. 소스 코드 패턴 검사라는 역할 자체는 유효하고 안정적이다.
> 문제는 TypeScript를 직접 import하지 못해 `unit.test.mjs`처럼 로직을 JS로 재구현하는 drift 위험이다.
> Supabase 미의존 순수 유틸 16개(`surgeryParser`, `analysisService`, `sizeNormalizer` 등)부터
> Vitest를 **신규 추가**하여 실제 함수 실행 테스트를 확보한다.
> (`npm run test:unit` 별도 스크립트로 분리, 기존 파이프라인 영향 없음)

| ID | 요구사항 | 완료 기준 |
|----|---------|---------|
| T-01 | Vitest 설치 + `vitest.config.ts` 설정 (기존 node:test와 공존) | `npm run test:unit`으로 Vitest 실행, 기존 `npm run test` 영향 없음 |
| T-02 | 순수 유틸 서비스 16개 TypeScript 직접 import 단위 테스트 | `surgeryParser`, `analysisService`, `sizeNormalizer`, `unregisteredMatchingUtils`, `dateUtils`, `mappers` 등 핵심 유틸 커버 |
| T-03 | `unit.test.mjs` 재구현 로직 → Vitest TypeScript import로 교체 | JS 재구현 코드 삭제, 원본 TS에서 직접 import하여 drift 위험 제거 |
| T-04 | React Testing Library — 핵심 화면 스모크 테스트 | `PricingPage`, `DashboardOverview`, `InventoryManager` 렌더 성공 + 핵심 UI 요소 존재 확인 |
| T-05 | Vitest coverage 측정 (`@vitest/coverage-v8`) | 순수 유틸 커버리지 80%+, 전체 커버리지 리포트 생성 |

### P2 — 아키텍처 / 상태관리 (6→9, +0.60점)

> **실제 파일 크기 재확인**: `useAppLogic.tsx` 726줄 (분석 에이전트 "305줄" 오보), `useAuthForm.ts` 477줄
> **React Router 제약**: `#/` → `/` 전환 시 Vercel rewrites + 현재 공유된 모든 URL 변경 → 별도 마이그레이션 가이드 필요

| ID | 요구사항 | 완료 기준 |
|----|---------|---------|
| A-01 | Zustand 도입: `useAppLogic.tsx`(726줄) 도메인별 분리 | `inventoryStore`, `orderStore`, `failStore`, `authStore` 4개 스토어로 분리, `useAppLogic` 200줄 이하 |
| A-02 | `useAuthForm.ts`(477줄, 28개 useState) → `useReducer` + 3개 분리 | `useSignupForm`, `useLoginForm`, `useMfaForm` 분리, 렌더 횟수 감소 측정 |
| A-03 | React Router v6 도입 | `useHashRouting` 제거, `<Routes>` 적용, `vercel.json` rewrites 추가, 딥링크 동작 확인 |
| A-04 | Admin hook CRUD 추상화: `useAdminUsers`(529줄) + `useAdminContacts`(253줄) | 제네릭 `useAdminTable<T>` 추출, 각 hook 200줄 이하 |

### P3 — 성능 최적화 (6→9, +0.45점)

| ID | 요구사항 | 완료 기준 |
|----|---------|---------|
| P-01 | `useAppLogic` 불필요 리렌더 제거 | React DevTools Profiler로 불필요 리렌더 50% 감소 확인 |
| P-02 | `useAuthForm` 28개 `useState` → `useReducer` 통합 | 렌더 횟수 감소 측정 |
| P-03 | Supabase Realtime 구독 생명주기 검증 | `useEffect` 정리 함수에서 `channel.unsubscribe()` 누락 없음 |
| P-04 | SurgeryDashboard 16개 `useMemo` 프로파일링 → 필요한 것만 유지 | Profiler 기반으로 불필요한 useMemo 제거 |

### P4 — 코드 중복 / 로깅 / 기타 (각 +0.1~0.2점)

| ID | 요구사항 | 완료 기준 |
|----|---------|---------|
| D-01 | Sentry 에러 트래킹 도입 | 프로덕션 에러 자동 수집, console.error 대체 |
| D-02 | 로그 레벨 분리 (dev/prod) | 프로덕션 빌드에서 debug 로그 제거 |
| D-03 | CSP 헤더 강화 (`nonce` 기반 인라인 스크립트 제거) | `vercel.json` CSP 업데이트 |
| D-04 | `useAdminTable<T>` 제네릭 훅으로 60% 코드 중복 제거 | admin hooks 라인 수 40% 감소 |
| D-05 | `ErrorBoundary` + `ChartErrorBoundary` 공통 추상화 | 단일 `<AppErrorBoundary>` 컴포넌트로 통합 |

## 구현 순서 (Phase 구분)

```
Phase 1 (1~2주) — 테스트 인프라 [기존 137개 node:test 건드리지 않음]
  T-01 Vitest 설치 + vitest.config.ts (npm run test:unit 신규)
  T-02 순수 유틸 16개 TypeScript import 단위 테스트
  T-03 unit.test.mjs 재구현 로직 → Vitest TS import로 교체
  T-05 커버리지 측정 (@vitest/coverage-v8)

Phase 2 (2~3주) — 아키텍처 리팩터링
  A-01 Zustand 도입 + useAppLogic.tsx 726줄 분리 (점진적, Big Bang 금지)
  A-02 useAuthForm 477줄 → 3개 분리
  A-04 useAdminTable<T> 추상화

Phase 3 (1~2주) — 성능 + 라우터
  A-03 React Router v6 (vercel.json rewrites 포함)
  P-01 Zustand 도입 후 리렌더 프로파일링
  P-02 useAuthForm useReducer 전환
  P-03 Supabase Realtime 구독 누수 검증
  P-04 SurgeryDashboard useMemo 정리

Phase 4 (1주) — 로깅 + 마무리
  D-01 Sentry 도입 (VITE_SENTRY_DSN 환경변수)
  D-02 로그 레벨 분리 (dev/prod)
  D-03 CSP nonce 강화
  T-04 RTL 컴포넌트 스모크 테스트
```

## 예상 효과

| 작업 | 비용 | 점수 향상 | ROI |
|------|------|---------|-----|
| Vitest 추가 (순수 유틸 16개) | **낮음** | +0.60점 | **최고** (기존 137개 건드리지 않아 위험 없음) |
| 상태관리 분리 (Zustand) | 높음 | +0.60점 | 높음 (726줄 분리, 점진적 접근 필수) |
| 성능 최적화 | 중간 | +0.45점 | 높음 |
| React Router | 중간 | +0.30점 | 중간 (URL 전환 부작용 관리 필요) |
| Sentry + 로깅 | 낮음 | +0.20점 | 중간 |
| Admin 훅 추상화 | 낮음 | +0.20점 | 중간 |

## 비기능 요구사항

- 기존 137개 테스트 전부 유지 (회귀 금지)
- Vite 빌드 시간 3.62s 이하 유지
- TypeScript strict 모드 유지 (`as any` 0건 유지)
- verify:premerge 파이프라인 통과 필수

## 제약 조건

- **Vitest**: 기존 `npm run test` (node:test 137개) 건드리지 않음. `npm run test:unit`으로 분리 운영
  → `verify:premerge`에 `test:unit` 추가 시 기존 137개 통과 확인 후 병합
- **React Router**: `#/` → `/` URL 전환 시 현재 공유된 링크 전부 깨짐
  → Vercel rewrites + 301 redirect 설정으로 구버전 URL 호환 유지
- **Zustand**: `useAppState` 점진적 마이그레이션 (Big Bang 금지)
  → 도메인 1개씩 스토어 이전, 각 이전 후 QA 통과 후 다음 도메인 진행
- **Sentry DSN**: 환경변수 `VITE_SENTRY_DSN`으로 관리 (소스 하드코딩 금지, lint-check.mjs 검증 추가)

## 성공 기준

- [ ] 코드 품질 점수 90/100 이상
- [ ] 테스트 커버리지 60% 이상
- [ ] TypeScript 에러 0건
- [ ] verify:premerge 전체 통과
- [ ] React DevTools Profiler 불필요 리렌더 50% 감소

## 관련 문서

- 분석 리포트: `docs/04-report/features/comprehensive-analysis-2026-03-25.report.md`
- 보안 F-1 수정: `supabase/functions/invite-member/index.ts:140-149`

## 사전 검증 결과 (2026-03-25)

| 항목 | 상태 | 비고 |
|------|------|------|
| Vitest | 미설치 | package.json 확인 — 신규 추가로 진행 |
| Zustand / React Router / Sentry | 미설치 | package.json 확인 |
| useAppLogic.tsx | 726줄 | 분석 에이전트 "305줄" 오보 — 실제 더 큰 작업 |
| useAuthForm.ts | 477줄, 28개 useState | 확인 |
| useAdminUsers.ts | 529줄 | 확인 |
| Vitest 보류 이유 | "이관" 시나리오 기준으로 보류됨 | 지금은 "추가" 시나리오이므로 재도입 타당 |
| 기존 137개 테스트 | 전부 소스 패턴 검사 (실행 없음) | 유지하되 Vitest로 실행 테스트 추가 |

---
*작성일: 2026-03-25*
*수정일: 2026-03-25 (Vitest 전략 수정: 이관→추가, useAppLogic 실제 줄수 반영)*
*단계: Plan*
