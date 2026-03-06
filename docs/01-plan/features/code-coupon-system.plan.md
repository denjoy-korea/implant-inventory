# Code & Coupon Management System Plan

> Feature: code-coupon-system
> Created: 2026-03-06
> Status: Plan

---

## 1. Background & Motivation

### 1.1 Current State
- `beta_invite_codes` 테이블로 베타테스터 초대 코드만 운영 중
- 코드 형식: `BETA-XXXX-YYYY`, usage_mode: single/unlimited
- 2026-04-01 KST까지 가입 시 코드 필수 (이후 오픈)
- 관리 UI: SystemAdminDashboard > "베타 코드 관리" 탭
- 결제(TossPayments)와 완전히 독립 — 할인/쿠폰 연동 없음

### 1.2 Problem Statement
1. 베타 기간 종료 후 코드 시스템이 사실상 사장됨
2. 채널 제휴(유튜브, 블로그, 학회 등) 유입 회원 추적 불가
3. 제휴 할인, 프로모션 쿠폰 등 마케팅 도구 부재
4. 구독 결제 시 할인 적용 메커니즘 없음

### 1.3 Goal
기존 베타코드 인프라를 확장하여 **통합 코드/쿠폰 관리 시스템** 구축:
- 코드 타입 분류 (베타, 제휴, 프로모션)
- 제휴코드 → 자동 쿠폰 지급 → 결제 할인 연동
- 쿠폰 라이프사이클 (생성 → 지급 → 사용 → 소멸)

---

## 2. Market Research Summary

### 2.1 SaaS 쿠폰/프로모 코드 업계 표준

| 플랫폼 | 모델 | 핵심 패턴 |
|---------|------|-----------|
| **Stripe Coupons** | coupon → promotion_code → customer | coupon(할인 규칙) + promotion_code(공개 코드) 분리 |
| **Paddle Discounts** | discount → subscription | 구독 생성 시 discount_id 적용, N회 반복 할인 |
| **TossPayments** | 빌링키 + amount 조정 | 쿠폰 시스템 미제공, 클라이언트에서 amount 계산 후 결제 |
| **채널톡/스티비** | invite_code → credit | 가입 코드 → 크레딧 자동 지급 |

### 2.2 핵심 인사이트

1. **코드와 쿠폰은 별개 엔티티**: 코드(입력 매체) → 쿠폰(할인 규칙) 2단계 구조가 업계 표준
2. **TossPayments는 쿠폰 미지원**: 결제 금액을 클라이언트에서 계산 후 `amount` 파라미터로 전달 필수
3. **사용 횟수 기반 차감**: 월구독/연구독 모두 "1회 결제 = 1회 차감"이 가장 직관적
4. **채널 어트리뷰션**: 코드에 channel 메타데이터 연결 → 유입 경로별 전환율 분석 가능

### 2.3 한국 SaaS 시장 패턴

- **제휴 코드**: 특정 인플루언서/채널 전용, 가입 시 입력 → 자동 혜택 부여
- **할인 쿠폰**: % 할인 or 정액 할인, 사용 횟수 제한, 만료일 설정
- **추천 코드**: 기존 회원이 신규 회원 추천 → 양쪽 혜택 (Phase 2 고려)

---

## 3. Code Type Taxonomy

### 3.1 코드 타입 정의

| Type | Label | Purpose | 가입 시 | 결제 시 |
|------|-------|---------|---------|---------|
| `beta` | 베타코드 | 베타테스터 초대 | 가입 허용 | 영향 없음 |
| `partner` | 제휴코드 | 채널 파트너 유입 추적 + 할인 | 가입 허용 + 쿠폰 자동 지급 | 쿠폰으로 할인 |
| `promo` | 프로모코드 | 기존 회원 대상 프로모션 | N/A (가입 후 입력) | 쿠폰으로 할인 |

### 3.2 제휴코드 상세 (partner)

