# Code & Coupon Management System - Design Document

> Feature: code-coupon-system
> Plan: `docs/01-plan/features/code-coupon-system.plan.md`
> Created: 2026-03-06
> Status: Design

---

## 1. Architecture Overview

### 1.1 System Boundary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React)                              │
│                                                                         │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │
│  │ AuthForm     │  │ PricingPage /    │  │ SystemAdminBetaCodesTab  │  │
│  │ (가입 코드)   │  │ PaymentFlow      │  │ → SystemAdminCodesTab    │  │
│  │              │  │ (쿠폰 적용)       │  │ (코드+쿠폰 관리)          │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬───────────────┘  │
│         │                   │                        │                  │
│  ┌──────┴───────────────────┴────────────────────────┴───────────────┐  │
│  │              Services Layer                                       │  │
│  │  betaInviteService.ts (확장)  │  couponService.ts (NEW)           │  │
│  │  tossPaymentService.ts (확장)  │  authService.ts (확장)            │  │
│  └──────┬───────────────────┬────────────────────────┬───────────────┘  │
└─────────┼───────────────────┼────────────────────────┼──────────────────┘
          │                   │                        │
┌─────────┼───────────────────┼────────────────────────┼──────────────────┐
│         │              Supabase                      │                  │
│  ┌──────┴──────────┐  ┌────┴──────────────┐  ┌──────┴───────────────┐  │
│  │ beta_invite_    │  │ coupon_templates  │  │ toss-payment-confirm │  │
│  │ codes (확장)     │  │ user_coupons     │  │ Edge Function (확장)  │  │
│  │                 │  │ coupon_redemptions│  │                      │  │
│  ├─────────────────┤  ├──────────────────┤  ├──────────────────────┤  │
│  │ RPC:            │  │ RLS:             │  │ process_payment_     │  │
│  │ verify_beta_    │  │ admin + owner    │  │ callback (확장)       │  │
│  │ invite_code     │  │                  │  │                      │  │
│  │ (확장: code_type)│  │ RPC:             │  │                      │  │
│  │                 │  │ issue_partner_   │  │                      │  │
│  │ handle_new_user │  │ coupon (NEW)     │  │                      │  │
│  │ trigger (확장)   │  │ redeem_coupon    │  │                      │  │
│  │                 │  │ (NEW)            │  │                      │  │
│  └─────────────────┘  └──────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Design Principles

1. **하위 호환**: `beta_invite_codes` 테이블명 유지, `code_type DEFAULT 'beta'`로 기존 데이터 무결
2. **서버 권위**: 할인 금액은 항상 서버에서 재계산 (클라이언트 조작 방지)
3. **스냅샷 패턴**: `user_coupons`에 템플릿 값 복사 → 템플릿 수정이 기존 쿠폰에 영향 안 줌
4. **원자적 차감**: 쿠폰 사용(redeem)은 DB 함수 내 트랜잭션으로 race condition 방지

---

## 2. Database Design

### 2.1 Migration: `beta_invite_codes` 컬럼 추가

**파일**: `supabase/migrations/YYYYMMDDHHMMSS_add_code_type_to_invite_codes.sql`

```sql
-- 코드 타입 구분 (기존 코드는 'beta')
ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS code_type text NOT NULL DEFAULT 'beta';

ALTER TABLE public.beta_invite_codes
  ADD CONSTRAINT beta_invite_codes_code_type_chk
  CHECK (code_type IN ('beta', 'partner', 'promo'));

-- 제휴 채널명 (partner 코드 전용)
ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS channel text;

-- 자동 지급할 쿠폰 템플릿 (partner/promo 코드용)
ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS coupon_template_id uuid;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_code_type
  ON public.beta_invite_codes(code_type);

-- partner 코드에서 channel은 필수
ALTER TABLE public.beta_invite_codes
  ADD CONSTRAINT beta_invite_codes_partner_channel_chk
  CHECK (code_type != 'partner' OR channel IS NOT NULL);
```

**영향 분석**:
- 기존 `beta_invite_codes` 행들: `code_type='beta'`, `channel=NULL`, `coupon_template_id=NULL` → 정상
- 기존 RLS 정책: 변경 없음 (admin only)
- 기존 `verify_beta_invite_code` RPC: 변경 필요 (code_type 반환 추가)
- 기존 `handle_new_user` trigger: 변경 필요 (partner 쿠폰 자동 지급)

### 2.2 Migration: `coupon_templates` 테이블

**파일**: `supabase/migrations/YYYYMMDDHHMMSS_create_coupon_tables.sql`

