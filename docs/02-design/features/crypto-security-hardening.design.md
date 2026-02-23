# Design: crypto-security-hardening

> Plan 참조: `docs/01-plan/features/crypto-security-hardening.plan.md`

---

## 1. 변경 범위 요약

| Phase | ID | 파일 | 변경 유형 |
|-------|----|------|-----------|
| 1 | C-3 | `supabase/functions/crypto-service/index.ts` | verifyAuth — service_role_key 제거 |
| 1 | C-2 | `supabase/functions/crypto-service/index.ts` | hash op — JWT 필수 인증 추가 |
| 1 | H-1 | `services/cryptoUtils.ts` | callCryptoService — undefined 반환값 방어 |
| 1 | H-6 | `services/cryptoUtils.ts` | getValidToken — concurrent refresh mutex |
| 1 | H-4 | `services/mappers.ts` | decryptProfile — DB 쓰기 방지 flag |
| 2 | C-1 | `supabase/functions/crypto-service/index.ts` | verifyAuth — 인가(hospital_id) 레이어 |
| 2 | C-4 | `supabase/migrations/` | hospitals.phone 암호화 마이그레이션 |
| 3 | H-2 | `supabase/functions/crypto-service/index.ts` | PBKDF2 키 캐시 TTL |
| 3 | H-3 | `supabase/functions/crypto-service/index.ts` | PATIENT_DATA_KEY 미설정 fast-fail |
| 3 | H-5 | `services/authService.ts` | lazyEncryptProfile 중복 실행 방지 |
| 3 | H-7 | `services/authService.ts` | Slack notify PII 마스킹 |

---

## 2. Phase 1 상세 설계

### C-3: verifyAuth에서 service_role_key 제거

**현재 코드** (`index.ts:240-246`)
```typescript
const candidateKeys = [
  Deno.env.get("SUPABASE_ANON_KEY"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),   // ← 제거
]
  .map((v) => (v ?? "").trim())
  .filter((v, i, arr) => !!v && arr.indexOf(v) === i);
```

**변경 후**
```typescript
const anonKey = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
if (!anonKey) {
  console.error("[verifyAuth] SUPABASE_ANON_KEY 환경변수 누락");
  return false;
}
```

그리고 fetch 호출:
```typescript
const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
  headers: {
    "Authorization": `Bearer ${token}`,
    "apikey": anonKey,
  },
});
return res.ok;
```

**이유:** `/auth/v1/user` 토큰 검증에는 `SUPABASE_ANON_KEY`만으로 충분. service_role_key를 외부 네트워크 요청에 포함하는 것은 노출 위험을 불필요하게 높인다. candidateKeys loop 제거로 코드도 단순해짐.

---

### C-2: hash op JWT 필수 인증

**현재 흐름** (`index.ts:278-283`)
```typescript
// hash op: anon key 허용 (비인증 ID 조회 지원)
if (op !== "hash") {
  const ok = await verifyAuth(req);
  if (!ok) { return 401; }
}
```

**변경 후** — hash도 JWT 검증 적용
```typescript
// 모든 op에 JWT 인증 필수 (hash 포함)
const ok = await verifyAuth(req);
if (!ok) {
  return new Response(
    JSON.stringify({ error: "인증이 필요합니다." }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
```

**클라이언트 변경** (`cryptoUtils.ts`) — `hashPatientInfo` requireAuth를 true로
```typescript
// 기존: callCryptoService('hash', { text }, false)
// 변경:
return callCryptoService('hash', { text }, true) as Promise<string>;
```

**영향 분석:**
- `hashPatientInfo`는 `authService.ts`의 `lazyEncryptProfile` 및 `signUp` 내부에서 호출됨
- 이 시점에는 항상 Supabase 세션이 활성화된 상태 → 영향 없음
- 비인증 공개 페이지에서 전화번호 중복 체크 등에 사용하는 경우 → 해당 로직 재검토 필요 (현재 미사용 확인 후 적용)

---

### H-1: callCryptoService 반환값 undefined 방어

**현재 코드** (`cryptoUtils.ts:99-100`)
```typescript
const data = await res.json() as { result?: string; results?: string[] };
return (data.result ?? data.results) as string | string[];
// 서버가 { error: "..." } 반환 시 undefined를 string으로 캐스팅
```

**변경 후**
```typescript
const data = await res.json() as { result?: string; results?: string[] };
const value = data.result ?? data.results;
if (value === undefined) {
  throw new Error(`[cryptoUtils] crypto-service (${op}): 응답에 result 필드 없음`);
}
return value;
```

---

### H-6: getValidToken concurrent refresh mutex

**현재 문제:** 여러 컴포넌트가 동시에 expired token을 감지하면 각각 `refreshSession()`을 호출하고, 첫 번째 호출만 성공하고 나머지는 refresh_token이 소진되어 실패.

**변경 설계** — 모듈 수준 singleton promise

