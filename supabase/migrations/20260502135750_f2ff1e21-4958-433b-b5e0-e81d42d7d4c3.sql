
-- =========================================================
-- WITHDRAWAL RPCs (LTC + XMR for users and vendors)
-- =========================================================

CREATE OR REPLACE FUNCTION public.user_withdraw_ltc(_address text, _amount numeric, _pin_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_pin text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT withdraw_pin_hash INTO v_pin FROM public.profiles WHERE user_id = v_uid;
  IF v_pin IS NULL OR v_pin <> _pin_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_pin');
  END IF;

  IF NOT (_address ~ '^[LM3][a-km-zA-HJ-NP-Z1-9]{25,34}$') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_address');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  UPDATE public.user_balances
  SET available = available - _amount,
      withdrawn = withdrawn + _amount,
      updated_at = now()
  WHERE user_id = v_uid AND available >= _amount;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (v_uid, 'withdrawal', _amount, 'pending', 'LTC withdrawal to ' || _address);

  RETURN jsonb_build_object('success', true, 'amount', _amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_withdraw_xmr(_address text, _amount numeric, _pin_hash text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_pin text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT withdraw_pin_hash INTO v_pin FROM public.profiles WHERE user_id = v_uid;
  IF v_pin IS NULL OR v_pin <> _pin_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_pin');
  END IF;

  IF NOT (_address ~ '^[48][a-zA-Z0-9]{94,105}$') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_address');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  UPDATE public.user_balances
  SET available = available - _amount,
      withdrawn = withdrawn + _amount,
      updated_at = now()
  WHERE user_id = v_uid AND available >= _amount;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (v_uid, 'withdrawal', _amount, 'pending', 'XMR withdrawal to ' || _address);

  RETURN jsonb_build_object('success', true, 'amount', _amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.vendor_withdraw_ltc(_address text, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF NOT (_address ~ '^[LM3][a-km-zA-HJ-NP-Z1-9]{25,34}$') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_address');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  UPDATE public.vendor_wallets
  SET available = available - _amount,
      updated_at = now()
  WHERE vendor_id = v_uid AND available >= _amount;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (v_uid, 'withdrawal', _amount, 'pending', 'Vendor LTC withdrawal to ' || _address);

  RETURN jsonb_build_object('success', true, 'amount', _amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.vendor_withdraw_xmr(_address text, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF NOT (_address ~ '^[48][a-zA-Z0-9]{94,105}$') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_address');
  END IF;

  IF _amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  UPDATE public.vendor_wallets
  SET available = available - _amount,
      updated_at = now()
  WHERE vendor_id = v_uid AND available >= _amount;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (v_uid, 'withdrawal', _amount, 'pending', 'Vendor XMR withdrawal to ' || _address);

  RETURN jsonb_build_object('success', true, 'amount', _amount);
END;
$$;

REVOKE ALL ON FUNCTION public.user_withdraw_ltc(text, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_withdraw_xmr(text, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vendor_withdraw_ltc(text, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vendor_withdraw_xmr(text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_withdraw_ltc(text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_withdraw_xmr(text, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_withdraw_ltc(text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_withdraw_xmr(text, numeric) TO authenticated;

-- =========================================================
-- MARKET STATS
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_market_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  orders_24h numeric := 0;
  volume_24h numeric := 0;
  active_users numeric := 0;
  active_vendors numeric := 0;
  total_products numeric := 0;
BEGIN
  SELECT COUNT(*)::numeric INTO orders_24h
  FROM public.orders
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND status IN ('paid','shipped','delivered','completed');

  SELECT COALESCE(SUM(amount),0)::numeric INTO volume_24h
  FROM public.orders
  WHERE created_at > NOW() - INTERVAL '24 hours'
    AND status IN ('paid','shipped','delivered','completed');

  SELECT COUNT(DISTINCT buyer_id)::numeric INTO active_users
  FROM public.orders
  WHERE created_at > NOW() - INTERVAL '7 days';

  SELECT COUNT(DISTINCT vendor_id)::numeric INTO active_vendors
  FROM public.products
  WHERE stock > 0 AND is_active = true;

  SELECT COUNT(*)::numeric INTO total_products
  FROM public.products
  WHERE stock > 0 AND is_active = true;

  RETURN jsonb_build_object(
    'orders24h', orders_24h,
    'volume24h', ROUND(volume_24h, 4),
    'online', active_users,
    'activeVendors', active_vendors,
    'totalProducts', total_products
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_market_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_market_stats() TO authenticated;
