# Design: code-quality-improvement

> **Plan 참조**: `docs/01-plan/features/code-quality-improvement.plan.md`
> **목표**: 코드 품질 72/100 → 90/100

---

## 사전 조사 결과 (설계 반영)

| 항목 | 실측치 | 설계 영향 |
|------|--------|---------|
| `useAppLogic.tsx` | 726줄, 12개 useState, return 40개 항목 | Zustand 분리 범위 명확화 |
| `useAppState.ts` | 768줄, Realtime 3채널 | 별도 분리 파일로 큼 — Zustand 대상에 포함 |
| Realtime 채널 정리 | inventoryChannel/surgeryChannel/ordersChannel 모두 cleanup 확인 (line 753-756) | **P-03 이슈 없음 — 제외** |
| `vercel.json` | `/(.*) → /index.html` rewrite 이미 존재 | React Router path 라우팅 즉시 가능, 새 rewrite 불필요 |
| 순수 유틸 서비스 | 16개 파일 (Supabase 미의존) | Vitest 1순위 대상 |
| `unit.test.mjs` | sizeUtils 로직 JS 재구현 (drift 위험) | T-03에서 TS import로 교체 |

---

## Phase 1: 테스트 인프라

### T-01: Vitest 설치 및 설정

**신규 파일**: `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',          // 순수 유틸은 DOM 불필요
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['services/**/*.ts', 'utils/**/*.ts'],
      exclude: ['services/supabaseClient.ts', 'services/*Service.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

**package.json 추가 스크립트** (기존 `test` 스크립트 변경 없음):
```json
"test:unit": "vitest run",
"test:unit:watch": "vitest",
"test:unit:coverage": "vitest run --coverage"
```

**설치 패키지**:
```bash
npm install -D vitest @vitest/coverage-v8
# RTL은 Phase 1 후반 (T-04)에서 추가
```

**verify:premerge 파이프라인 업데이트**:
```json
"verify:premerge": "npm run smoke:auto && npm run lint && npm run test && npm run test:unit && npm run build"
```

---

### T-02: 순수 유틸 서비스 TypeScript 단위 테스트

**신규 테스트 디렉토리**: `tests/unit/`

**1순위 대상** (핵심 비즈니스 로직, 높은 버그 위험):

| 파일 | 테스트 파일 | 핵심 테스트 케이스 |
|------|------------|----------------|
| `services/surgeryParser.ts` (76줄) | `tests/unit/surgeryParser.test.ts` | 수술기록 Excel 행 파싱, 규격 추출, 날짜 변환 |
| `services/sizeNormalizer.ts` (335줄) | `tests/unit/sizeNormalizer.test.ts` | 8가지 임플란트 규격 정규화, 엣지 케이스 |
| `services/analysisService.ts` (660줄) | `tests/unit/analysisService.test.ts` | 월별 집계, 요일별 분포, FAIL율 계산 |
| `services/mappers.ts` (464줄) | `tests/unit/mappers.test.ts` | DB 타입 ↔ 프론트 타입 변환 |
| `services/unregisteredMatchingUtils.ts` (81줄) | `tests/unit/unregisteredMatchingUtils.test.ts` | 미등록 수술기록 매칭 알고리즘 |

**2순위 대상**:

| 파일 | 테스트 파일 |
|------|------------|
| `services/dateUtils.ts` (21줄) | `tests/unit/dateUtils.test.ts` |
| `services/normalizationService.ts` (37줄) | `tests/unit/normalizationService.test.ts` |
| `services/fixtureUsageUtils.ts` | `tests/unit/fixtureUsageUtils.test.ts` |
| `services/htmlSanitizer.ts` | `tests/unit/htmlSanitizer.test.ts` |
| `services/appUtils.ts` | `tests/unit/appUtils.test.ts` |

**테스트 패턴**:
```typescript
// tests/unit/surgeryParser.test.ts
import { describe, it, expect } from 'vitest';
import { parseSurgeryRow } from '@/services/surgeryParser';  // TS 직접 import