```sql
-- ═══════════════════════════════════════════
-- coupon_templates: 쿠폰 규칙 정의
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.coupon_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,

  -- 할인 규칙
  discount_type text NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value numeric NOT NULL
    CHECK (discount_value > 0),
  max_uses int NOT NULL DEFAULT 10
    CHECK (max_uses > 0),
  valid_days int
    CHECK (valid_days IS NULL OR valid_days > 0),

  -- 적용 범위
  applicable_plans text[] NOT NULL DEFAULT '{}',

  -- 상태
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_templates ENABLE ROW LEVEL SECURITY;

-- RLS: admin만 CRUD
CREATE POLICY coupon_templates_admin_all ON public.coupon_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- FK: beta_invite_codes.coupon_template_id → coupon_templates.id
ALTER TABLE public.beta_invite_codes
  ADD CONSTRAINT beta_invite_codes_coupon_template_fk
  FOREIGN KEY (coupon_template_id)
  REFERENCES public.coupon_templates(id);

-- 기본 제휴 쿠폰 템플릿 (seed)
INSERT INTO public.coupon_templates (name, description, discount_type, discount_value, max_uses, valid_days)
VALUES (
  '제휴 20% 할인',
  '제휴 채널 가입자 전용 - 결제 금액 20% 할인 (10회)',
  'percentage',
  20,
  10,
  365
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════
-- user_coupons: 사용자별 쿠폰 월렛
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.coupon_templates(id),
  source_code_id uuid REFERENCES public.beta_invite_codes(id),
  source_type text NOT NULL DEFAULT 'partner'
    CHECK (source_type IN ('partner', 'promo', 'admin')),

  -- 할인 규칙 스냅샷 (발급 시 템플릿에서 복사)
  discount_type text NOT NULL,
  discount_value numeric NOT NULL,
  max_uses int NOT NULL,
  used_count int NOT NULL DEFAULT 0
    CHECK (used_count >= 0),

  -- 유효기간
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,

  -- 상태
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'exhausted', 'expired', 'revoked')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- used_count는 max_uses를 초과할 수 없음
  CONSTRAINT user_coupons_uses_limit CHECK (used_count <= max_uses)
);

CREATE INDEX idx_user_coupons_user_status
  ON public.user_coupons(user_id, status);
CREATE INDEX idx_user_coupons_hospital
  ON public.user_coupons(hospital_id);

ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

-- RLS: 본인 쿠폰 조회 + admin 전체
CREATE POLICY user_coupons_owner_select ON public.user_coupons
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- admin만 INSERT/UPDATE/DELETE
CREATE POLICY user_coupons_admin_modify ON public.user_coupons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- service_role은 모든 작업 가능 (trigger에서 사용)
GRANT ALL ON public.user_coupons TO service_role;

-- ═══════════════════════════════════════════
-- coupon_redemptions: 쿠폰 사용 이력
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.user_coupons(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id),

  -- 결제 연동
  billing_id uuid,          -- billing_history.id 참조
  billing_cycle text,        -- 'monthly' | 'yearly'

  -- 할인 계산 기록
  original_amount int NOT NULL,
  discount_amount int NOT NULL CHECK (discount_amount >= 0),
  final_amount int NOT NULL CHECK (final_amount >= 0),

  redeemed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_coupon_redemptions_coupon
  ON public.coupon_redemptions(coupon_id);
CREATE INDEX idx_coupon_redemptions_hospital
  ON public.coupon_redemptions(hospital_id, redeemed_at DESC);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS: 본인 이력 조회 + admin 전체
CREATE POLICY coupon_redemptions_owner_select ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

GRANT ALL ON public.coupon_redemptions TO service_role;
GRANT ALL ON public.coupon_templates TO service_role;
```

### 2.3 DB Function: `issue_partner_coupon`

가입 trigger에서 호출할 쿠폰 발급 함수.

```sql
CREATE OR REPLACE FUNCTION public.issue_partner_coupon(
  p_user_id uuid,
  p_hospital_id uuid,
  p_code_id uuid,
  p_template_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_template coupon_templates;
  v_coupon_id uuid;
  v_expires timestamptz;
BEGIN
  SELECT * INTO v_template
    FROM coupon_templates
    WHERE id = p_template_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;  -- 템플릿 없으면 무시 (가입 자체는 차단하지 않음)
  END IF;

  IF v_template.valid_days IS NOT NULL THEN
    v_expires := now() + (v_template.valid_days || ' days')::interval;
  ELSE
    v_expires := NULL;
  END IF;

  INSERT INTO user_coupons (
    user_id, hospital_id, template_id, source_code_id, source_type,
    discount_type, discount_value, max_uses,
    issued_at, expires_at, status
  ) VALUES (
    p_user_id, p_hospital_id, p_template_id, p_code_id, 'partner',
    v_template.discount_type, v_template.discount_value, v_template.max_uses,
    now(), v_expires, 'active'
  ) RETURNING id INTO v_coupon_id;

  RETURN v_coupon_id;
END;
$$;
```

