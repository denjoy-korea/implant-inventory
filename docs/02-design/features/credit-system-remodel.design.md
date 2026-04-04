# Design: credit-system-remodel

## 개요

Plan 문서의 목표인 "DenJOY 플랫폼 범용 크레딧 통화"를 위해,  
DB 스키마 · 백엔드 RPC · 프론트엔드 서비스·훅·컴포넌트를 설계한다.

---

## 1. DB 스키마

### 1-1. `profiles` 테이블 컬럼 추가

```sql
-- Migration: 20260405100000_user_credit_system.sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credit_balance NUMERIC NOT NULL DEFAULT 0;

-- check: 음수 불가
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_credit_balance_non_negative CHECK (credit_balance >= 0);
```

### 1-2. `user_credit_transactions` 테이블

```sql
CREATE TABLE public.user_credit_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        NUMERIC     NOT NULL,           -- 양수=적립, 음수=사용
  balance_after NUMERIC     NOT NULL,           -- 트랜잭션 후 잔액 스냅샷
  type          TEXT        NOT NULL,           -- 'earn' | 'spend'
  source        TEXT        NOT NULL,           -- 적립/사용 경로 코드
  reference_id  TEXT,                           -- 관련 객체 ID (billing_id, season_id 등)
  memo          TEXT,                           -- 관리자 메모 또는 자동 생성 설명
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_credit_tx_type_check
    CHECK (type IN ('earn', 'spend')),
  CONSTRAINT user_credit_tx_amount_earn_positive
    CHECK (type = 'spend' OR amount > 0),
  CONSTRAINT user_credit_tx_amount_spend_negative
    CHECK (type = 'earn' OR amount < 0)
);

-- 인덱스
CREATE INDEX user_credit_tx_user_id_created
  ON public.user_credit_transactions (user_id, created_at DESC);

-- RLS
ALTER TABLE public.user_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can read own transactions"
  ON public.user_credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE는 SECURITY DEFINER RPC만 허용 (직접 접근 차단)
```

**source 코드 정의**:

| source 값 | type | 설명 |
|-----------|------|------|
| `lecture_purchase_bonus` | earn | 강의 첫 구매 시 10% 보너스 |
| `referral_reward` | earn | 추천인 보상 |
| `admin_grant` | earn | 관리자 수동 지급 |
| `welcome_bonus` | earn | 회원가입 환영 크레딧 |
| `lecture_payment` | spend | 강의 결제 시 사용 |
| `service_payment` | spend | 서비스 결제 시 사용 (향후) |

---

### 1-3. RPC: `earn_user_credit`

```sql
CREATE OR REPLACE FUNCTION public.earn_user_credit(
  p_user_id    UUID,
  p_amount     NUMERIC,
  p_source     TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_memo       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- 금액 검증
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'earn amount must be positive';
  END IF;

  -- 잔액 업데이트 (FOR UPDATE로 동시성 보호)
  UPDATE profiles
  SET credit_balance = credit_balance + p_amount
  WHERE id = p_user_id
  RETURNING credit_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found: %', p_user_id;
  END IF;

  -- 트랜잭션 기록
  INSERT INTO user_credit_transactions
    (user_id, amount, balance_after, type, source, reference_id, memo)
  VALUES
    (p_user_id, p_amount, v_new_balance, 'earn', p_source, p_reference_id, p_memo);

  RETURN jsonb_build_object(
    'credited', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.earn_user_credit TO service_role;
```

---

### 1-4. RPC: `spend_user_credit`

```sql
CREATE OR REPLACE FUNCTION public.spend_user_credit(
  p_user_id      UUID,
  p_amount       NUMERIC,
  p_source       TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_memo         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance     NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'spend amount must be positive';
  END IF;

  -- Row-level lock: 동시 호출 race condition 방지
  SELECT credit_balance INTO v_current_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found: %', p_user_id;
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient credit: balance=%, requested=%',
      v_current_balance, p_amount;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE profiles
  SET credit_balance = v_new_balance
  WHERE id = p_user_id;

  INSERT INTO user_credit_transactions
    (user_id, amount, balance_after, type, source, reference_id, memo)
  VALUES
    (p_user_id, -p_amount, v_new_balance, 'spend', p_source, p_reference_id, p_memo);

  RETURN jsonb_build_object(
    'spent', p_amount,
    'new_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.spend_user_credit TO service_role;
```

---

### 1-5. RPC: `get_my_credit_info` (프론트엔드 호출용)

```sql
CREATE OR REPLACE FUNCTION public.get_my_credit_info()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT credit_balance INTO v_balance
  FROM profiles
  WHERE id = auth.uid();

  RETURN jsonb_build_object(
    'user_credit_balance', COALESCE(v_balance, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_credit_info TO authenticated;
```

