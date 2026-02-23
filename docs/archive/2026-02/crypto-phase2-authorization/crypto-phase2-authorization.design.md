# Design: crypto-phase2-authorization

> **작성일**: 2026-02-23
> **연관 Plan**: `docs/01-plan/features/crypto-phase2-authorization.plan.md`
> **Phase 1 완료 보고서**: `docs/04-report/features/crypto-security-hardening.report.md`

---

## 1. 개요

Phase 1(인증 강화)에서 남긴 두 가지 잔존 리스크를 해결한다.

| ID | 항목 | 위험도 | 구현 우선순위 |
|----|------|:------:|:------------:|
| C-4 | `hospitals.phone` 평문 저장 | Medium | 1 (먼저) |
| C-1 | `verifyAuth` 인가(Authorization) 레이어 없음 | High | 2 (이후) |

---

## 2. C-4 설계 — `hospitals.phone` 암호화

### 2-1. 현황 분석

```
hospitals.phone 컬럼: TEXT (기존 평문 저장)

쓰기 경로 (2곳):
  authService.ts:164  master 회원가입 → hospitals.insert({ phone: phone || null })
  authService.ts:219  staff 개인 워크스페이스 → hospitals.insert({ phone: phone || null })

읽기 경로:
  hospitalService.ts:getMyHospital() → select('*') → DbHospital 반환 (phone 포함)
  systemAdminDomain.ts:DbHospitalRow → SystemAdminDashboard state (phone 저장)

UI 표시 경로: 없음 (grep 결과 확인)
  - SystemAdminHospitalsTab: phone 미사용
  - 기타 admin tabs: profile.phone / inquiry.phone 사용 (hospitals.phone 아님)

위험: DB 직접 접근(Supabase Dashboard, 백업 파일) 시 전화번호 평문 노출
```

### 2-2. 변경 범위

| 영역 | 변경 내용 |
|------|-----------|
| **쓰기 경로** | `authService.signUp()` — insert 전 `encryptPatientInfo(phone)` 호출 |
| **읽기 경로** | `hospitalService.getMyHospital()` — 평문 감지 시 background lazy encrypt 트리거 |
| **마이그레이션** | 컬럼 구조 변경 없음. 주석 문서화 SQL만 추가 |
| **타입** | `DbHospital` 변경 없음 (`phone: string | null` 유지) |
| **UI** | 변경 없음 (hospitals.phone을 렌더링하는 컴포넌트 없음) |

### 2-3. 코드 변경 상세

#### A. `services/authService.ts` — 쓰기 경로 암호화

**변경 위치 1**: master 회원가입 (`signUp`, ~line 164)

```typescript
// Before
const { data: hospital, error: hospError } = await supabase
  .from('hospitals')
  .insert({
    name: hospitalName,
    master_admin_id: userId,
    phone: phone || null,          // ← 평문
  });

// After
const encHospitalPhone = phone ? await encryptPatientInfo(phone) : null;
const { data: hospital, error: hospError } = await supabase
  .from('hospitals')
  .insert({
    name: hospitalName,
    master_admin_id: userId,
    phone: encHospitalPhone,       // ← 암호화
  });
```

**변경 위치 2**: staff 개인 워크스페이스 생성 (~line 216)

```typescript
// Before
const { data: workspace, error: wsError } = await supabase
  .from('hospitals')
  .insert({
    name: `${name}의 워크스페이스`,
    master_admin_id: userId,
    phone: phone || null,          // ← 평문
  });

// After
const encWorkspacePhone = phone ? await encryptPatientInfo(phone) : null;
const { data: workspace, error: wsError } = await supabase
  .from('hospitals')
  .insert({
    name: `${name}의 워크스페이스`,
    master_admin_id: userId,
    phone: encWorkspacePhone,      // ← 암호화
  });
```

> **주의**: 두 위치 모두 이미 `encryptPatientInfo`를 import하는 컨텍스트 내에 있음.
> `phone` 파라미터는 `SignupParams`에서 string으로 들어옴.

#### B. `services/hospitalService.ts` — 읽기 경로 lazy encrypt

`isPlain()` 헬퍼: `ENCv2:`/`ENC:` 접두사 없는 비빈 문자열 → 평문으로 판단.