### 2.4 DB Function: `redeem_coupon`

결제 시 쿠폰을 원자적으로 사용하는 함수.

```sql
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_coupon_id uuid,
  p_user_id uuid,
  p_hospital_id uuid,
  p_billing_id uuid,
  p_billing_cycle text,
  p_original_amount int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_coupon user_coupons;
  v_discount int;
  v_final int;
BEGIN
  -- 쿠폰 조회 + 락 (FOR UPDATE)
  SELECT * INTO v_coupon
    FROM user_coupons
    WHERE id = p_coupon_id
      AND user_id = p_user_id
      AND hospital_id = p_hospital_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_not_found');
  END IF;

  -- 상태 검증
  IF v_coupon.status != 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_not_active');
  END IF;

  IF v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_exhausted');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND now() > v_coupon.expires_at THEN
    -- lazy 만료 처리
    UPDATE user_coupons SET status = 'expired', updated_at = now()
      WHERE id = p_coupon_id;
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_expired');
  END IF;

  -- 할인 계산
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := FLOOR(p_original_amount * v_coupon.discount_value / 100);
  ELSE  -- fixed_amount
    v_discount := LEAST(v_coupon.discount_value::int, p_original_amount);
  END IF;

  v_final := GREATEST(p_original_amount - v_discount, 0);

  -- 사용 횟수 증가
  UPDATE user_coupons
    SET used_count = used_count + 1,
        status = CASE
          WHEN used_count + 1 >= max_uses THEN 'exhausted'
          ELSE 'active'
        END,
        updated_at = now()
    WHERE id = p_coupon_id;

  -- 사용 이력 기록
  INSERT INTO coupon_redemptions (
    coupon_id, user_id, hospital_id,
    billing_id, billing_cycle,
    original_amount, discount_amount, final_amount
  ) VALUES (
    p_coupon_id, p_user_id, p_hospital_id,
    p_billing_id, p_billing_cycle,
    p_original_amount, v_discount, v_final
  );

  RETURN jsonb_build_object(
    'ok', true,
    'discount_amount', v_discount,
    'final_amount', v_final
  );
END;
$$;
```

### 2.5 `verify_beta_invite_code` RPC 확장

기존 반환값 `{ok, message}`에 `code_type` 추가.

```sql
-- verify_beta_invite_code 수정 (기존 함수 DROP & CREATE 또는 CREATE OR REPLACE)
-- 반환값에 code_type 추가:
-- { ok: true, message: '...', code_type: 'beta' | 'partner' | 'promo' }
```

### 2.6 `handle_new_user` trigger 확장

기존 코드 소모 로직 이후에 쿠폰 자동 지급 추가:

```sql
-- handle_new_user trigger 내부 (partner 코드 처리 추가)
-- 기존 코드 소모 성공 후:
IF v_code_type = 'partner' AND v_coupon_template_id IS NOT NULL THEN
  PERFORM issue_partner_coupon(
    NEW.id,
    v_hospital_id,  -- profiles INSERT 직후의 hospital_id
    v_code_id,
    v_coupon_template_id
  );
END IF;
```

**주의**: `handle_new_user`는 `auth.users` INSERT trigger이므로 profiles가 아직 생성 전. hospital_id는 `raw_user_meta_data`에서 추출하거나, profiles INSERT 직후에 쿠폰 지급 로직을 실행해야 함.

**설계 결정**: 쿠폰 지급은 profiles INSERT 이후에 실행. trigger 내에서 profiles INSERT → coupon INSERT 순서로 처리.

---

## 3. Service Layer Design

### 3.1 `betaInviteService.ts` 확장

#### 타입 변경

```typescript
export type CodeType = 'beta' | 'partner' | 'promo';

export interface BetaInviteCodeRow {
  // 기존 필드 전부 유지
  id: string;
  code: string;
  distributed_to: string | null;
  distributed_contact: string | null;
  note: string | null;
  usage_mode: 'single' | 'unlimited';
  is_active: boolean;
  verify_count: number;
  last_verified_at: string | null;
  expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // NEW
  code_type: CodeType;
  channel: string | null;
  coupon_template_id: string | null;
}

export interface BetaCodeVerifyResult {
  ok: boolean;
  message: string;
  codeType?: CodeType;  // NEW: 프론트에서 제휴코드 안내 표시용
}

interface CreateBetaCodeParams {
  // 기존 필드 유지
  distributedTo?: string;
  distributedContact?: string;
  note?: string;
  expiresAt?: string | null;
  usageMode?: 'single' | 'unlimited';
  // NEW
  codeType?: CodeType;
  channel?: string;
  couponTemplateId?: string;
}
```

#### 코드 생성 함수 확장