> `get_my_profile` RPC도 `credit_balance` 컬럼을 반환하도록 수정 필요.

---

### 1-6. `toss-payment-confirm` Edge Function 수정 포인트

강의 결제(`plan = 'service_purchase'`) 브랜치에 크레딧 차감/적립 로직 추가:

```
[기존 흐름]
1. JWT 검증
2. billing_history 조회
3. 금액 검증
4. (amount > 0) TossPayments API 호출
5. course_enrollments upsert
6. billing_history → completed

[수정 흐름]
1. JWT 검증
2. billing_history 조회 + credit_used_amount 확인
3. 금액 검증: amount = subtotal + VAT - credit_used_amount
4. credit_used_amount > 0: 서버에서 잔액 재검증
   - adminClient.rpc('get_user_credit_balance', { p_user_id }) → 비교
   - 불일치 시 400 반환
5. (amount > 0) TossPayments API 호출
6. (amount = 0) paymentRef = 'FULL_CREDIT_PAYMENT'
7. course_enrollments upsert
8. billing_history → completed
9. credit_used_amount > 0: adminClient.rpc('spend_user_credit', {...})
10. 강의 첫 구매 보너스: adminClient.rpc('earn_user_credit', {
      p_user_id, p_amount: ROUND(original_subtotal * 0.1 / 10) * 10,
      p_source: 'lecture_purchase_bonus',
      p_reference_id: billing_id
    })
```

**크레딧 적용 금액 계산**:
```
subtotal    = sum(season prices)
vat         = ROUND(subtotal * 0.1)
gross       = subtotal + vat
credit_use  = MIN(보유잔액, gross)  // 클라이언트 계산, 서버 재검증
net_amount  = gross - credit_use    // TossPayments 실결제 금액
```

---

## 2. TypeScript 타입

### `types/credit.ts` (신규)

```typescript
// 크레딧 트랜잭션 source 코드
export type UserCreditSource =
  | 'lecture_purchase_bonus'
  | 'referral_reward'
  | 'admin_grant'
  | 'welcome_bonus'
  | 'lecture_payment'
  | 'service_payment';

export type UserCreditType = 'earn' | 'spend';

// DB 행 타입
export interface DbUserCreditTransaction {
  id: string;
  user_id: string;
  amount: number;          // 양수=적립, 음수=사용
  balance_after: number;
  type: UserCreditType;
  source: UserCreditSource;
  reference_id: string | null;
  memo: string | null;
  created_at: string;
}

// 프론트엔드 표시용
export interface UserCreditTransaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: UserCreditType;
  source: UserCreditSource;
  referenceId: string | null;
  memo: string | null;
  createdAt: string;
  // 계산 필드
  label: string;           // 사람이 읽을 수 있는 설명 (source → 한글 매핑)
}

// MyPage 크레딧 정보
export interface UserCreditInfo {
  userCreditBalance: number;    // 개인 크레딧 (profiles.credit_balance)
  hospitalCreditBalance: number; // 병원 크레딧 (hospitals.credit_balance, 기존)
}
```

### `types/user.ts` 수정

```typescript
// DbProfile에 credit_balance 추가
export interface DbProfile {
  // ... 기존 필드 ...
  credit_balance: number;  // 개인 크레딧 잔액 (신규)
}

// User(프론트엔드 모델)에도 추가
export interface User {
  // ... 기존 필드 ...
  creditBalance: number;   // 개인 크레딧 잔액 (신규)
}
```

---

## 3. 서비스 레이어

### `services/creditService.ts` (신규)

```typescript
import { supabase } from './supabaseClient';
import type { UserCreditTransaction, DbUserCreditTransaction } from '../types/credit';

// source → 한글 레이블 매핑
const SOURCE_LABEL: Record<string, string> = {
  lecture_purchase_bonus: '강의 구매 보너스',
  referral_reward:        '추천 보상',
  admin_grant:            '관리자 지급',
  welcome_bonus:          '환영 크레딧',
  lecture_payment:        '강의 결제',
  service_payment:        '서비스 결제',
};

function dbToTransaction(row: DbUserCreditTransaction): UserCreditTransaction {
  return {
    id:           row.id,
    amount:       Number(row.amount),
    balanceAfter: Number(row.balance_after),
    type:         row.type,
    source:       row.source as any,
    referenceId:  row.reference_id,
    memo:         row.memo,
    createdAt:    row.created_at,
    label:        SOURCE_LABEL[row.source] ?? row.source,
  };
}

export const creditService = {
  async getCreditInfo(): Promise<{ userCreditBalance: number }> {
    const { data, error } = await supabase.rpc('get_my_credit_info');
    if (error) throw error;
    return {
      userCreditBalance: Number((data as any).user_credit_balance ?? 0),
    };
  },

  async getCreditHistory(limit = 50): Promise<UserCreditTransaction[]> {
    const { data, error } = await supabase
      .from('user_credit_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(dbToTransaction);
  },
};
```