- **생성**: 관리자가 채널별 코드 발급 (예: `PARTNER-유튜브채널명-2026`)
- **가입 플로우**: 회원가입 시 "초대/제휴 코드" 입력란에 입력
- **자동 쿠폰 지급**: 가입 완료 시 `partner_coupon_template`에 정의된 쿠폰 자동 생성
- **기본 혜택**: 결제 금액 20% 할인, 10회 사용 가능
- **차감 규칙**: 월구독 결제 1회 = 1회 차감, 연구독 결제 1회 = 1회 차감

### 3.3 프로모코드 상세 (promo) — Phase 2

- 관리자가 캠페인별 쿠폰 템플릿 생성
- 코드 입력 or 직접 지급 → 사용자 쿠폰 월렛에 추가
- 다양한 할인 유형: %, 정액, 무료 기간 등

---

## 4. Database Schema Design

### 4.1 기존 테이블 확장: `beta_invite_codes` → `invite_codes`

```sql
-- 테이블명 변경 없이 컬럼 추가 (하위 호환)
ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS code_type text NOT NULL DEFAULT 'beta'
    CHECK (code_type IN ('beta', 'partner', 'promo')),
  ADD COLUMN IF NOT EXISTS channel text,           -- 제휴 채널명 (partner용)
  ADD COLUMN IF NOT EXISTS coupon_template_id uuid; -- 자동 지급할 쿠폰 템플릿 참조

CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_type
  ON public.beta_invite_codes(code_type);
```

> **결정**: 테이블명을 `invite_codes`로 rename 하지 않음 — RLS 정책, trigger, RPC, 서비스 코드 전부 수정해야 하므로 리스크 대비 이점 없음. `code_type` 컬럼으로 구분.

### 4.2 신규 테이블: `coupon_templates`

쿠폰의 "규칙"을 정의하는 템플릿.

```sql
CREATE TABLE IF NOT EXISTS public.coupon_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- "제휴 20% 할인", "런칭 프로모"
  description text,
  discount_type text NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_period')),
  discount_value numeric NOT NULL,       -- percentage: 20, fixed: 10000, free_period: 1(개월)
  max_uses int NOT NULL DEFAULT 10,      -- 최대 사용 횟수
  valid_days int,                        -- 발급일로부터 유효기간 (null=무제한)
  stackable boolean NOT NULL DEFAULT false,  -- 중복 사용 가능 여부
  applicable_plans text[] DEFAULT '{}',  -- 적용 가능 플랜 (빈 배열=전체)
  min_plan text,                         -- 최소 플랜 요구 (null=없음)
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_templates ENABLE ROW LEVEL SECURITY;
```

### 4.3 신규 테이블: `user_coupons`

사용자에게 지급된 개별 쿠폰 (쿠폰 월렛).

```sql
CREATE TABLE IF NOT EXISTS public.user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES coupon_templates(id),
  source_code_id uuid REFERENCES beta_invite_codes(id),  -- 어떤 코드로 지급되었는지
  source_type text NOT NULL DEFAULT 'partner'
    CHECK (source_type IN ('partner', 'promo', 'admin', 'referral')),

  -- 할인 규칙 (템플릿에서 복사, 발급 시 스냅샷)
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,

  -- 사용 추적
  max_uses int NOT NULL,
  used_count int NOT NULL DEFAULT 0,

  -- 유효기간
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,               -- issued_at + template.valid_days

  -- 상태
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'exhausted', 'expired', 'revoked')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_coupons_user_status ON public.user_coupons(user_id, status);
CREATE INDEX idx_user_coupons_hospital ON public.user_coupons(hospital_id);

ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;
```

### 4.4 신규 테이블: `coupon_redemptions`

쿠폰 사용 이력 (결제 연동).

```sql
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES user_coupons(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  hospital_id uuid NOT NULL REFERENCES hospitals(id),

  -- 결제 연동
  payment_id uuid,                       -- payments 테이블 참조 (nullable, 무료 기간은 null)
  billing_cycle text,                    -- 'monthly' | 'yearly'

  -- 할인 계산
  original_amount int NOT NULL,          -- 할인 전 금액
  discount_amount int NOT NULL,          -- 할인 금액
  final_amount int NOT NULL,             -- 최종 결제 금액

  redeemed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_hospital ON public.coupon_redemptions(hospital_id, redeemed_at DESC);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
```