```typescript
export function generateCode(codeType: CodeType, channel?: string): string {
  const seg = () => buildRandomSegment(4);
  switch (codeType) {
    case 'partner': {
      // PARTNER-{채널약어 최대4자}-{4자리}
      const ch = (channel || 'PRTN').substring(0, 4).toUpperCase();
      return `PARTNER-${ch}-${seg()}`;
    }
    case 'promo':
      return `PROMO-${seg()}-${seg()}`;
    case 'beta':
    default:
      return `BETA-${seg()}-${seg()}`;
  }
}
```

#### createCode 수정

```typescript
async createCode(params: CreateBetaCodeParams): Promise<BetaInviteCodeRow> {
  const codeType = params.codeType || 'beta';
  const channel = codeType === 'partner' ? (params.channel || null) : null;
  const couponTemplateId = params.couponTemplateId || null;
  // ... 기존 로직
  const code = generateCode(codeType, channel || undefined);
  // INSERT에 code_type, channel, coupon_template_id 추가
}
```

#### listCodes 수정

```typescript
async listCodes(codeType?: CodeType): Promise<BetaInviteCodeRow[]> {
  let query = supabase
    .from('beta_invite_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (codeType) {
    query = query.eq('code_type', codeType);
  }
  // ...
}
```

### 3.2 `couponService.ts` (NEW)

```typescript
// services/couponService.ts

import { supabase } from './supabaseClient';

// ─── Types ───────────────────────────────────────

export interface CouponTemplate {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number;
  valid_days: number | null;
  applicable_plans: string[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCoupon {
  id: string;
  user_id: string;
  hospital_id: string;
  template_id: string;
  source_code_id: string | null;
  source_type: 'partner' | 'promo' | 'admin';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number;
  used_count: number;
  issued_at: string;
  expires_at: string | null;
  status: 'active' | 'exhausted' | 'expired' | 'revoked';
  created_at: string;
  updated_at: string;
  // JOIN으로 가져올 수 있는 필드
  template?: CouponTemplate;
}

export interface CouponRedemption {
  id: string;
  coupon_id: string;
  user_id: string;
  hospital_id: string;
  billing_id: string | null;
  billing_cycle: string | null;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  redeemed_at: string;
}

export interface DiscountPreview {
  coupon_id: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  remaining_uses: number;
}

// ─── Service ─────────────────────────────────────

export const couponService = {
  // ── 템플릿 관리 (admin) ──

  async listTemplates(): Promise<CouponTemplate[]> {
    const { data, error } = await supabase
      .from('coupon_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error('쿠폰 템플릿 목록 조회 실패');
    return (data || []) as CouponTemplate[];
  },

  async createTemplate(params: {
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    maxUses: number;
    validDays?: number | null;
    applicablePlans?: string[];
  }): Promise<CouponTemplate> {
    const { data: authData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('coupon_templates')
      .insert({
        name: params.name,
        description: params.description || null,
        discount_type: params.discountType,
        discount_value: params.discountValue,
        max_uses: params.maxUses,
        valid_days: params.validDays ?? null,
        applicable_plans: params.applicablePlans || [],
        created_by: authData.user?.id || null,
      })
      .select('*')
      .single();
    if (error || !data) throw new Error('쿠폰 템플릿 생성 실패');
    return data as CouponTemplate;
  },

  async updateTemplate(id: string, params: Partial<{
    name: string;
    description: string | null;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    maxUses: number;
    validDays: number | null;
    applicablePlans: string[];
    isActive: boolean;
  }>): Promise<CouponTemplate> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (params.name !== undefined) update.name = params.name;
    if (params.description !== undefined) update.description = params.description;
    if (params.discountType !== undefined) update.discount_type = params.discountType;
    if (params.discountValue !== undefined) update.discount_value = params.discountValue;
    if (params.maxUses !== undefined) update.max_uses = params.maxUses;
    if (params.validDays !== undefined) update.valid_days = params.validDays;
    if (params.applicablePlans !== undefined) update.applicable_plans = params.applicablePlans;
    if (params.isActive !== undefined) update.is_active = params.isActive;

    const { data, error } = await supabase
      .from('coupon_templates')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) throw new Error('쿠폰 템플릿 수정 실패');
    return data as CouponTemplate;
  },

  // ── 사용자 쿠폰 ──

  async listUserCoupons(hospitalId: string): Promise<UserCoupon[]> {
    const { data, error } = await supabase
      .from('user_coupons')
      .select('*, template:coupon_templates(*)')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('쿠폰 목록 조회 실패');
    return (data || []) as UserCoupon[];
  },

  async getAvailableCoupons(hospitalId: string): Promise<UserCoupon[]> {
    const { data, error } = await supabase
      .from('user_coupons')
      .select('*, template:coupon_templates(*)')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active')
      .order('expires_at', { ascending: true, nullsFirst: false });
    if (error) throw new Error('사용 가능 쿠폰 조회 실패');
    // 클라이언트에서 추가 필터: expires_at 체크
    const now = new Date();
    return ((data || []) as UserCoupon[]).filter(c =>
      c.used_count < c.max_uses &&
      (!c.expires_at || new Date(c.expires_at) > now)
    );
  },

  async revokeCoupon(couponId: string): Promise<void> {
    const { error } = await supabase
      .from('user_coupons')
      .update({ status: 'revoked', updated_at: new Date().toISOString() })
      .eq('id', couponId);
    if (error) throw new Error('쿠폰 회수 실패');
  },

  // ── 할인 미리보기 (클라이언트 계산, 참고용) ──

  previewDiscount(coupon: UserCoupon, originalAmount: number): DiscountPreview {
    let discountAmount: number;
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.floor(originalAmount * coupon.discount_value / 100);
    } else {
      discountAmount = Math.min(coupon.discount_value, originalAmount);
    }
    const finalAmount = Math.max(originalAmount - discountAmount, 0);

    return {
      coupon_id: coupon.id,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      original_amount: originalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      remaining_uses: coupon.max_uses - coupon.used_count,
    };
  },

  // ── 쿠폰 사용 이력 ──

  async listRedemptions(hospitalId: string): Promise<CouponRedemption[]> {
    const { data, error } = await supabase
      .from('coupon_redemptions')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('redeemed_at', { ascending: false })
      .limit(200);
    if (error) throw new Error('쿠폰 사용 이력 조회 실패');
    return (data || []) as CouponRedemption[];
  },
};
```