---

## 4. 상태 관리

### `AppState` 확장 (`types/app.ts`)

```typescript
export interface AppState {
  // ... 기존 필드 ...
  userCreditBalance: number;        // 개인 크레딧 잔액 (신규)
}
```

### `appStatePresets.ts` 수정

`buildHospitalReadyState` 및 `buildNoHospitalState` 등에서 `userCreditBalance` 초기화:

```typescript
// buildHospitalReadyState 파라미터 추가
userCreditBalance: user.creditBalance ?? 0,
```

### `useAppHospitalDataLoader.ts` 수정

`loadHospitalContextSnapshot`에서 `get_my_credit_info`를 병렬 조회 추가:

```typescript
// loadHospitalData 내 Promise.all에 추가
const [workspaceSnapshot, hospitalContext, decryptedProfile, creditInfo] = await Promise.all([
  loadHospitalWorkspaceSnapshot(user),
  loadHospitalContextSnapshot(user),
  decryptUserPromise,
  creditService.getCreditInfo().catch(() => ({ userCreditBalance: 0 })),
]);

// setState에 반영
setState(prev => buildHospitalReadyState(prev, {
  user: resolvedUser,
  userCreditBalance: creditInfo.userCreditBalance,
  // ...
}));
```

---

## 5. UI 컴포넌트

### 5-1. MyPage 홈 탭 — 크레딧 월렛 카드

**위치**: MyPage → 홈 탭 → 멤버십 현황 섹션 바로 아래 또는 위

```
┌─────────────────────────────────────────┐
│ 내 크레딧                      [내역 >] │
│                                         │
│   ₩12,300                              │
│   개인 크레딧                           │
│                                         │
│   ₩5,000   병원 크레딧 (임플란트 재고관리)│
└─────────────────────────────────────────┘
```

- 컬러: `bg-indigo-50`, 크레딧 숫자 `text-indigo-700 font-black`
- 병원 크레딧은 서브 텍스트로 표시 (병원 크레딧이 0이면 숨김)
- "내역 >" 클릭 시 `purchases` 탭으로 이동 + 크레딧 내역 섹션 스크롤

### 5-2. MyPage 구매내역 탭 — 크레딧 내역 섹션

**위치**: 기존 구매내역 테이블 위에 별도 섹션으로 추가

```
[ 결제 내역 ]  [ 크레딧 내역 ]   ← 탭 전환

크레딧 내역
─────────────────────────────────────────
날짜          내용                 금액    잔액
2026-04-05   강의 구매 보너스    +9,900  12,300
2026-04-05   강의 결제           -9,000   2,400
2026-04-01   환영 크레딧         +5,000  11,400
```

- `amount > 0`: `text-emerald-600` + `+` 접두
- `amount < 0`: `text-rose-600` + `-` 접두

### 5-3. MyPage 헤더 크레딧 배지

**위치**: MyPage 상단 헤더 우측 (프로필 아이콘 옆)

```
[₩12,300] 크레딧
```

- `bg-indigo-100 text-indigo-700 rounded-full px-3 py-1 text-xs font-black`
- 클릭 시 크레딧 월렛 카드로 스크롤

### 5-4. 강의 장바구니 크레딧 적용 UI

**위치**: MyPage 서비스 탭 → 장바구니 결제 요약 섹션

```
주문 요약
─────────────────────────────
소계            99,000원
부가세           9,900원
──────────────────────────────
합계           108,900원

┌─ 크레딧 사용 ───────────────┐
│ 보유: ₩12,300               │
│ [━━━━━━━━○─────] 12,300원   │  ← 슬라이더 또는 토글
│ 사용 금액: 12,300원         │
└─────────────────────────────┘

실결제 금액      96,600원
[결제하러 가기]
```

- 크레딧 잔액이 0이면 섹션 숨김
- 슬라이더 대신 단순 토글(전액 사용/미사용) 우선 구현 (MVP)
- 실결제 = 0 이면 버튼 텍스트 → "크레딧으로 결제" (TossPayments 생략)

### 5-5. 결제 완료 후 보너스 알림 토스트

```
강의 구매 보너스 +9,900 크레딧이 적립됐습니다!
```

- `showAlertToast('info')` 활용

---

## 6. 강의 결제 플로우 (크레딧 적용 시)