```typescript
// hospitalService.ts 상단 import에 추가
import { encryptPatientInfo, decryptPatientInfo } from './cryptoUtils';

/** 값이 평문인지 판단 (ENCv2:/ENC: 접두사 없고 비어있지 않으면 평문) */
function isPlainHospitalPhone(v: string | null): v is string {
  if (!v) return false;
  return !v.startsWith('ENCv2:') && !v.startsWith('ENC:');
}

/** 백그라운드 lazy 암호화 — 실패해도 서비스 중단 없음 */
async function lazyEncryptHospitalPhone(hospitalId: string, plainPhone: string): Promise<void> {
  try {
    const encPhone = await encryptPatientInfo(plainPhone);
    await supabase.from('hospitals').update({ phone: encPhone }).eq('id', hospitalId);
  } catch (e) {
    console.warn('[lazyEncryptHospitalPhone] 암호화 실패:', hospitalId, e);
  }
}
```

`getMyHospital()` 수정:

```typescript
async getMyHospital(): Promise<DbHospital | null> {
  // ... 기존 조회 로직 ...
  if (error) return null;
  const hospital = data as DbHospital;

  // C-4 lazy encrypt: 평문 phone 감지 시 백그라운드 암호화
  if (isPlainHospitalPhone(hospital.phone)) {
    void lazyEncryptHospitalPhone(hospital.id, hospital.phone);
  }

  return hospital;
},
```

> `getMyHospital()`은 `DbHospital` (raw) 반환. 현재 UI가 phone을 렌더링하지 않으므로
> 복호화 처리 불필요. 미래 표시 요건 발생 시 `decryptPatientInfo(hospital.phone)` 추가.

### 2-4. 마이그레이션

`supabase/migrations/20260223030000_hospitals_phone_encryption.sql`

```sql
-- hospitals.phone 암호화 마이그레이션 (컬럼 구조 변경 없음)
-- ───────────────────────────────────────────────────────────────────────────
-- hospitals.phone 컬럼은 앱 레이어에서 AES-GCM(ENCv2:...) 형식으로 저장합니다.
-- 기존 평문 데이터는 getMyHospital() 호출 시 lazy encryption으로 자동 암호화합니다.
-- (profiles.phone 와 동일한 lazy encrypt 패턴 적용)
--
-- 컬럼 변경: 없음 (기존 phone TEXT 컬럼을 그대로 사용)
-- ───────────────────────────────────────────────────────────────────────────

-- 의도 문서화용 주석 컬럼 (실제 변경 없음)
-- ALTER TABLE hospitals COMMENT ON COLUMN hospitals.phone IS 'AES-GCM encrypted via crypto-service';

-- 주의: 기존 평문 데이터는 앱 lazy encrypt로 처리됨.
-- 강제 일괄 마이그레이션이 필요한 경우 별도 스크립트 작성 필요.
SELECT 'hospitals.phone encryption migration documented' AS status;
```

---

## 3. C-1 설계 — `verifyAuth` 인가 레이어 (MVP)

### 3-1. 현황 분석

```typescript
// 현재: 인증(Authentication)만 검증
async function verifyAuth(req: Request): Promise<boolean> {
  // JWT 유효성만 확인 (/auth/v1/user 200 여부)
  // 어떤 병원 사용자인지 전혀 모름
  return res.ok;
}

// 현재 핸들러
if (op !== 'hash') {
  const ok = await verifyAuth(req);
  if (!ok) { return 401; }
  // hospital_id 정보 없음 → 인가(Authorization) 불가능
}
```

**문제**: 유효한 JWT를 가진 병원 A 직원이 병원 B의 `ENCv2:` 암호문을 복호화 요청 가능.

### 3-2. 선택 방식: JWT Custom Claims

JWT payload의 `app_metadata.hospital_id`에서 요청자 hospital_id를 추출.

**선택 이유**:
- DB 추가 조회 없음 (JWT payload에서 직접 파싱 → 네트워크 왕복 0회)
- Supabase `custom_access_token` hook으로 자동 삽입
- Edge Function에서 순수 함수로 파싱 가능

**대안과 비교**:
| 방식 | DB 조회 | 복잡도 | 선택 |
|------|:-------:|:------:|:----:|
| JWT Claims | 0 | 낮음 | ✅ |
| `/auth/v1/user` 응답에서 추출 | 0 (이미 호출 중) | 낮음 | 차선 |
| DB 별도 조회 | 1 | 높음 | ❌ |

### 3-3. Supabase JWT Hook 설정

#### A. DB 함수 생성

`supabase/migrations/20260223040000_custom_jwt_claims.sql`