### 3.3 `tossPaymentService.ts` 확장

#### 결제 요청 시 쿠폰 ID 전달

```typescript
export interface TossPaymentRequest {
  hospitalId: string;
  plan: PlanType;
  billingCycle: BillingCycle;
  customerName: string;
  paymentMethod: 'card' | 'transfer';
  couponId?: string;  // NEW: 적용할 쿠폰 ID
}
```

#### billing_history에 쿠폰 정보 저장

```typescript
// billing_history INSERT 시 추가 컬럼:
// coupon_id: uuid (nullable)
// coupon_discount_amount: int (nullable)
// 정가 amount와 별도로 저장하여 추적
```

#### confirmPayment에 쿠폰 정보 전달

```typescript
// confirmPayment 호출 시 body에 couponId 추가
// toss-payment-confirm Edge Function에서 redeem_coupon RPC 호출
```

---

## 4. Edge Function Design

### 4.1 `toss-payment-confirm` 확장

**변경 포인트**: 쿠폰 적용 시 금액 재계산 로직 추가

```typescript
// 기존 calcCanonicalAmount 수정:
function calcCanonicalAmount(
  plan: string,
  billingCycle: string,
  couponDiscount?: { type: string; value: number }
): { canonical: number; discount: number; final: number } | null {
  const prices = PLAN_BASE_PRICES[plan];
  if (!prices) return null;

  const basePrice = billingCycle === "yearly"
    ? prices.yearly * 12
    : prices.monthly;
  const canonical = basePrice + Math.round(basePrice * 0.1); // VAT 포함

  if (!couponDiscount) {
    return { canonical, discount: 0, final: canonical };
  }

  let discount: number;
  if (couponDiscount.type === 'percentage') {
    discount = Math.floor(canonical * couponDiscount.value / 100);
  } else {
    discount = Math.min(couponDiscount.value, canonical);
  }

  const final = Math.max(canonical - discount, 0);
  return { canonical, discount, final };
}
```

**쿠폰 적용 플로우**:

```typescript
// 1. body에서 couponId 추출
const couponId = typeof body.couponId === 'string' ? body.couponId.trim() : null;

// 2. couponId가 있으면 user_coupons 조회 (서버 권위)
let couponDiscount = null;
if (couponId) {
  const { data: coupon } = await adminClient
    .from('user_coupons')
    .select('discount_type, discount_value, status, used_count, max_uses, expires_at, user_id, hospital_id')
    .eq('id', couponId)
    .single();

  // 쿠폰 유효성 검증
  if (!coupon || coupon.status !== 'active' || coupon.used_count >= coupon.max_uses) {
    return jsonResponse({ error: 'Invalid or exhausted coupon' }, 400);
  }
  if (coupon.user_id !== user.id || coupon.hospital_id !== billing.hospital_id) {
    return jsonResponse({ error: 'Coupon ownership mismatch' }, 403);
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return jsonResponse({ error: 'Coupon expired' }, 400);
  }

  couponDiscount = { type: coupon.discount_type, value: Number(coupon.discount_value) };
}

// 3. 금액 재계산
const amounts = calcCanonicalAmount(billingPlan, billingCycleVal, couponDiscount);
if (amounts.final !== amountNum) {
  return jsonResponse({ error: 'Amount mismatch', expected: amounts.final }, 400);
}

// 4. TossPayments confirm 호출 (final amount로)

// 5. 결제 성공 후 쿠폰 차감
if (couponId) {
  await adminClient.rpc('redeem_coupon', {
    p_coupon_id: couponId,
    p_user_id: user.id,
    p_hospital_id: billing.hospital_id,
    p_billing_id: orderId.trim(),
    p_billing_cycle: billingCycleVal,
    p_original_amount: amounts.canonical,
  });
}
```

