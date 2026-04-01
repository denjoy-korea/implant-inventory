# ops-reliability Design Document

> **Summary**: 결제 billing orphan, ChunkLoad 루프, 로그인 race condition, smoke 게이트 커버리지 — 4건 운영 안정성 패치 상세 설계
>
> **Project**: implant-inventory (DenJOY / DentWeb)
> **Date**: 2026-03-31
> **Status**: Draft
> **Planning Doc**: [ops-reliability.plan.md](../../01-plan/features/ops-reliability.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- 각 이슈를 **최소 변경(+10줄 이하)**으로 수정
- 정상 경로(happy path)에 영향 없음
- 기존 테스트 126개 전부 통과 유지
- 신규 파일 생성 없음 — 기존 파일만 수정

### 1.2 Design Principles

- 최소 침습(Minimal Invasion): 버그 지점만 수정, 주변 리팩터링 금지
- 안전 우선: 에러 처리는 fire-and-forget / silent fail 허용 (정상 UX 차단 방지)
- 검증 가능성: 각 수정 후 `npm run verify:premerge` 통과로 확인

---

## 2. 이슈별 상세 설계

---

### FR-01: `!window.TossPayments` 분기 billing 취소 처리 누락

**파일**: `services/tossPaymentService.ts:277`

**문제 분석**

```
loadTossSdk() 성공
  └─ SDK catch 블록 (267-274): billing 취소 처리 ✅
  └─ !window.TossPayments (277-279): billing 취소 처리 ❌ ← gap
  └─ window.TossPayments 존재: 정상 흐름 ✅
```

`loadTossSdk()`가 reject 없이 resolve됐지만 `window.TossPayments`가 falsy인 경우
(SDK 로드 타이밍 이슈, iframe sandbox 환경 등) billingId가 `pending` 상태로 방치됨.

**Before**

```typescript
if (!window.TossPayments) {
  return { error: 'TossPayments SDK를 사용할 수 없습니다.' };
}
```

**After**

```typescript
if (!window.TossPayments) {
  // billing record 취소 처리 (SDK가 비어 있으면 결제 진행 불가)
  await supabase
    .from('billing_history')
    .update({ payment_status: 'cancelled' })
    .eq('id', billingId)
    .eq('payment_status', 'pending');
  return { error: 'TossPayments SDK를 사용할 수 없습니다.' };
}
```

**변경 규모**: +4줄
**영향 범위**: `!window.TossPayments` 분기만 — 정상 흐름 무영향
**에러 처리**: await 실패 시 에러를 throw하지 않고 자연 전파 (호출부 catch가 처리)

---

### FR-02: ChunkLoadError 무한 리로드 방어

**파일**: `index.tsx:8–18`

**문제 분석**

```
배포 후 청크 해시 불일치
  └─ error 이벤트 발화 → window.location.reload()
  └─ reload 후에도 불일치 유지 (비정상 배포/CDN 캐시)
  └─ 무한 루프 ← gap
```

정상 Vercel 배포에서는 1회 리로드로 해결되지만, 배포가 깨진 경우
사용자가 무한 화이트스크린 루프에 빠질 수 있음.

**Before**

```typescript
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  ) {
    window.location.reload();
  }
});
```

**After**

```typescript
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError')
  ) {
    try {
      const key = '_chunkReloadCount';
      const count = Number(sessionStorage.getItem(key) || '0');
      if (count >= 3) {
        // 3회 초과: 루프 중단, 사용자에게 안내
        console.error('[ChunkLoad] 반복 실패 — 자동 새로고침 중단. 브라우저 캐시를 지우고 다시 시도해주세요.');
        return;
      }
      sessionStorage.setItem(key, String(count + 1));
    } catch {
      // sessionStorage 사용 불가 환경: 기존 동작 유지
    }
    window.location.reload();
  }
});
```

**변경 규모**: +10줄
**영향 범위**: 정상 배포에서는 count=0 → count=1로 증가 후 1회 리로드, 이후 성공하면 카운터는 자연 만료(탭 닫힘)
**카운터 TTL**: sessionStorage는 탭 단위로 격리됨 — 새 탭/브라우저 재시작 시 초기화
**fallback**: try-catch로 sessionStorage 사용 불가 환경에서도 기존 동작 유지

---

### FR-03: 로그인 타임아웃 후 SIGNED_IN race condition

**파일**: `services/authService.ts:488` + `hooks/useAppState.ts:556`

**문제 분석**

```
signIn() 호출
  ├─ 10초 타임아웃 → catch → { success: false } 반환 → 폼 에러 표시
  └─ (원래 요청 계속 진행 중)
     └─ 11초에 Supabase 응답 성공
        └─ SIGNED_IN 이벤트 발화 → useAppState SIGNED_IN 핸들러 실행
           └─ loadHospitalData → currentView = 'dashboard' ← gap
```

사용자는 에러를 봤지만 실제로는 로그인 상태가 됨.
기존 중복 방지 로직(`initSessionHandledRef`, `signedInInFlightRef`, 800ms throttle)은
타임아웃 후 늦게 오는 SIGNED_IN을 막지 못함.

**설계 접근**

`authService` 객체에 모듈 레벨 플래그를 추가해 타임아웃 발생 여부를 신호 전달.
`useAppState.ts` SIGNED_IN 핸들러에서 플래그를 체크해 늦은 세션을 즉시 signOut 처리.

**authService.ts — Before**

```typescript
async signIn(email: string, password: string): Promise<AuthResult> {
  clearProfileLookupCache();
  let authError: Error | null = null;
  try {
    const { error } = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('네트워크 응답이 없습니다. 잠시 후 다시 시도해주세요.')), 10_000)
      ),
    ]);
    authError = error;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.' };
  }
  // ...
```

**authService.ts — After**

모듈 상단(객체 선언 바깥)에 플래그 추가:
```typescript
// 로그인 타임아웃 후 늦게 오는 SIGNED_IN 이벤트를 무시하기 위한 플래그
let _loginTimedOut = false;
```

`signIn` 메서드 수정:
```typescript
async signIn(email: string, password: string): Promise<AuthResult> {
  clearProfileLookupCache();
  _loginTimedOut = false; // 재시도 시 이전 타임아웃 플래그 초기화
  let authError: Error | null = null;
  try {
    const { error } = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
      new Promise<never>((_, reject) =>
        setTimeout(() => {
          _loginTimedOut = true;
          reject(new Error('네트워크 응답이 없습니다. 잠시 후 다시 시도해주세요.'));
        }, 10_000)
      ),
    ]);
    authError = error;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.' };
  }
  // ...
```

`authService` 객체에 메서드 추가:
```typescript
/** 로그인 타임아웃 플래그를 소비(consume)하고 반환 — SIGNED_IN 핸들러에서 호출 */
consumeLoginTimedOut(): boolean {
  const v = _loginTimedOut;
  _loginTimedOut = false;
  return v;
},
```

**useAppState.ts — After** (`SIGNED_IN` 핸들러 진입부에 추가)

```typescript
if (event === 'SIGNED_IN') {
  if (initSessionHandledRef.current) return;
  // 로그인 타임아웃 후 늦게 도달한 SIGNED_IN: 세션을 즉시 폐기
  if (authService.consumeLoginTimedOut()) {
    void supabase.auth.signOut();
    return;
  }
  // 이하 기존 코드 유지...
```

**변경 규모**: authService.ts +8줄, useAppState.ts +4줄
**영향 범위**: 타임아웃 발생 경로만 영향. 정상 로그인에서는 `_loginTimedOut = false` 초기화 후 `signInWithPassword`가 10초 안에 성공 → 플래그 false → `consumeLoginTimedOut()` false → 기존 흐름 유지
**엣지 케이스**: 타임아웃 후 사용자가 다시 로그인 시도 → `signIn()` 진입 시 `_loginTimedOut = false` 초기화됨

---

### FR-04: smoke 게이트 핵심 Edge Function 커버리지 확장

**파일**: `scripts/check-edge-functions.mjs:50-53`

**문제 분석**

현재 smoke 검증 대상: `xlsx-parse`, `xlsx-generate`
미검증 핵심 함수: `toss-payment-confirm`, `crypto-service`, `notify-signup`, `auth-send-email`

배포 후 게이트가 통과해도 결제·암호화·인증 함수가 깨질 수 있음.

**probe body 설계 원칙**

| 함수 | verify_jwt | probe body 전략 | 예상 응답 |
|------|-----------|----------------|---------|
| `toss-payment-confirm` | false | `{}` (빈 body) | 400/422 (필수 필드 없음) |
| `crypto-service` | false | `{ action: 'ping' }` | 400/422 또는 200 |
| `notify-signup` | false | `{ _probe: true }` | 400/422 (이메일 없음) |
| `auth-send-email` | false | `{}` | 400/422 |

모든 경우에서 **404 = 미배포(FAIL)**, **4xx = 배포됨(OK)**, **5xx = 서버 오류(FAIL)**

**Before** (`check-edge-functions.mjs:50-53`)

```javascript
const probes = [
  { name: 'xlsx-parse', body: { fileBase64: 'aGVsbG8=', filename: 'probe.xlsx' } },
  { name: 'xlsx-generate', body: { activeSheet: { name: 'Sheet1', columns: [], rows: [] }, selectedIndices: [] } },
];
```

**After**

```javascript
const probes = [
  { name: 'xlsx-parse', body: { fileBase64: 'aGVsbG8=', filename: 'probe.xlsx' } },
  { name: 'xlsx-generate', body: { activeSheet: { name: 'Sheet1', columns: [], rows: [] }, selectedIndices: [] } },
  // onlyCheck404: 함수 자체 인증(401) 또는 잘못된 프로브 body(5xx)를 배포 실패로 오판하지 않음
  { name: 'toss-payment-confirm', body: {}, opts: { onlyCheck404: true } },  // 함수 레벨 JWT 검증 → 401 정상
  { name: 'crypto-service', body: { action: 'ping' }, opts: { onlyCheck404: true } },
  { name: 'notify-signup', body: { _probe: true } },  // verify_jwt=false, 200 정상
  { name: 'auth-send-email', body: {}, opts: { onlyCheck404: true } },  // Auth Hook 전용 payload
];
```

**`probeFunctionOnce` / `probeFunction` 시그니처 변경**

```javascript
// opts.onlyCheck404: true 시 404만 FAIL로 판정, 그 외(401, 5xx 포함) OK
async function probeFunctionOnce(name, body, opts = {}) { ... }
async function probeFunction(name, body, opts = {}) { ... }
```

**smoke-auto.mjs 설명 문구 업데이트** (`smoke-auto.mjs:15`)

```javascript
// Before
name: 'Edge Functions 배포 상태 (xlsx-parse, xlsx-generate)',

// After
name: 'Edge Functions 배포 상태 (xlsx-parse, xlsx-generate, toss-payment-confirm, crypto-service, notify-signup, auth-send-email)',
```

**변경 규모**: `check-edge-functions.mjs` +4줄, `smoke-auto.mjs` 1줄 수정
**주의**: `notify-signup`은 실제 이메일 발송을 방지하기 위해 `{ _probe: true }` 사용. 함수 내부에서 이를 처리하지 않으면 400으로 응답할 것이며, 이는 OK로 판정됨
**CI 영향**: 새 함수가 배포되지 않은 환경에서 CI 실패 가능 → 환경변수 없으면 전체 SKIP 유지 (기존 패턴)

---

## 3. 수정 파일 요약

| 파일 | 변경 유형 | 예상 줄 수 |
|------|---------|---------|
| `services/tossPaymentService.ts` | 취소 처리 추가 | +4 |
| `index.tsx` | sessionStorage 카운터 추가 | +10 |
| `services/authService.ts` | 플래그 + consumeLoginTimedOut 메서드 추가 | +8 |
| `hooks/useAppState.ts` | SIGNED_IN 핸들러 플래그 체크 추가 | +4 |
| `scripts/check-edge-functions.mjs` | probes 배열 확장 | +4 |
| `scripts/smoke-auto.mjs` | 설명 문구 업데이트 | 1줄 수정 |

**총 변경량**: 약 +30줄, 1줄 수정

---

## 4. Test Plan

### 4.1 자동 검증

| 검증 | 명령 | 기대 결과 |
|------|------|---------|
| TypeScript | `npm run typecheck` | 에러 없음 |
| 단위 테스트 | `npm test` | 126개 이상 PASS |
| 전체 파이프라인 | `npm run verify:premerge` | PASS |
| smoke (CI 환경) | `npm run smoke:edge:strict` | 6개 함수 모두 non-404 |

### 4.2 수동 검증 체크리스트

- [ ] [FR-01] 개발자 도구에서 `window.TossPayments = undefined` 설정 후 결제 시도 → `billing_history` 레코드 `cancelled` 상태 확인
- [ ] [FR-02] 개발자 도구 Console에서 `sessionStorage.setItem('_chunkReloadCount', '3')` 후 ChunkLoadError 시뮬레이션 → 리로드 없이 콘솔 에러 메시지 출력 확인
- [ ] [FR-03] 정상 로그인 플로우에서 `authService.consumeLoginTimedOut()` 호출 시 `false` 반환 확인 (정상 로그인 영향 없음)
- [ ] [FR-04] CI 환경에서 `npm run smoke:edge:strict` → 6개 함수 결과 확인

---

## 5. Implementation Order

1. FR-04 (`check-edge-functions.mjs`) — 가장 독립적, 즉시 확인 가능
2. FR-01 (`tossPaymentService.ts`) — 2줄 async await 추가
3. FR-02 (`index.tsx`) — sessionStorage 카운터 래핑
4. FR-03 (`authService.ts` + `useAppState.ts`) — 플래그 추가, 두 파일 함께 수정

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-31 | Initial draft |