```sql
-- custom_access_token hook: JWT에 hospital_id 삽입
-- ───────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  hospital_id uuid;
BEGIN
  -- profiles 테이블에서 사용자의 hospital_id 조회
  SELECT p.hospital_id INTO hospital_id
  FROM public.profiles p
  WHERE p.id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- hospital_id가 있는 경우 JWT app_metadata에 삽입
  IF hospital_id IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata,hospital_id}',
      to_jsonb(hospital_id::text)
    );
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- auth admin에게 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- 일반 사용자는 직접 호출 불가
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

#### B. Supabase Dashboard 등록

```
Authentication → Hooks → Custom Access Token Hook
→ Function: public.custom_access_token_hook
→ Save
```

> **주의**: Hook 적용 전에 발급된 JWT에는 hospital_id가 없음.
> 배포 후 기존 세션 사용자는 재로그인 시 hospital_id가 JWT에 삽입됨.
> MVP에서는 hospital_id 없는 JWT도 소프트-패스 (로그만).

### 3-4. Edge Function 코드 변경

`supabase/functions/crypto-service/index.ts`

#### A. `extractHospitalId` 헬퍼 추가

```typescript
/**
 * JWT payload에서 app_metadata.hospital_id 추출.
 * custom_access_token hook에 의해 삽입됨 (설정 후 발급된 JWT에만 존재).
 *
 * @returns hospital_id (string) | null (hook 미설정 또는 구 JWT)
 */
function extractHospitalId(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64 변환 후 decode
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    return (payload?.app_metadata?.hospital_id as string) ?? null;
  } catch {
    return null;
  }
}
```

#### B. `verifyAuth` 시그니처 변경

```typescript
// 인증 컨텍스트 타입
interface AuthContext {
  userId: string;
  hospitalId: string | null;  // hook 미설정 또는 구 JWT: null
}

/**
 * C-3: ANON_KEY만 사용 (SERVICE_ROLE_KEY 제거)
 * C-1 MVP: userId + hospitalId 반환 (인가 구조 확립)
 *          hospital_id 불일치 즉시 거부는 Phase 2 이후 — 현재는 로그만.
 */
async function verifyAuth(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[verifyAuth] Authorization header 없음 또는 Bearer 형식 아님");
    return null;
  }
  const token = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
  if (!anonKey) {
    console.error("[verifyAuth] SUPABASE_ANON_KEY 환경변수 누락");
    return null;
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": anonKey,
      },
    });
    if (!res.ok) {
      console.error("[verifyAuth] Auth API 실패:", res.status);
      return null;
    }

    const userData = await res.json() as { id?: string };
    const userId = userData.id ?? '';

    // C-1: JWT payload에서 hospital_id 추출 (hook 설정 후 발급된 JWT에만 존재)
    const hospitalId = extractHospitalId(token);
    if (!hospitalId) {
      console.warn("[verifyAuth] hospital_id 없음 (hook 미설정 or 구 JWT). 소프트-패스.");
    }

    return { userId, hospitalId };
  } catch (e) {
    console.error("[verifyAuth] fetch 예외:", e);
    return null;
  }
}
```

#### C. 메인 핸들러 변경

```typescript
// Before
if (op !== 'hash') {
  const ok = await verifyAuth(req);
  if (!ok) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401, ... });
  }
}

// After
let authContext: AuthContext | null = null;
if (op !== 'hash') {
  authContext = await verifyAuth(req);
  if (!authContext) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), { status: 401, ... });
  }
  // C-1 MVP: authContext.hospitalId는 향후 요청 hospital_id 검증에 사용 가능
  // 현재는 인가 구조만 완성, 강제 검증은 Phase 2 이후 추가
}
```

### 3-5. 미래 인가 확장 경로 (현재는 미구현)

```typescript
// Phase 2 이후: 요청 body에서 hospital_id 추출 후 비교
// (복호화 대상 데이터의 hospital_id와 요청자 hospital_id 비교)
if (authContext.hospitalId && requestedHospitalId) {
  if (authContext.hospitalId !== requestedHospitalId) {
    return new Response(JSON.stringify({ error: '접근 권한이 없습니다.' }), { status: 403, ... });
  }
}
```

> 현재 MVP에서는 이 검증 로직 없음. hospital_id만 로그/추출하는 구조만 완성.

---

## 4. 구현 순서

```
[1] C-4 먼저 — 범위 명확, 위험 낮음
    1-1. 마이그레이션 파일 작성 (문서화만, 구조 변경 없음)
    1-2. authService.ts — signUp() 두 곳의 insert에 encryptPatientInfo() 추가
    1-3. hospitalService.ts — isPlainHospitalPhone, lazyEncryptHospitalPhone 추가
    1-4. hospitalService.ts — getMyHospital()에 lazy encrypt 트리거 추가
    1-5. 동작 확인: 신규 가입 시 DB에 ENCv2: 저장, getMyHospital() 후 기존 평문 암호화

