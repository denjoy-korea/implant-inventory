-- Migration: 20260405100000_user_credit_system.sql
-- 개인 크레딧 시스템 (profiles 레벨, B2C 강의/서비스 결제용)

-- ============================================================
-- 1. profiles 테이블에 credit_balance 컬럼 추가
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credit_balance NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_credit_balance_non_negative
    CHECK (credit_balance >= 0);

-- ============================================================
-- 2. user_credit_transactions 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_credit_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        NUMERIC     NOT NULL,
  balance_after NUMERIC     NOT NULL,
  type          TEXT        NOT NULL,
  source        TEXT        NOT NULL,
  reference_id  TEXT,
  memo          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_credit_tx_type_check
    CHECK (type IN ('earn', 'spend')),
  CONSTRAINT user_credit_tx_amount_earn_positive
    CHECK (type = 'spend' OR amount > 0),
  CONSTRAINT user_credit_tx_amount_spend_negative
    CHECK (type = 'earn' OR amount < 0)
);

CREATE INDEX IF NOT EXISTS user_credit_tx_user_id_created
  ON public.user_credit_transactions (user_id, created_at DESC);

ALTER TABLE public.user_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can read own credit transactions"
  ON public.user_credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 3. RPC: earn_user_credit (SECURITY DEFINER, service_role only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.earn_user_credit(
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
  v_new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'earn amount must be positive';
  END IF;

  UPDATE profiles
  SET credit_balance = credit_balance + p_amount
  WHERE id = p_user_id
  RETURNING credit_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user not found: %', p_user_id;
  END IF;

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
REVOKE EXECUTE ON FUNCTION public.earn_user_credit FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.earn_user_credit FROM authenticated;

-- ============================================================
-- 4. RPC: spend_user_credit (SECURITY DEFINER, service_role only)
-- ============================================================
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
REVOKE EXECUTE ON FUNCTION public.spend_user_credit FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.spend_user_credit FROM authenticated;

-- ============================================================
-- 5. RPC: get_my_credit_info (프론트엔드 호출용)
-- ============================================================
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