---

## 5. UI Component Design

### 5.1 관리자 - 코드 관리 탭 변경

#### 파일: `components/system-admin/adminTabs.ts`

```typescript
// 변경: title만 수정
beta_invites: '코드 관리',  // was: '베타 코드 관리'
```

#### 파일: `components/system-admin/tabs/SystemAdminBetaCodesTab.tsx`

**주요 UI 변경**:

1. **헤더 섹션**:
   - "베타코드 생성" → "코드 생성"
   - 코드 타입 탭/드롭다운 추가: 전체 | 베타 | 제휴 | 프로모

2. **코드 생성 폼 확장**:
   ```
   ┌─────────────────────────────────────────────┐
   │ 코드 생성                                     │
   │                                              │
   │ 코드 타입: [베타코드 ▾] [제휴코드] [프로모코드]  │
   │                                              │
   │ ── 제휴코드 선택 시 ──                         │
   │ 채널명*: [____________]  (예: 유튜브닥터림)      │
   │ 쿠폰 템플릿: [제휴 20% 할인 10회 ▾]            │
   │                                              │
   │ ── 공통 ──                                    │
   │ 배포 대상: [____________]                      │
   │ 연락처:   [____________]                      │
   │ 메모:     [____________]                      │
   │ 사용정책:  [1회용 ▾]                           │
   │                                              │
   │              [코드 생성하기]                    │
   └─────────────────────────────────────────────┘
   ```

3. **코드 목록 테이블**:
   - 새 컬럼: 타입 배지 (파란=베타, 보라=제휴, 주황=프로모)
   - 새 컬럼: 채널 (제휴코드만)
   - 타입 필터 드롭다운 (테이블 상단)

4. **상태 박스 확장**:
   - 기존: 가입정책 | 활성코드 | 전체코드
   - 추가: 제휴코드 수 | 지급된 쿠폰 수

### 5.2 관리자 - 쿠폰 관리 섹션

**위치**: 코드 관리 탭 내 하단 섹션 또는 별도 sub-tab

```
┌─────────────────────────────────────────────┐
│ 쿠폰 템플릿                                   │
│                                              │
│ ┌──────────┬──────┬─────┬──────┬──────────┐  │
│ │ 이름     │ 할인  │ 횟수 │ 유효기간│ 상태    │  │
│ ├──────────┼──────┼─────┼──────┼──────────┤  │
│ │ 제휴 20% │ 20%  │ 10회│ 365일│ ●활성    │  │
│ └──────────┴──────┴─────┴──────┴──────────┘  │
│                                              │
│ [+ 템플릿 추가]                               │
│                                              │
│ ─── 지급된 쿠폰 현황 ───                       │
│                                              │
│ ┌────────┬──────┬──────┬────┬──────────────┐ │
│ │ 병원   │ 쿠폰  │ 사용  │잔여│ 상태         │ │
│ ├────────┼──────┼──────┼────┼──────────────┤ │
│ │ A치과  │ 20%  │ 3/10 │ 7 │ ●활성       │ │
│ │ B치과  │ 20%  │ 10/10│ 0 │ ●소진       │ │
│ └────────┴──────┴──────┴────┴──────────────┘ │
└─────────────────────────────────────────────┘
```

### 5.3 회원가입 UI 변경

#### 파일: `components/AuthForm.tsx`, `components/auth/AuthSignup*.tsx`

**변경 1**: 라벨 텍스트

```typescript
// Before
"베타테스터 초대 코드"
// After (코드 필수 기간)
"초대/제휴 코드"
// After (코드 필수 기간 종료 후)
"제휴 코드 (선택)"
```

**변경 2**: 제휴코드 안내 배너

`verifyCode` 반환값에 `codeType`이 `'partner'`일 때:

```
┌───────────────────────────────────────────┐
│ ✅ 제휴 코드 확인 완료                       │
│                                           │
│ 🎁 결제 시 20% 할인 혜택이 10회 적용됩니다.  │
│    (월구독/연구독 모두 적용)                  │
└───────────────────────────────────────────┘
```

**변경 3**: 베타 기간 종료 후 코드 입력 (선택)

베타 기간 종료(`2026-04-01+`) 후에도 제휴코드 입력란을 선택적으로 표시:

