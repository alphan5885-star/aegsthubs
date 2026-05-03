
-- A. Deposit infrastructure
CREATE TABLE IF NOT EXISTS public.user_deposit_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  network text NOT NULL DEFAULT 'LTC',
  address text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, network)
);
ALTER TABLE public.user_deposit_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own deposit address" ON public.user_deposit_addresses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.processed_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tx_hash text NOT NULL UNIQUE,
  amount numeric NOT NULL DEFAULT 0,
  network text NOT NULL DEFAULT 'LTC',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.processed_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own processed deposits" ON public.processed_deposits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.credit_confirmed_deposit(
  _user_id uuid, _address text, _tx_hash text,
  _amount_satoshi bigint, _confirmations integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ltc numeric;
BEGIN
  IF _confirmations < 3 THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'insufficient_confirmations');
  END IF;
  IF EXISTS (SELECT 1 FROM public.processed_deposits WHERE tx_hash = _tx_hash) THEN
    RETURN jsonb_build_object('credited', false, 'reason', 'already_processed');
  END IF;
  _ltc := _amount_satoshi::numeric / 100000000;
  INSERT INTO public.processed_deposits (user_id, tx_hash, amount, network)
  VALUES (_user_id, _tx_hash, _ltc, 'LTC');
  INSERT INTO public.user_balances (user_id, available, total)
  VALUES (_user_id, _ltc, _ltc)
  ON CONFLICT (user_id) DO UPDATE
    SET available = user_balances.available + _ltc,
        total = user_balances.total + _ltc,
        updated_at = now();
  INSERT INTO public.transactions (user_id, type, amount, status, description)
  VALUES (_user_id, 'deposit', _ltc, 'confirmed', 'LTC deposit ' || LEFT(_tx_hash, 12));
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (_user_id, 'Yatirim onaylandi', _ltc::text || ' LTC bakiyene eklendi.', 'wallet', '/wallet');
  RETURN jsonb_build_object('credited', true, 'amount', _ltc);
END $$;

-- user_balances unique on user_id (needed for upsert)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_balances_user_id_key') THEN
    ALTER TABLE public.user_balances ADD CONSTRAINT user_balances_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- B. Auto-create chat room when order paid
CREATE OR REPLACE FUNCTION public.ensure_order_chat_room()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('paid','shipped','delivered','completed')
     AND (OLD.status IS NULL OR OLD.status <> NEW.status)
     AND NOT EXISTS (SELECT 1 FROM public.order_chat_rooms WHERE order_id = NEW.id) THEN
    INSERT INTO public.order_chat_rooms (order_id, buyer_id, vendor_id, status)
    VALUES (NEW.id, NEW.buyer_id, NEW.vendor_id, 'active');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ensure_order_chat_room ON public.orders;
CREATE TRIGGER trg_ensure_order_chat_room
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.ensure_order_chat_room();

-- Helper to get/create chat room for participants (UI calls this)
CREATE OR REPLACE FUNCTION public.get_or_create_order_chat(_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o RECORD; _room_id uuid;
BEGIN
  SELECT buyer_id, vendor_id INTO _o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF auth.uid() <> _o.buyer_id AND auth.uid() <> _o.vendor_id
     AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  SELECT id INTO _room_id FROM public.order_chat_rooms WHERE order_id = _order_id;
  IF _room_id IS NULL THEN
    INSERT INTO public.order_chat_rooms (order_id, buyer_id, vendor_id, status)
    VALUES (_order_id, _o.buyer_id, _o.vendor_id, 'active')
    RETURNING id INTO _room_id;
  END IF;
  RETURN _room_id;
END $$;

-- D. Cron uses this to auto-confirm order payments by matching address+amount
CREATE OR REPLACE FUNCTION public.confirm_order_payment_by_tx(
  _address text, _tx_hash text, _amount_satoshi bigint, _confirmations integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order RECORD; _ltc numeric;
BEGIN
  IF _confirmations < 2 THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'insufficient_confirmations');
  END IF;
  _ltc := _amount_satoshi::numeric / 100000000;
  SELECT * INTO _order FROM public.orders
  WHERE payment_address = _address AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'no_order');
  END IF;
  IF _ltc < _order.amount THEN
    RETURN jsonb_build_object('matched', false, 'reason', 'underpayment');
  END IF;
  PERFORM public.process_order_payment(_order.id, _tx_hash, _address);
  RETURN jsonb_build_object('matched', true, 'order_id', _order.id);
END $$;

REVOKE EXECUTE ON FUNCTION public.credit_confirmed_deposit(uuid,text,text,bigint,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_order_payment_by_tx(text,text,bigint,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_order_chat(uuid) TO authenticated;