describe('parseSurgeryRow', () => {
  it('표준 수술기록 행을 파싱한다', () => {
    const row = { '수술일': '2026-01-15', '제조사': 'Osstem', '규격': '4.5x13', ... };
    expect(parseSurgeryRow(row)).toMatchObject({ manufacturer: 'Osstem', size: '4.5x13' });
  });
  it('날짜 형식이 다양해도 처리한다', () => { ... });
  it('필수 필드 누락 시 null 반환', () => { ... });
});
```

---

### T-03: unit.test.mjs 재구현 로직 교체

**현재 문제**: `scripts/unit.test.mjs`가 `sizeUtils.ts`의 `extractLengthFromSize` 함수를 JS로 재구현. 원본 변경 시 테스트가 계속 통과하는 drift 위험.

**변경**:
- `tests/unit/sizeUtils.test.ts` 신규 작성 (TypeScript import)
- `scripts/unit.test.mjs` 내 재구현 로직 삭제, 파일 존재 검사만 남김 (또는 전체 삭제)

```typescript
// tests/unit/sizeUtils.test.ts
import { describe, it, expect } from 'vitest';
import { extractLengthFromSize } from '@/services/sizeUtils';  // 직접 import

describe('extractLengthFromSize', () => {
  it('"4.5x13" → "13"', () => expect(extractLengthFromSize('4.5x13')).toBe('13'));
  it('"L10" → "10"', () => expect(extractLengthFromSize('L10')).toBe('10'));
  // ... 기존 unit.test.mjs 케이스 전부 이식
});
```

---

### T-04: React Testing Library 컴포넌트 스모크 테스트

**추가 설치**:
```bash
npm install -D @testing-library/react @testing-library/user-event jsdom
```

**vitest.config.ts 업데이트** (RTL용):
```typescript
// tests/setup.ts 신규
import '@testing-library/jest-dom';