[2] C-1 이후 — Supabase 설정 변경 수반
    2-1. 마이그레이션 작성 (custom_access_token_hook SQL)
    2-2. Supabase Dashboard에서 hook 등록
    2-3. crypto-service/index.ts — extractHospitalId() 추가
    2-4. crypto-service/index.ts — verifyAuth() 시그니처 변경 → AuthContext | null
    2-5. crypto-service/index.ts — 핸들러에서 authContext 활용 구조 완성
    2-6. supabase functions deploy crypto-service
    2-7. 동작 확인: JWT payload에 hospital_id 존재, 로그에서 확인
```

---

## 5. 영향 범위

### 변경 파일 목록

| 파일 | 변경 내용 | C-4 | C-1 |
|------|-----------|:---:|:---:|
| `services/authService.ts` | signUp() phone 암호화 (2곳) | ✅ | - |
| `services/hospitalService.ts` | lazyEncryptHospitalPhone, getMyHospital lazy encrypt | ✅ | - |
| `supabase/migrations/20260223030000_hospitals_phone_encryption.sql` | 문서화 SQL | ✅ | - |
| `supabase/migrations/20260223040000_custom_jwt_claims.sql` | hook 함수 + 권한 | - | ✅ |
| `supabase/functions/crypto-service/index.ts` | extractHospitalId, verifyAuth 시그니처 변경 | - | ✅ |

### 비변경 파일

| 파일 | 이유 |
|------|------|
| `types.ts` | `DbHospital.phone: string | null` 변경 없음 |
| `services/cryptoUtils.ts` | 변경 없음 (encryptPatientInfo 재사용) |
| `services/mappers.ts` | `dbToHospital()`이 phone 미포함 → 변경 없음 |
| UI 컴포넌트 | hospitals.phone 렌더링 경로 없음 → 변경 없음 |

---

## 6. 검증 기준

### C-4

- [ ] 신규 master 회원가입 후 DB `hospitals.phone` 컬럼에 `ENCv2:` 값 저장
- [ ] 신규 staff 워크스페이스 생성 후 DB `hospitals.phone` 컬럼에 `ENCv2:` 값 저장
- [ ] 기존 평문 phone 보유 병원 → `getMyHospital()` 호출 후 → DB에서 `ENCv2:` 값 확인 (lazy encrypt)
- [ ] 기존 기능(병원 조회, 구성원 목록, 수술기록 등) 회귀 없음

### C-1

- [ ] `custom_access_token_hook` 함수 생성 및 권한 설정 확인
- [ ] 로그인 후 새로 발급된 JWT payload에 `app_metadata.hospital_id` 존재 확인
- [ ] `verifyAuth()` 리턴값이 `AuthContext | null`으로 변경됨
- [ ] `extractHospitalId(token)` 함수가 JWT에서 hospital_id 정확히 추출
- [ ] 기존 encrypt/decrypt/hash 기능 회귀 없음
- [ ] hook 미설정 구 JWT로도 동작 (소프트-패스, 로그 출력)

---

## 7. 리스크 및 대응

| 리스크 | 설명 | 대응 |
|--------|------|------|
| C-4 lazy encrypt 인증 컨텍스트 | `getMyHospital()`은 인증 후 호출 → `encryptPatientInfo`는 JWT 필요 | getMyHospital()은 항상 인증 컨텍스트에서 호출됨. 문제 없음 |
| C-1 hook 등록 누락 | Dashboard 설정 없이 코드만 변경 시 hospital_id 항상 null | 배포 전 hook 등록 확인 (체크리스트) |
| C-1 구 JWT 세션 | hook 적용 전 발급 JWT → hospital_id 없음 → null | 소프트-패스. 재로그인 시 자동 해결 |
| C-1 `atob` base64url 패딩 | JWT payload가 base64url — 길이가 4의 배수 아닐 수 있음 | `replace(/-/g, '+').replace(/_/g, '/')` 변환 후 사용. Deno `atob`는 패딩 없어도 처리 가능 (런타임 검증 필요) |

---

## 8. 참조

- Phase 1 완료 보고서: `docs/04-report/features/crypto-security-hardening.report.md`
- 이전 설계(Phase 2 섹션): `docs/02-design/features/crypto-security-hardening.design.md` Section 3
- profiles lazy encrypt 참조: `supabase/migrations/20260223020000_profiles_pii_encryption.sql`
- 관련 파일: `services/authService.ts`, `services/hospitalService.ts`
- Edge Function: `supabase/functions/crypto-service/index.ts`
