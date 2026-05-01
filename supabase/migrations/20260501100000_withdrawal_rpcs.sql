-- Withdrawal RPCs for vendors and buyers + auto_release_pending_escrow cron

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
  WHERE vendor_id = v_uid
    AND available >= _amount;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, currency, status, reference, description)
  VALUES (v_uid, 'withdrawal', _amount, 'LTC', 'pending', _address, 'Vendor LTC withdrawal request');

  RETURN jsonb_build_object('success', true, 'amount', _amount, 'address', _address);
END;
$$;

GRANT EXECUTE ON FUNCTION public.vendor_withdraw_ltc(text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_withdraw_ltc(_address text, _amount numeric)
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

  UPDATE public.user_balances
  SET available = available - _amount,
      total = total - _amount,
      updated_at = now()
  WHERE user_id = v_uid
    AND available >= _amount;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO public.transactions (user_id, type, amount, currency, status, reference, description)
  VALUES (v_uid, 'withdrawal', _amount, 'LTC', 'pending', _address, 'User LTC withdrawal request');

  RETURN jsonb_build_object('success', true, 'amount', _amount, 'address', _address);
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_withdraw_ltc(text, numeric) TO authenticated;

-- Schedule auto_release_pending_escrow every 6 hours (function already exists in previous migration)
SELECT cron.schedule(
  'auto-release-escrow',
  '0 */6 * * *',
  $$SELECT public.auto_release_pending_escrow()$$
);