```typescript
// 모듈 상단
let _refreshingPromise: Promise<string | null> | null = null;

async function getValidToken(): Promise<string | null> {
  try {
    const { supabase } = await import('./supabaseClient');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;

    if (expiresAt - 10 <= now) {
      // 이미 진행 중인 refresh가 있으면 공유, 없으면 새로 시작
      if (!_refreshingPromise) {
        _refreshingPromise = supabase.auth.refreshSession()
          .then(({ data, error }) => {
            _refreshingPromise = null;
            return (!error && data.session) ? data.session.access_token : null;
          })
          .catch(() => {
            _refreshingPromise = null;
            return null;
          });
      }
      return _refreshingPromise;
    }

    return session.access_token;
  } catch {
    return null;
  }
}
```

**동작:** 첫 번째 expired 감지 호출이 `_refreshingPromise`를 생성. 이후 동시 호출들은 같은 Promise를 반환받아 공유. 완료 후 null로 초기화.

---

### H-4: decryptProfile — DB 쓰기 방지 flag

**문제:** `decryptProfile` catch 블록이 `{ name: '사용자', email: '' }` placeholder를 반환하는데, 이 객체가 `updateProfile()` 등 DB 쓰기 경로에 사용되면 실제 암호화 데이터가 덮어써짐.

**변경 설계** — `_decryptFailed` 옵션 필드 추가

**`types.ts`에 타입 수정:**
```typescript
export interface DbProfile {
  // ... 기존 필드 ...
  _decryptFailed?: boolean;  // ← 추가 (DB에 저장되지 않는 런타임 플래그)
}
```

**`mappers.ts` catch 블록 변경:**
```typescript
  } catch (e) {
    console.warn('[decryptProfile] 복호화 실패, 안전값 반환:', e);
    return {
      ...db,
      email: (sanitizeEncryptedProfileField('email', db.email) ?? ''),
      name: (sanitizeEncryptedProfileField('name', db.name) ?? '사용자'),
      phone: sanitizeEncryptedProfileField('phone', db.phone),
      _decryptFailed: true,  // ← 추가
    };
  }
```

**DB 쓰기 경로에서 guard 추가** — `authService.ts`의 `updateProfile` 또는 profile 업데이트 함수:
```typescript
// updateProfile 또는 upsertProfile 류의 함수에 추가
if (profile._decryptFailed) {
  console.error('[updateProfile] _decryptFailed=true인 profile 쓰기 차단:', profile.id);
  throw new Error('복호화 실패 상태의 프로파일은 저장할 수 없습니다.');
}
```

---

## 3. Phase 2 상세 설계

### C-1: verifyAuth 인가(Authorization) 레이어

**목표:** 인증된 사용자가 다른 병원의 데이터를 복호화하지 못하도록 차단. (현재는 유효한 JWT면 누구의 데이터든 복호화 가능)

**최소 구현 방안 (MVP):**

현재 `crypto-service`는 어떤 hospital의 데이터인지 알 수 없음. 요청 payload에 `hospital_id`가 없기 때문. 완전한 해결을 위한 접근:

#### 방안 A: JWT에서 hospital_id claim 추출 (권장)

Supabase custom JWT claims에 `hospital_id`를 추가:

```sql
-- Supabase hook 또는 trigger로 JWT claim에 hospital_id 삽입
-- auth.users → app_metadata.hospital_id
```

Edge Function에서:
```typescript
// JWT payload decode (검증은 Supabase Auth가 이미 수행)
function extractHospitalId(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.app_metadata?.hospital_id ?? null;
  } catch { return null; }
}
```

> **이 방안은 Supabase Auth custom claims 설정이 필요하므로 Phase 2에서 별도 설계.**

#### 최소 구현 (현재 Phase 2에 포함):
- `verifyAuth`에서 `/auth/v1/user` 응답의 `user.id` 반환
- `verifyAuth(req): Promise<string | null>` (userId 반환)로 시그니처 변경
- 향후 hospital_id 검증 확장 가능한 구조로 리팩토링

```typescript
async function verifyAuth(req: Request): Promise<string | null> {
  // ...
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, { ... });
  if (!res.ok) return null;
  const user = await res.json() as { id?: string };
  return user.id ?? null;  // userId 반환
}

// 핸들러에서:
const userId = await verifyAuth(req);
if (!userId) { return 401; }
// 추후: const hospitalId = await getHospitalId(userId);
```

---

### C-4: hospitals.phone 암호화

**현재 상태:**
- `profiles.phone` → 암호화됨 (`ENCv2:...`)
- `hospitals.phone` → 평문 그대로

**마이그레이션 전략:**

1. **`hospitals` 테이블에 `phone_encrypted` 컬럼 추가** (nullable)
2. **app에서 hospital 생성/수정 시 phone 암호화 저장**
3. **기존 평문 데이터**: `securityMaintenanceService.ts`의 lazy encryption 패턴과 동일하게 처리

```sql
-- 마이그레이션 파일: supabase/migrations/YYYYMMDD_encrypt_hospital_phone.sql
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;
```

