
-- Rate limit fonksiyonu
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier TEXT,
  _action TEXT,
  _max_attempts INTEGER DEFAULT 5,
  _window_minutes INTEGER DEFAULT 15,
  _lock_minutes INTEGER DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row RECORD; _new_count INT;
BEGIN
  SELECT * INTO _row FROM public.rate_limits
  WHERE identifier = _identifier AND action = _action
  ORDER BY created_at DESC LIMIT 1;

  IF _row.locked_until IS NOT NULL AND _row.locked_until > now() THEN
    RETURN jsonb_build_object('allowed', false, 'locked_until', _row.locked_until);
  END IF;

  IF _row.id IS NULL OR _row.created_at < now() - (_window_minutes || ' minutes')::interval THEN
    INSERT INTO public.rate_limits (identifier, action, count) VALUES (_identifier, _action, 1);
    RETURN jsonb_build_object('allowed', true, 'remaining', _max_attempts - 1);
  END IF;

  _new_count := _row.count + 1;
  IF _new_count >= _max_attempts THEN
    UPDATE public.rate_limits
    SET count = _new_count, locked_until = now() + (_lock_minutes || ' minutes')::interval
    WHERE id = _row.id;
    RETURN jsonb_build_object('allowed', false, 'locked_until', now() + (_lock_minutes || ' minutes')::interval);
  END IF;

  UPDATE public.rate_limits SET count = _new_count WHERE id = _row.id;
  RETURN jsonb_build_object('allowed', true, 'remaining', _max_attempts - _new_count);
END $$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text,text,integer,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text,text,integer,integer,integer) TO authenticated;

-- Dead drop PGP şifreli alan
ALTER TABLE public.dead_drop_locations
  ADD COLUMN IF NOT EXISTS pgp_encrypted_data TEXT;
ALTER TABLE public.dead_drop_locations
  ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.dead_drop_locations
  ALTER COLUMN longitude DROP NOT NULL;

-- Order participants insert ekleyebilsin (dead drop ekleme için)
DROP POLICY IF EXISTS "Order participants insert dead drops" ON public.dead_drop_locations;
CREATE POLICY "Order participants insert dead drops"
ON public.dead_drop_locations FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = dead_drop_locations.order_id
    AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())
));