### 4.5 ERD Summary

```
beta_invite_codes (확장)
  ├─ code_type: beta | partner | promo
  ├─ channel: 제휴 채널명
  └─ coupon_template_id ──→ coupon_templates.id

coupon_templates
  ├─ discount_type, discount_value, max_uses
  └─ valid_days, stackable, applicable_plans

user_coupons (쿠폰 월렛)
  ├─ user_id ──→ auth.users
  ├─ template_id ──→ coupon_templates
  ├─ source_code_id ──→ beta_invite_codes
  ├─ used_count / max_uses
  └─ status: active | exhausted | expired | revoked

coupon_redemptions (사용 이력)
  ├─ coupon_id ──→ user_coupons
  ├─ payment_id ──→ payments
  └─ original_amount, discount_amount, final_amount
```

---

## 5. Core Business Logic

### 5.1 제휴코드 가입 플로우

```
1. 사용자가 회원가입 시 코드 입력 (기존 베타코드 입력란 재사용)
2. verify_beta_invite_code RPC가 code_type도 반환하도록 확장
3. code_type === 'partner' → 프론트에서 "제휴 할인 혜택이 적용됩니다" 안내
4. handle_new_user trigger에서:
   a. 기존 베타코드 로직 실행 (가입 허용)
   b. code_type === 'partner' → 쿠폰 자동 지급:
      - coupon_template_id로 템플릿 조회
      - user_coupons에 INSERT (스냅샷 복사)
      - expires_at = now() + template.valid_days
5. 가입 완료 → 사용자 쿠폰 월렛에 쿠폰 존재
```

### 5.2 결제 시 쿠폰 적용 플로우

```
1. 구독 결제 화면에서 "쿠폰 적용" 버튼
2. 사용 가능한 쿠폰 목록 조회 (status=active, used_count < max_uses, not expired)
3. 쿠폰 선택 → 할인 금액 미리보기 계산
4. TossPayments 결제 요청 시:
   a. original_amount: 플랜 정가
   b. discount_amount: 쿠폰 할인액 (percentage면 정가 * rate / 100)
   c. final_amount: original - discount (최소 0)
   d. TossPayments에는 final_amount로 결제 요청
5. 결제 성공 콜백에서:
   a. coupon_redemptions INSERT
   b. user_coupons.used_count += 1
   c. used_count >= max_uses → status = 'exhausted'
```

### 5.3 할인 계산 규칙

| discount_type | discount_value | 계산 |
|---------------|----------------|------|
| `percentage` | 20 | `amount * 20 / 100` |
| `fixed_amount` | 10000 | `min(10000, amount)` |
| `free_period` | 1 | 1개월 무료 (amount = 0) |

- **최소 결제 금액**: 100원 (TossPayments 최소)
- **연구독 할인**: 연구독 정가에 쿠폰 % 적용 (이미 연간 할인이 적용된 금액 기준)
- **중복 적용**: `stackable=false`가 기본 → 1회 결제에 1쿠폰만

### 5.4 쿠폰 만료 처리

- **배치**: 매일 자동 실행 (pg_cron 또는 Edge Function cron)
- **로직**: `status='active' AND expires_at < now()` → `status='expired'`
- **또는**: 결제 시점에 lazy 체크 (expires_at 확인 후 사용 불가 처리)
- **권장**: lazy 체크 + 주간 배치 정리 (복잡도 최소화)

---

## 6. UI Changes

### 6.1 사이드바 변경

| Before | After |
|--------|-------|
| "베타 코드 관리" | **"코드 관리"** |

- `adminTabs.ts`: `beta_invites` 탭 title 변경
- 탭 key는 `beta_invites` 유지 (하위 호환)

### 6.2 관리자 UI 변경