```typescript
// betaSignupPolicy 확장
export interface CodeSignupPolicy {
  requiresInviteCode: boolean;  // 기존: 베타 기간 내
  showPartnerCodeInput: boolean; // NEW: 항상 true (제휴코드는 상시 입력 가능)
  // ...
}
```

### 5.4 결제 UI 변경

#### 파일: 결제 관련 컴포넌트 (PricingPage or PaymentFlow)

**쿠폰 적용 영역**:

```
┌───────────────────────────────────────────┐
│ 결제 요약                                   │
│                                           │
│ 플랜: Plus (월간)                           │
│ 정가:               ₩75,900 (VAT 포함)     │
│                                           │
│ 🏷️ 쿠폰: [제휴 20% 할인 (7/10회 남음) ▾]    │
│          할인: -₩15,180                    │
│                                           │
│ ─────────────────────                     │
│ 결제 금액:           ₩60,720               │
│                                           │
│          [결제하기]                         │
└───────────────────────────────────────────┘
```

**쿠폰 선택 드롭다운** (사용 가능 쿠폰이 있을 때만 표시):
- 쿠폰명 + 할인율/금액 + 잔여 횟수 + 만료일
- "쿠폰 미적용" 옵션
- 쿠폰 없으면 드롭다운 숨김

---

## 6. Implementation Order

### Phase 1: 코드 타입 확장 + UI 리네이밍

| Step | Task | Files |
|------|------|-------|
| 1-1 | DB 마이그레이션: code_type, channel, coupon_template_id 추가 | `supabase/migrations/` |
| 1-2 | `betaInviteService.ts` 타입/함수 확장 | `services/betaInviteService.ts` |
| 1-3 | `adminTabs.ts` 탭 이름 변경 | `components/system-admin/adminTabs.ts` |
| 1-4 | `SystemAdminBetaCodesTab` 코드 생성 폼 확장 | `components/system-admin/tabs/SystemAdminBetaCodesTab.tsx` |
| 1-5 | 코드 목록 테이블에 타입 배지/채널 컬럼 추가 | 위 동일 파일 |
| 1-6 | 회원가입 UI 라벨 변경 | `AuthForm.tsx`, `AuthSignup*.tsx` |

### Phase 2: 쿠폰 시스템

| Step | Task | Files |
|------|------|-------|
| 2-1 | DB 마이그레이션: coupon_templates, user_coupons, coupon_redemptions | `supabase/migrations/` |
| 2-2 | DB 함수: issue_partner_coupon, redeem_coupon | 위 마이그레이션에 포함 |
| 2-3 | verify_beta_invite_code RPC 확장 (code_type 반환) | `supabase/migrations/` |
| 2-4 | handle_new_user trigger 확장 (쿠폰 자동 지급) | `supabase/migrations/` |
| 2-5 | `couponService.ts` 신규 작성 | `services/couponService.ts` |
| 2-6 | 관리자 UI: 쿠폰 템플릿 관리 | `SystemAdminBetaCodesTab.tsx` |
| 2-7 | 관리자 UI: 지급된 쿠폰 현황 | 위 동일 파일 |
| 2-8 | 회원가입 제휴코드 안내 배너 | `AuthForm.tsx` |
| 2-9 | 베타 기간 종료 후 제휴코드 선택 입력 | `betaSignupPolicy.ts`, `AuthForm.tsx` |

### Phase 3: 결제 연동

| Step | Task | Files |
|------|------|-------|
| 3-1 | billing_history 컬럼 추가 (coupon_id, discount_amount) | `supabase/migrations/` |
| 3-2 | `tossPaymentService.ts` 확장 (couponId 전달) | `services/tossPaymentService.ts` |
| 3-3 | `toss-payment-confirm` Edge Function 확장 | `supabase/functions/toss-payment-confirm/` |
| 3-4 | 결제 UI: 쿠폰 선택 드롭다운 | 결제 관련 컴포넌트 |
| 3-5 | 결제 UI: 할인 미리보기 + 최종 금액 표시 | 위 동일 |
| 3-6 | process_payment_callback 확장 (쿠폰 기록) | `supabase/migrations/` |

### Phase 4: 운영 도구

| Step | Task | Files |
|------|------|-------|
| 4-1 | 쿠폰 만료 lazy 체크 | `couponService.ts`, `redeem_coupon` |
| 4-2 | 채널별 가입/전환 통계 | `SystemAdminBetaCodesTab.tsx` |
| 4-3 | 쿠폰 사용 통계 대시보드 | 관리자 UI |

---

## 7. Security Considerations

### 7.1 금액 검증 (Critical)

- **원칙**: 클라이언트가 보내는 amount를 절대 신뢰하지 않음
- **구현**: `toss-payment-confirm`에서 plan + billingCycle + coupon으로 서버 독립 계산
- **검증**: `calcCanonicalAmount(plan, cycle, couponDiscount).final === received amount`
- **쿠폰 유효성**: 서버에서 status, used_count, expires_at, 소유권 전부 재확인