// vitest.config.ts 업데이트
test: {
  environment: 'jsdom',
  setupFiles: ['./tests/setup.ts'],
  ...
}
```

**스모크 테스트 대상** (렌더 성공 + 핵심 UI 요소 존재 확인):

| 컴포넌트 | 테스트 파일 | 확인 항목 |
|---------|------------|---------|
| `PricingPage` | `tests/components/PricingPage.test.tsx` | 플랜 카드 4개 렌더, 가격 표시, 월/연간 토글 |
| `DashboardOverview` | `tests/components/DashboardOverview.test.tsx` | KPI 섹션 렌더, Plus 잠금 카드 표시 |
| `InventoryManager` | `tests/components/InventoryManager.test.tsx` | 테이블 헤더 렌더, 빈 상태 메시지 |

**Supabase 모킹** (`tests/mocks/supabase.ts`):
```typescript
vi.mock('@/services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn().mockResolvedValue({ data: [], error: null }) })),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));
```

---

### T-05: 커버리지 측정

```bash
npm run test:unit:coverage
# → coverage/index.html 생성
# 목표: 순수 유틸 서비스 80%+
```

`.gitignore` 추가: `coverage/`

---

## Phase 2: 아키텍처 리팩터링

### A-01: Zustand 도입 — useAppLogic/useAppState 분리

**설치**:
```bash
npm install zustand
```

**현재 구조**:
```
App.tsx
├── useAppState.ts (768줄) — AppState, Realtime, 세션
└── useAppLogic.tsx (726줄) — UI 상태, 비즈니스 이벤트 핸들러
```

**목표 구조** (점진적, 도메인 1개씩 이전):
```
App.tsx
├── useAppState.ts (유지, 점진적 축소)
├── useAppLogic.tsx (유지, 점진적 축소)
└── stores/
    ├── authStore.ts       — user, hospitalId, planState, role 파생
    ├── uiStore.ts         — 사이드바, 모달, 토스트, 모바일 내비
    ├── paymentStore.ts    — directPayment, billingProgram
    └── failStore.ts       — pendingFailCandidates
```

**이전 순서** (각 단계 QA 통과 후 다음):

| 단계 | 이전 대상 | 영향 파일 |
|------|---------|---------|
| Step 1 | `uiStore` — 사이드바/모바일 토글 상태 | `useAppLogic.tsx`, `App.tsx`, 사이드바 컴포넌트 |
| Step 2 | `paymentStore` — `directPayment`, `billingProgramSaving` | `useAppLogic.tsx`, `PricingPage`, 결제 관련 컴포넌트 |
| Step 3 | `failStore` — `pendingFailCandidates` | `useAppLogic.tsx`, `FailManager` |
| Step 4 | `authStore` — user/planState (useAppState에서) | `useAppState.ts`, 전체 plan-gated 컴포넌트 |

**각 스토어 패턴**:
```typescript
// stores/uiStore.ts
import { create } from 'zustand';

interface UIState {
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  planLimitToast: LimitType | null;
  setSidebarCollapsed: (v: boolean) => void;
  setMobileMenuOpen: (v: boolean) => void;
  setPlanLimitToast: (v: LimitType | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  isMobileMenuOpen: false,
  planLimitToast: null,
  setSidebarCollapsed: (v) => set({ isSidebarCollapsed: v }),
  setMobileMenuOpen: (v) => set({ isMobileMenuOpen: v }),
  setPlanLimitToast: (v) => set({ planLimitToast: v }),
}));
```

**완료 기준**: `useAppLogic.tsx` 400줄 이하, `useAppState.ts` 400줄 이하 (각 Step 완료 후 측정)

---

### A-02: useAuthForm.ts 분리 (477줄, 28개 useState)

**현재**: `hooks/useAuthForm.ts` 477줄 — signup/login/MFA 로직 전부 혼재

**분리 설계**:

```
hooks/auth/
├── useLoginForm.ts      — email/password 로그인, 에러 처리 (~120줄)
├── useSignupForm.ts     — 회원가입 3단계 (역할선택/정보입력/완료) (~180줄)
├── useMfaForm.ts        — OTP 입력, 재전송 (~80줄)
└── useAuthForm.ts       — 위 3개 re-export (하위 호환 유지)
```

`useAuthForm.ts` 최종:
```typescript
// hooks/useAuthForm.ts (하위 호환 래퍼)
export { useLoginForm } from './auth/useLoginForm';
export { useSignupForm } from './auth/useSignupForm';
export { useMfaForm } from './auth/useMfaForm';
// 기존 useAuthForm 호출부 변경 없이 동작
```

**28개 useState → useReducer 전환** (`useSignupForm` 대상):
```typescript
type SignupAction =
  | { type: 'SET_STEP'; step: 1 | 2 | 3 }
  | { type: 'SET_FIELD'; field: string; value: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' };

function signupReducer(state: SignupState, action: SignupAction): SignupState { ... }
```

---

### A-03: React Router v6 도입

**사전 조사 결과**: `vercel.json`에 `/(.*) → /index.html` rewrite 이미 존재. **새 rewrite 불필요.**

**URL 전환 전략**:
- 기존: `#/dashboard`, `#/pricing` (hash 기반)
- 신규: `/dashboard`, `/pricing` (path 기반)
- 기존 hash URL 호환: 앱 초기화 시 `window.location.hash` 감지 → redirect

**설치**:
```bash
npm install react-router-dom
```

**변경 파일**:

| 파일 | 변경 내용 |
|------|---------|
| `main.tsx` | `<BrowserRouter>` 래핑 추가 |
| `App.tsx` | `<Routes>` + `<Route>` 구조로 변환 |
| `hooks/useHashRouting.ts` | 삭제 (또는 redirect 래퍼로 전환) |
| `appRouting.ts` | Route 설정 객체로 변환 |

**hash → path redirect 처리** (`main.tsx`):
```typescript
// 기존 #/dashboard?foo=bar → /dashboard?foo=bar
if (window.location.hash.startsWith('#/')) {
  const path = window.location.hash.slice(1);
  window.history.replaceState(null, '', path);
}
```

**Route 구조** (`App.tsx`):
```tsx
<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/login" element={<LoginPage />} />
  <Route path="/signup" element={<SignupPage />} />
  <Route path="/pricing" element={<PricingPage />} />
  <Route path="/dashboard/*" element={<DashboardLayout />} />
  <Route path="/admin" element={<ProtectedRoute><SystemAdminDashboard /></ProtectedRoute>} />
  {/* ... */}
</Routes>
```

---

### A-04: useAdminTable<T> 추상화

**현재 중복 패턴** (useAdminUsers 529줄, useAdminContacts 253줄 등):
- 데이터 fetch + 로딩/에러 상태
- 검색어 필터
- 페이지네이션
- 선택/삭제 핸들러

**신규 파일**: `hooks/admin/useAdminTable.ts`
```typescript
interface UseAdminTableOptions<T> {
  fetchFn: (params: { search: string; page: number }) => Promise<{ data: T[]; count: number }>;
  pageSize?: number;
}

export function useAdminTable<T>({ fetchFn, pageSize = 20 }: UseAdminTableOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => { ... }, [fetchFn, search, page]);
  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, error, search, setSearch, page, setPage, total, refresh: fetch };
}
```

**마이그레이션 대상**:
- `useAdminUsers.ts` → `useAdminTable<AdminUser>` 사용, 사용자 특화 로직만 유지 → 200줄 이하
- `useAdminContacts.ts` → `useAdminTable<Contact>` 사용 → 80줄 이하

---

## Phase 3: 성능 최적화

### P-01: Zustand 도입 후 리렌더 측정

**도구**: React DevTools Profiler

**측정 방법**:
1. Zustand 이전 전: 사이드바 토글 시 렌더된 컴포넌트 수 기록
2. `uiStore` 이전 후: 동일 동작 비교
3. **목표**: 사이드바 토글 시 영향받는 컴포넌트 50% 감소

---

### P-02: useAuthForm useReducer 전환

→ A-02 설계에 통합 (`useSignupForm` 내 28개 useState → useReducer)

---

### P-03: Realtime 구독 누수 ~~검증~~ — 제거

**사전 조사 결과**: `useAppState.ts:753-756`에서 3개 채널 모두 정리 확인.
```typescript
return () => {
  supabase.removeChannel(inventoryChannel);  // ✅
  supabase.removeChannel(surgeryChannel);    // ✅
  supabase.removeChannel(ordersChannel);     // ✅
};
```
→ **P-03 이슈 없음. 해당 항목 계획에서 제거.**

---

### P-04: SurgeryDashboard useMemo 정리

**대상**: `components/surgery-dashboard/SurgeryDashboard.tsx` 내 16개 useMemo

**검토 기준**: 아래 조건 모두 해당 시 useMemo 제거
- 계산 비용이 낮음 (단순 필터/정렬)
- 의존성 배열이 자주 바뀌어 캐시 효과 없음

**유지 대상** (비용 높음):
- 월별 집계 계산 (전체 수술기록 순회)
- 히트맵 9×7 그리드 계산
- 제조사별 분류 집계

**제거 후보** (단순 파생값):
- boolean 파생 (`hasSurgeryData`, `isLoading` 등)
- 단순 배열 필터 (조건 1개)

---

## Phase 4: 로깅 + 마무리

### D-01: Sentry 에러 트래킹

**설치**:
```bash
npm install @sentry/react
```

**환경변수** (`.env.example` 추가):
```
VITE_SENTRY_DSN=
VITE_SENTRY_ENV=production
```

**lint-check.mjs 규칙 추가**:
```javascript
// Sentry DSN은 VITE_ prefix OK (공개 키), 단 하드코딩 금지
checkPattern(src, /sentry\.io\/[0-9]+/, 'Sentry DSN must use VITE_SENTRY_DSN env var');
```

**초기화** (`main.tsx`):
```typescript
import * as Sentry from '@sentry/react';
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENV ?? 'development',
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
}
```

**`ErrorBoundary` 연동**:
```typescript
// components/ErrorBoundary.tsx
Sentry.captureException(error);
```

---

### D-02: 로그 레벨 분리

**신규 파일**: `services/logger.ts`
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => { if (isDev) console.log(...args); },
  info:  (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn:  (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => {
    console.error(...args);
    // Sentry 연동 시:
    if (args[0] instanceof Error) Sentry.captureException(args[0]);
  },
};
```

**교체 범위**: `authService.ts`의 28개 console.error/warn 우선, 이후 점진적 교체

---

### D-03: CSP nonce 강화

**현재**: `vercel.json`에 CSP 이미 설정됨

**추가 항목** (`vercel.json` headers 업데이트):
```json
{
  "key": "Content-Security-Policy",
  "value": "... existing ... ; upgrade-insecure-requests"
}
```
> nonce 기반 CSP는 Vercel Edge 환경에서 동적 생성 필요 — SSR 없으므로 `'strict-dynamic'` + hash 방식으로 대안 검토

---

### D-04: useAdminTable<T> → A-04에 통합

### D-05: ErrorBoundary 통합

**현재**: `ErrorBoundary.tsx` + `ChartErrorBoundary.tsx` 중복

**변경**:
```typescript
// components/shared/AppErrorBoundary.tsx
interface Props {
  fallback?: 'page' | 'chart' | 'section';  // 표시 유형
  children: React.ReactNode;
}
```
- `ErrorBoundary.tsx` → `<AppErrorBoundary fallback="page">`로 교체
- `ChartErrorBoundary.tsx` → `<AppErrorBoundary fallback="chart">`로 교체

---

## 파일 변경 요약

### 신규 생성

| 파일 | 목적 |
|------|------|
| `vitest.config.ts` | Vitest 설정 |
| `tests/unit/*.test.ts` | 순수 유틸 단위 테스트 (16개) |
| `tests/components/*.test.tsx` | RTL 스모크 테스트 (3개) |
| `tests/mocks/supabase.ts` | Supabase mock |
| `tests/setup.ts` | RTL jest-dom 설정 |
| `stores/uiStore.ts` | UI 상태 Zustand 스토어 |
| `stores/paymentStore.ts` | 결제 상태 스토어 |
| `stores/failStore.ts` | FAIL 후보 스토어 |
| `stores/authStore.ts` | 인증/플랜 스토어 |
| `hooks/auth/useLoginForm.ts` | 로그인 폼 분리 |
| `hooks/auth/useSignupForm.ts` | 회원가입 폼 분리 |
| `hooks/auth/useMfaForm.ts` | MFA 폼 분리 |
| `hooks/admin/useAdminTable.ts` | 제네릭 어드민 테이블 훅 |
| `services/logger.ts` | 로그 레벨 서비스 |
| `components/shared/AppErrorBoundary.tsx` | 통합 에러 경계 |

### 수정

| 파일 | 변경 내용 |
|------|---------|
| `package.json` | test:unit, test:unit:coverage 스크립트 추가 |
| `hooks/useAppLogic.tsx` | Zustand 이전 후 축소 (726줄 → 400줄 이하) |
| `hooks/useAppState.ts` | Zustand 이전 후 축소 (768줄 → 400줄 이하) |
| `hooks/useAuthForm.ts` | re-export 래퍼로 전환 |
| `hooks/admin/useAdminUsers.ts` | useAdminTable<T> 적용 (529줄 → 200줄) |
| `hooks/admin/useAdminContacts.ts` | useAdminTable<T> 적용 (253줄 → 80줄) |
| `App.tsx` | React Router Routes 구조 + Zustand 스토어 연결 |
| `main.tsx` | BrowserRouter 래핑, hash redirect, Sentry 초기화 |
| `scripts/unit.test.mjs` | 재구현 로직 삭제 |
| `vercel.json` | CSP upgrade-insecure-requests 추가 |

### 삭제

| 파일 | 이유 |
|------|------|
| `hooks/useHashRouting.ts` | React Router 전환 후 불필요 |
| `components/ErrorBoundary.tsx` | AppErrorBoundary로 통합 후 |
| `components/surgery-dashboard/ChartErrorBoundary.tsx` | AppErrorBoundary로 통합 후 |

---

## 예상 점수 달성 경로

| Phase 완료 | 예상 점수 | 주요 기여 |
|-----------|---------|---------|
| Phase 1 완료 | 72 → 80 | 테스트 커버리지 5→8 |
| Phase 2 완료 | 80 → 87 | 아키텍처 6→9, 코드중복 7→9 |
| Phase 3 완료 | 87 → 89 | 성능 6→8 |
| Phase 4 완료 | 89 → **91** | 에러핸들링 7→9, 프로덕션준비도 8→9 |

---

## 구현 금지 사항

- Realtime 구독 cleanup 수정 금지 (P-03 제거 — 이미 정상)
- 기존 `npm run test` (node:test 137개) 스크립트 변경 금지
- Big Bang 마이그레이션 금지 (Zustand, Router 모두 점진적)
- `useHashRouting.ts` 삭제는 React Router 전환 완료 후에만

---
*작성일: 2026-03-25*
*단계: Design*