#### 코드 관리 탭 (SystemAdminBetaCodesTab 확장)

**헤더 변경**: "베타코드 생성" → **"코드 생성"**

**코드 생성 폼 변경**:
- [NEW] **코드 타입 선택**: 베타코드 / 제휴코드 / 프로모코드
- [NEW] 제휴코드 선택 시:
  - 채널명 입력 (필수)
  - 쿠폰 템플릿 선택 (기본: "제휴 20% 할인 10회")
  - 코드 형식: `PARTNER-{채널약어}-{4자리}` (예: PARTNER-YTDR-A2B3)
- 기존 베타코드 필드 유지 (배포 대상, 연락처, 메모, 사용정책)

**코드 목록 테이블 변경**:
- [NEW] 타입 배지 컬럼 (베타/제휴/프로모)
- [NEW] 채널 컬럼 (제휴코드만)
- 타입별 필터 드롭다운

#### 쿠폰 관리 섹션 (NEW)

**쿠폰 템플릿 관리**:
- 템플릿 CRUD (이름, 할인유형, 할인값, 최대사용횟수, 유효기간)
- 기본 제공 템플릿: "제휴 20% 할인 10회"

**지급된 쿠폰 현황**:
- 병원별/사용자별 쿠폰 목록
- 상태별 필터 (활성/소진/만료/회수)
- 사용 이력 확인

### 6.3 회원가입 UI 변경

- 코드 입력란 라벨: "베타테스터 초대 코드" → **"초대/제휴 코드"** (코드 필수 기간)
- 코드 필수 기간 종료 후: **"제휴 코드 (선택)"** 으로 표시
- 제휴코드 검증 성공 시: "제휴 할인 혜택이 적용됩니다 (결제 시 20% 할인 10회)" 안내 표시

### 6.4 결제 UI 변경

- 구독 결제 화면에 **"쿠폰 적용"** 버튼 추가
- 쿠폰 선택 모달: 사용 가능한 쿠폰 목록, 할인 미리보기
- 결제 요약: 정가, 할인액, 최종 금액 표시

---

## 7. Service Layer Changes

### 7.1 기존 서비스 수정

#### `betaInviteService.ts` → 확장

```typescript
// 타입 추가
export type CodeType = 'beta' | 'partner' | 'promo';

export interface BetaInviteCodeRow {
  // ... 기존 필드
  code_type: CodeType;       // NEW
  channel: string | null;    // NEW
  coupon_template_id: string | null;  // NEW
}

// createCode에 code_type, channel 파라미터 추가
// generateCode에 타입별 prefix 로직 추가
//   beta → BETA-XXXX-YYYY
//   partner → PARTNER-{channel}-XXXX
//   promo → PROMO-XXXX-YYYY
```

#### `authService.ts` — signUp 확장

```typescript
// handle_new_user trigger가 쿠폰 자동 지급하므로
// 프론트 변경 최소화: code_type 정보만 메타데이터에 추가 전달
```

### 7.2 신규 서비스

#### `couponService.ts`

```typescript
// 쿠폰 템플릿 CRUD
createTemplate(params): Promise<CouponTemplate>
listTemplates(): Promise<CouponTemplate[]>
updateTemplate(id, params): Promise<CouponTemplate>

// 사용자 쿠폰
listUserCoupons(userId, hospitalId): Promise<UserCoupon[]>
getAvailableCoupons(userId, hospitalId, plan): Promise<UserCoupon[]>
issueCoupon(userId, hospitalId, templateId, sourceCodeId?): Promise<UserCoupon>
revokeCoupon(couponId): Promise<void>

// 결제 연동
calculateDiscount(couponId, originalAmount): Promise<DiscountResult>
redeemCoupon(couponId, paymentId, amounts): Promise<CouponRedemption>

// 만료 처리
expireOverdueCoupons(): Promise<number>
```

### 7.3 Edge Function 변경

#### `toss-payment-confirm` 확장