### 7.2 Race Condition 방지

- `redeem_coupon` DB 함수에서 `SELECT ... FOR UPDATE` 사용
- `used_count <= max_uses` CHECK 제약으로 DB 레벨 이중 방어
- 결제 실패 시 rollback: `redeem_coupon`은 `toss-payment-confirm` 결제 성공 후에만 호출

### 7.3 RLS 정책

| Table | Select | Insert/Update/Delete |
|-------|--------|----------------------|
| `coupon_templates` | admin only | admin only |
| `user_coupons` | owner + admin | admin + service_role (trigger) |
| `coupon_redemptions` | owner + admin | service_role only |

### 7.4 쿠폰 남용 방지

- 1회 결제에 1쿠폰만 적용 (`stackable=false` 기본)
- `max_uses` 초과 불가 (DB CHECK 제약)
- 만료된 쿠폰 사용 시도 → lazy expire + 거부
- 쿠폰 소유권 검증: `user_id + hospital_id` 매칭 필수

---

## 8. Testing Strategy

### 8.1 Unit Tests

- `generateCode()`: 각 타입별 prefix 형식 검증
- `previewDiscount()`: percentage/fixed_amount 계산 검증
- `normalizeBetaInviteCode()`: 기존 테스트 + partner/promo prefix 호환

### 8.2 Integration Tests

- 제휴코드 가입 → 쿠폰 자동 지급 확인
- 쿠폰 적용 결제 → 할인 금액 정확성
- 쿠폰 소진 (10/10) → status='exhausted' 전이
- 만료 쿠폰 결제 시도 → 거부
- race condition: 동시 결제 시 쿠폰 중복 차감 방지

### 8.3 Edge Cases

- 쿠폰 템플릿 비활성화 후 기존 발급 쿠폰 → 정상 사용 가능 (스냅샷)
- 플랜 다운그레이드 후 쿠폰 사용 → applicable_plans 체크
- 연구독 결제 금액에 쿠폰 % 적용 → 정확한 할인 계산
- TossPayments 최소 결제금액 (100원) 미만 → 에러 or 0원 처리

---

## 9. Migration Safety

### 9.1 Backward Compatibility

- `beta_invite_codes`: 기존 행에 `code_type='beta'` 자동 설정 (DEFAULT)
- 기존 `listCodes()`: 필터 없이 호출하면 전체 반환 (기존 동작 유지)
- `verify_beta_invite_code`: `code_type` 반환 추가 → 기존 클라이언트는 무시
- `handle_new_user`: `code_type='beta'`면 기존 로직 그대로

### 9.2 Rollback Plan

- Phase 1: `code_type`, `channel`, `coupon_template_id` DROP → 원복
- Phase 2: `coupon_templates`, `user_coupons`, `coupon_redemptions` DROP → 원복
- Phase 3: `toss-payment-confirm` 이전 버전 재배포

---

## 10. File Inventory

### 수정 파일

| File | Phase | Change |
|------|-------|--------|
| `services/betaInviteService.ts` | 1 | 타입 확장, generateCode, createCode, listCodes |
| `components/system-admin/adminTabs.ts` | 1 | 탭 이름 변경 |
| `components/system-admin/tabs/SystemAdminBetaCodesTab.tsx` | 1,2 | 코드 타입 UI, 쿠폰 관리 |
| `components/AuthForm.tsx` | 1,2 | 라벨 변경, 제휴 안내 |
| `components/auth/AuthSignupDentistScreen.tsx` | 1 | 라벨 변경 |
| `components/auth/AuthSignupStaffScreen.tsx` | 1 | 라벨 변경 |
| `utils/betaSignupPolicy.ts` | 2 | showPartnerCodeInput 추가 |
| `hooks/useAuthForm.ts` | 2 | codeType 상태, 제휴 안내 로직 |
| `services/tossPaymentService.ts` | 3 | couponId 파라미터 추가 |
| `supabase/functions/toss-payment-confirm/index.ts` | 3 | 쿠폰 할인 검증 + redeem |

### 신규 파일

| File | Phase | Purpose |
|------|-------|---------|
| `services/couponService.ts` | 2 | 쿠폰 CRUD + 할인 계산 |
| `supabase/migrations/YYYYMMDDHHMMSS_add_code_type.sql` | 1 | code_type 컬럼 추가 |
| `supabase/migrations/YYYYMMDDHHMMSS_create_coupon_tables.sql` | 2 | 3개 테이블 + RLS + functions |
| `supabase/migrations/YYYYMMDDHHMMSS_billing_coupon_columns.sql` | 3 | billing_history 쿠폰 컬럼 |
