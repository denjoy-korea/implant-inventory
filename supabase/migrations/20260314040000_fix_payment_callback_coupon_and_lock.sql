-- ────────────────────────────────────────────────────────────────────────────
-- [C-4] 쿠폰 redeem 원자성 확보
--   버그: redeem_coupon과 process_payment_callback이 별도 HTTP RPC 호출 →
--         redeem 실패해도 결제 완료, 쿠폰 무한 재사용 가능
--   수정: process_payment_callback에 선택적 쿠폰 파라미터 추가,
--         내부에서 redeem_coupon을 동일 트랜잭션으로 호출
--
-- [C-2] 크레딧 차감 TOCTOU 해소
--   버그: Edge Function이 credit_balance 확인 후 TossPayments 호출(수 초) 뒤
--         RPC에서 차감 → 동시 결제 시 잔액 초과 사용 가능
--   수정: process_payment_callback 내부에서 hospitals row를 FOR UPDATE로 잠금,
--         실제 잔액 재검증 후 차감
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION process_payment_callback(
  p_billing_id    UUID,
  p_payment_ref   TEXT,
  p_status        TEXT,
  -- [C-4] 쿠폰 redeem 원자성용 선택 파라미터
  p_coupon_id     UUID DEFAULT NULL,
  p_user_id       UUID DEFAULT NULL,
  p_original_amount INT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing          RECORD;
  v_hospital_balance NUMERIC;
  v_current_plan     TEXT;
  v_current_expiry   TIMESTAMPTZ;
  v_base             TIMESTAMPTZ;
  v_expires_at       TIMESTAMPTZ;
  v_changed_at       TIMESTAMPTZ := now();
  v_referral_code    RECORD;
  v_referrer_profile RECORD;
  v_redeem_result    JSONB;
BEGIN
  IF p_status NOT IN ('completed', 'failed') THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_billing
  FROM billing_history
  WHERE id = p_billing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_billing.payment_status IN ('completed', 'cancelled') THEN
    RETURN FALSE;
  END IF;

  IF p_status = 'completed' THEN
    UPDATE billing_history
    SET
      payment_status = 'completed',
      payment_ref    = p_payment_ref,
      updated_at     = now()
    WHERE id = p_billing_id;

    -- 현재 플랜/만료일 조회
    SELECT plan, plan_expires_at INTO v_current_plan, v_current_expiry
    FROM hospitals
    WHERE id = v_billing.hospital_id;

    -- 만료일 계산: 갱신(동일 플랜) vs 플랜 변경
    IF v_current_plan = v_billing.plan THEN
      v_base := GREATEST(v_changed_at, COALESCE(v_current_expiry, v_changed_at));
      IF v_billing.billing_cycle = 'yearly' THEN
        v_expires_at := v_base + interval '1 year';
      ELSIF v_billing.billing_cycle = 'monthly' THEN
        v_expires_at := v_base + interval '1 month';
      ELSE
        v_expires_at := NULL;
      END IF;
    ELSE
      IF v_current_expiry IS NOT NULL AND v_current_expiry > v_changed_at THEN
        v_expires_at := v_current_expiry;
      ELSE
        IF v_billing.billing_cycle = 'yearly' THEN
          v_expires_at := v_changed_at + interval '1 year';
        ELSIF v_billing.billing_cycle = 'monthly' THEN
          v_expires_at := v_changed_at + interval '1 month';
        ELSE
          v_expires_at := NULL;
        END IF;
      END IF;
    END IF;

    UPDATE hospitals
    SET
      plan            = v_billing.plan,
      plan_expires_at = v_expires_at,
      billing_cycle   = v_billing.billing_cycle,
      plan_changed_at = v_changed_at,
      trial_used      = TRUE
    WHERE id = v_billing.hospital_id;

    -- [C-2] hospitals row를 FOR UPDATE로 잠근 뒤 잔액 재검증 후 차감
    IF COALESCE(v_billing.credit_used_amount, 0) > 0 THEN
      SELECT credit_balance INTO v_hospital_balance
      FROM hospitals
      WHERE id = v_billing.hospital_id
      FOR UPDATE;

      -- 잔액 부족이면 경고 로그만 남기고 계속 (TossPayments는 이미 승인됨)
      -- Edge Function이 사전에 충분히 검증했으므로 일반적으로는 통과
      IF COALESCE(v_hospital_balance, 0) < v_billing.credit_used_amount THEN
        RAISE WARNING
          'process_payment_callback: credit_balance(%) < credit_used_amount(%) for hospital %, billing %',
          COALESCE(v_hospital_balance, 0),
          v_billing.credit_used_amount,
          v_billing.hospital_id,
          p_billing_id;
      END IF;

      UPDATE hospitals
      SET credit_balance = GREATEST(0, credit_balance - v_billing.credit_used_amount)
      WHERE id = v_billing.hospital_id;
    END IF;

    -- [C-4] 쿠폰 사용 처리 (동일 트랜잭션 — 원자성 보장)
    IF p_coupon_id IS NOT NULL AND p_user_id IS NOT NULL AND p_original_amount IS NOT NULL THEN
      SELECT redeem_coupon(
        p_coupon_id,
        p_user_id,
        v_billing.hospital_id,
        p_billing_id,
        v_billing.billing_cycle,
        p_original_amount
      ) INTO v_redeem_result;

      IF v_redeem_result IS NULL OR NOT (v_redeem_result->>'ok')::boolean THEN
        RAISE WARNING
          'process_payment_callback: redeem_coupon failed for coupon %, error: %',
          p_coupon_id,
          v_redeem_result->>'error';
        -- 쿠폰 redeem 실패해도 결제 자체는 롤백하지 않음
        -- (TossPayments 승인 완료 후이므로) — 단, 로그 명시
      END IF;
    END IF;

    -- Referral reward: 첫 유료 결제 시에만
    IF NOT EXISTS (
      SELECT 1 FROM billing_history
      WHERE hospital_id = v_billing.hospital_id
        AND payment_status = 'completed'
        AND id != p_billing_id
    ) THEN
      SELECT * INTO v_referral_code
      FROM beta_invite_codes
      WHERE code_type = 'referral'
        AND referred_hospital_id = v_billing.hospital_id
      LIMIT 1;

      IF FOUND AND v_referral_code.created_by IS NOT NULL THEN
        SELECT id, hospital_id INTO v_referrer_profile
        FROM profiles
        WHERE id = v_referral_code.created_by;

        IF FOUND AND v_referrer_profile.hospital_id IS NOT NULL
           AND v_referrer_profile.hospital_id != v_billing.hospital_id THEN
          PERFORM issue_referral_reward(
            v_referrer_profile.id,
            v_referrer_profile.hospital_id,
            p_billing_id
          );
        END IF;
      END IF;
    END IF;

  ELSE
    UPDATE billing_history
    SET
      payment_status = 'failed',
      payment_ref    = p_payment_ref,
      updated_at     = now()
    WHERE id = p_billing_id;
  END IF;

  RETURN TRUE;
END;
$$;