```typescript
// 결제 확인 시 쿠폰 적용 검증:
// 1. coupon_id가 있으면 user_coupons 조회
// 2. 할인 금액 재계산 (클라이언트 조작 방지)
// 3. final_amount === TossPayments 승인 금액 일치 확인
// 4. 결제 성공 → coupon_redemptions INSERT + used_count 증가
```

---

## 8. Implementation Phases

### Phase 1: 코드 타입 확장 + UI 리네이밍 (MVP)
**예상 작업량**: 중간

1. DB 마이그레이션: `beta_invite_codes`에 `code_type`, `channel`, `coupon_template_id` 추가
2. `betaInviteService.ts` 확장 (타입별 코드 생성, 필터)
3. `SystemAdminBetaCodesTab` UI 변경 (코드 타입 선택, 채널 입력, 필터)
4. `adminTabs.ts`: "베타 코드 관리" → "코드 관리"
5. 헤더: "베타코드 생성" → "코드 생성"
6. 회원가입 UI: 라벨 변경

### Phase 2: 쿠폰 시스템 (Core)
**예상 작업량**: 대형

1. DB 마이그레이션: `coupon_templates`, `user_coupons`, `coupon_redemptions` 테이블 생성
2. `couponService.ts` 신규 작성
3. `handle_new_user` trigger 확장 (제휴코드 → 쿠폰 자동 지급)
4. `verify_beta_invite_code` RPC 확장 (code_type 반환)
5. 관리자 UI: 쿠폰 템플릿 관리 섹션
6. 관리자 UI: 지급된 쿠폰 현황

### Phase 3: 결제 연동 + 쿠폰 적용
**예상 작업량**: 대형

1. 결제 화면 "쿠폰 적용" UI
2. `toss-payment-confirm` Edge Function 확장
3. `process_payment_callback` DB function 확장
4. 쿠폰 사용 이력 (coupon_redemptions) 기록
5. 할인 금액 재검증 로직 (서버 사이드)

### Phase 4: 운영 도구 + 분석
**예상 작업량**: 소형

1. 쿠폰 만료 배치 (lazy + 주간 정리)
2. 채널별 전환율 대시보드
3. 쿠폰 사용 통계 (지급/사용/소멸 현황)
4. 프로모코드 입력 UI (기존 회원용)

---

## 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| TossPayments amount 조작 | 높음 | 서버에서 할인액 재계산 후 승인 금액 비교 검증 |
| 쿠폰 중복 사용 (race condition) | 중간 | DB 트랜잭션 + used_count CHECK 제약 |
| 기존 베타코드 호환성 깨짐 | 높음 | 테이블 rename 없이 컬럼 추가, 기본값 'beta' |
| 만료 쿠폰 결제 시도 | 낮음 | 결제 시점 lazy 체크 + 서버 재검증 |
| handle_new_user trigger 복잡도 | 중간 | 쿠폰 지급을 별도 함수로 분리 |

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| 제휴코드 가입 전환율 | > 15% | 코드 발급 수 대비 가입 완료 수 |
| 쿠폰 사용률 | > 40% | 지급 쿠폰 중 1회 이상 사용 비율 |
| 제휴 채널 구독 전환율 | > 10% | 제휴코드 가입자 중 유료 구독 전환 |
| 쿠폰 적용 결제 ARPU | 모니터링 | 할인 적용 후 실결제 평균 |

---

## 11. Out of Scope (Phase 2+ 고려)

- 추천 코드 (기존 회원 → 신규 회원 양방향 혜택)
- 쿠폰 스태킹 (복수 쿠폰 동시 적용)
- 자동 프로모션 엔진 (조건 기반 자동 쿠폰 발행)
- 외부 제휴 API (제휴사 직접 코드 조회/관리)

---

## 12. Dependencies

- `beta_invite_codes` 테이블 및 RLS 정책
- `handle_new_user` trigger (서버 사이드 가입 처리)
- `verify_beta_invite_code` RPC
- `toss-payment-confirm` Edge Function
- `process_payment_callback` DB function
- TossPayments billing MID (`bill_denjo91ih`)