```
[클라이언트]                          [서버]
    │
    ├── 1. 장바구니 합계 계산
    │      gross = subtotal + VAT
    │      creditUse = MIN(잔액, gross)
    │      netAmount = gross - creditUse
    │
    ├── 2. billing_history INSERT
    │      amount = netAmount
    │      credit_used_amount = creditUse
    │      plan = 'service_purchase'
    │
    ├── 3a. netAmount > 0
    │      TossPayments 위젯 열기 → 결제 완료
    │      → /toss-payment-confirm 호출
    │                                ├── 잔액 재검증
    │                                ├── TossPayments API confirm
    │                                ├── course_enrollments upsert
    │                                ├── billing → completed
    │                                ├── spend_user_credit(creditUse)
    │                                └── earn_user_credit(구매금액*10%)
    │
    └── 3b. netAmount = 0
           → /toss-payment-confirm 호출 (amount=0)
                                    ├── 잔액 재검증
                                    ├── paymentRef = 'FULL_CREDIT_PAYMENT'
                                    ├── course_enrollments upsert
                                    ├── billing → completed
                                    └── spend_user_credit(creditUse)
```

**idempotency**: `billing_history.payment_status = 'confirming'` 상태를 거쳐 중복 호출 방지 (기존 패턴 동일).

---

## 7. 보안 설계

| 위협 | 대응 |
|------|------|
| 클라이언트 크레딧 금액 조작 | 서버에서 `get_user_credit_balance` 재검증 후 불일치 시 400 |
| 동시 다중 결제로 잔액 초과 | `spend_user_credit` 내 `SELECT FOR UPDATE` row lock |
| 다른 사용자 크레딧 사용 | JWT `user.id` + `billing_history.user_id` 일치 검증 |
| 보너스 중복 지급 | `reference_id = billing_id` unique + `earn_user_credit` 재시도 방어 |
| `user_credit_transactions` 직접 INSERT | RLS: `TO authenticated` SELECT only, INSERT 차단 |

---

## 8. 구현 파일 목록

### 신규 생성

| 파일 | 내용 |
|------|------|
| `supabase/migrations/20260405100000_user_credit_system.sql` | profiles 컬럼, user_credit_transactions, earn/spend/get RPCs |
| `types/credit.ts` | UserCreditSource, UserCreditType, DbUserCreditTransaction, UserCreditTransaction, UserCreditInfo |
| `services/creditService.ts` | getCreditInfo(), getCreditHistory() |

### 수정

| 파일 | 변경 내용 |
|------|---------|
| `types/user.ts` | `DbProfile.credit_balance`, `User.creditBalance` 필드 추가 |
| `types/app.ts` | `AppState.userCreditBalance: number` 추가 |
| `services/mappers.ts` | `dbToUser`에서 `creditBalance: db.credit_balance ?? 0` 매핑 |
| `services/authService.ts` | `getProfileById` → `get_my_profile` RPC가 credit_balance 반환하도록 확인/수정 |
| `hooks/appStatePresets.ts` | `buildHospitalReadyState` 등 `userCreditBalance` 초기화 |
| `hooks/useAppHospitalDataLoader.ts` | Promise.all에 `creditService.getCreditInfo()` 추가 |
| `components/MyPage.tsx` | 크레딧 월렛 카드, 크레딧 내역 탭, 장바구니 크레딧 토글 UI |
| `supabase/functions/toss-payment-confirm/index.ts` | service_purchase 브랜치에 크레딧 차감/보너스 로직 |

### 참조 (변경 없음)

| 파일 | 참조 이유 |
|------|---------|
| `supabase/migrations/20260311110000_downgrade_credit.sql` | 병원 크레딧 RPC 패턴 |
| `supabase/migrations/20260404200000_course_replay_system.sql` | enrollment upsert 패턴 |
| `types/plan.ts` | DbBillingHistory.credit_used_amount 필드 패턴 |

---

## 9. 구현 순서

```
Step 1. SQL 마이그레이션 (로컬 적용 → Supabase 반영)
        └── profiles.credit_balance 추가
        └── user_credit_transactions 테이블
        └── earn/spend/get RPCs
        └── get_my_profile RPC에 credit_balance 포함

Step 2. TypeScript 타입 & 매퍼
        └── types/credit.ts 신규
        └── types/user.ts, types/app.ts 수정
        └── services/mappers.ts dbToUser 수정

Step 3. 서비스 & 상태
        └── services/creditService.ts 신규
        └── appStatePresets.ts userCreditBalance 초기화
        └── useAppHospitalDataLoader.ts 크레딧 병렬 조회

Step 4. MyPage UI
        └── 크레딧 월렛 카드 (홈 탭)
        └── 크레딧 내역 (구매내역 탭)
        └── 장바구니 크레딧 토글

Step 5. toss-payment-confirm 수정 + 재배포
        └── service_purchase 브랜치 크레딧 차감
        └── 구매 보너스 earn
        └── npx supabase functions deploy toss-payment-confirm --no-verify-jwt

Step 6. E2E 검증
        └── 강의 구매 → 크레딧 사용 → 보너스 적립 흐름
        └── 잔액 부족 시 400 에러 처리
        └── 전액 크레딧 결제 (netAmount=0) 흐름
```