**클라이언트 변경** (`hospitalService.ts`):
```typescript
// 병원 생성/수정 시 phone 암호화
const encryptedPhone = phone ? await encryptPatientInfo(phone) : null;
await supabase.from('hospitals').upsert({
  ...data,
  phone: encryptedPhone,  // 암호화된 값으로 대체
});
```

**기존 데이터 lazy migration:** 병원 데이터 로드 시 평문 phone 감지 → lazy encrypt 패턴 적용.

---

## 4. Phase 3 상세 설계

### H-2: PBKDF2 키 캐시 TTL

**현재:** 모듈 생명주기 동안 캐시 영구 유지

**변경:**
```typescript
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분

let cachedPbkdf2KeyPromise: Promise<CryptoKey> | null = null;
let cachedPbkdf2KeyAt = 0;

async function getAesKey(): Promise<CryptoKey> {
  if (cachedPbkdf2KeyPromise && Date.now() - cachedPbkdf2KeyAt < CACHE_TTL_MS) {
    return cachedPbkdf2KeyPromise;
  }
  cachedPbkdf2KeyAt = Date.now();
  cachedPbkdf2KeyPromise = (async () => { /* 기존 로직 */ })();
  return cachedPbkdf2KeyPromise;
}
```

**동일 패턴을 `getLegacyAesKey()`, `getLegacySaltAesKey()`에도 적용.**

---

### H-3: PATIENT_DATA_KEY 미설정 fast-fail

**현재:** `getSecret()`이 throw하면 `getAesKey()`가 캐시에 rejected promise를 저장. 이후 모든 키 요청이 같은 에러를 반환하지만 3중 fallback이 LEGACY_SALT로 처리.

**변경:** 앱 시작 시 즉시 검증
```typescript
// Edge Function 최상단 (Deno.serve 밖)
const _patientDataKey = Deno.env.get("PATIENT_DATA_KEY")?.trim();
if (!_patientDataKey) {
  console.error("[crypto-service] FATAL: PATIENT_DATA_KEY 시크릿이 설정되지 않았습니다.");
  // Deno.serve는 계속되지만 encrypt/decrypt 호출 시 명시적 에러 반환
}

function getSecret(): string {
  if (!_patientDataKey) throw new Error("PATIENT_DATA_KEY is not configured");
  return _patientDataKey;
}
```

---

### H-5: lazyEncryptProfile 중복 실행 방지

**현재 문제:** 두 탭이 동시에 로드되면 둘 다 평문을 감지하고 각각 lazyEncrypt 실행.

**변경:** DB conditional update 사용 (이미 암호화된 경우 덮어쓰기 방지)

```typescript
// authService.ts lazyEncryptProfile 내부
if (Object.keys(updates).length > 0) {
  await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profile.id)
    // name이 여전히 평문인 경우에만 업데이트 (race condition 방지)
    .not('name', 'like', 'ENCv2:%')
    .not('name', 'like', 'ENC:%');
}
```

---

### H-7: Slack notify-signup PII 마스킹

**현재:** `name`, `email`을 평문으로 Slack 전송

**변경:**
```typescript
// authService.ts notify-signup 호출부
const maskedEmail = maskEmail(email);   // "us**@ex***.com"
const maskedName = name ? `${name[0]}**` : '(미입력)';
// notify-signup 페이로드에 masked 값만 전달
```

---

## 5. 수정 순서 (구현 가이드)

```
[Phase 1]
1. crypto-service/index.ts
   - C-3: candidateKeys → anonKey only
   - C-2: hash op 인증 조건 제거 (모든 op 동일하게 verifyAuth)
   - H-2 선행 제거 없음 (독립적)

2. services/cryptoUtils.ts
   - H-1: undefined 반환 방어
   - H-6: _refreshingPromise singleton
   - C-2 클라이언트: hashPatientInfo requireAuth=true

3. services/mappers.ts
   - H-4: _decryptFailed flag

4. types.ts (필요 시)
   - DbProfile에 _decryptFailed?: boolean 추가

[Phase 2 — 별도 태스크]
5. crypto-service/index.ts — verifyAuth userId 반환 리팩토링
6. supabase/migrations/ — hospitals.phone 암호화

[Phase 3 — 별도 태스크]
7. crypto-service/index.ts — H-2 TTL, H-3 fast-fail
8. authService.ts — H-5 conditional update, H-7 마스킹
```

---

## 6. 회귀 방지 체크리스트

구현 완료 후 확인:
- [ ] `hash` op: 로그인된 사용자로 전화번호 해시 호출 → 200 정상
- [ ] `hash` op: 비인증(anon key만)으로 호출 → 401
- [ ] `decrypt` op: 로그인된 사용자로 ENCv2 데이터 복호화 → 200 정상 복호화
- [ ] `decryptProfile` 네트워크 오류 시: `_decryptFailed=true` 반환, DB 쓰기 차단
- [ ] 두 탭 동시 로드: console에 단일 refreshSession 호출만 확인
- [ ] `callCryptoService` 서버 이상 응답(200 + 빈 body): throw 발생 확인
- [ ] 기존 프로파일 복호화 (이름/이메일/전화번호) 정상 표시
