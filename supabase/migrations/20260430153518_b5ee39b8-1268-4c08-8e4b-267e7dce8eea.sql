
-- Mirrors / canary
CREATE TABLE IF NOT EXISTS public.mirrors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  label TEXT,
  is_canary BOOLEAN NOT NULL DEFAULT false,
  signature TEXT,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mirrors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone view mirrors" ON public.mirrors;
CREATE POLICY "Anyone view mirrors" ON public.mirrors FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admin manage mirrors" ON public.mirrors;
CREATE POLICY "Admin manage mirrors" ON public.mirrors FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Forum silme
DROP POLICY IF EXISTS "Authors or admins delete posts" ON public.forum_posts;
CREATE POLICY "Authors or admins delete posts" ON public.forum_posts FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authors or admins delete comments" ON public.forum_comments;
CREATE POLICY "Authors or admins delete comments" ON public.forum_comments FOR DELETE TO authenticated
USING (auth.uid() = author_id OR public.has_role(auth.uid(),'admin'));

-- Mesaj TTL temizleyici
CREATE OR REPLACE FUNCTION public.cleanup_old_messages(_days INTEGER DEFAULT 7)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _c1 INT; _c2 INT;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;
  DELETE FROM public.chat_room_messages WHERE created_at < now() - (_days || ' days')::interval;
  GET DIAGNOSTICS _c1 = ROW_COUNT;
  DELETE FROM public.encrypted_messages WHERE created_at < now() - (_days || ' days')::interval;
  GET DIAGNOSTICS _c2 = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'chat_deleted', _c1, 'encrypted_deleted', _c2);
END $$;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_messages(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_old_messages(integer) TO authenticated;

-- Vendor reputation view
CREATE OR REPLACE VIEW public.vendor_reputation AS
SELECT
  p.user_id AS vendor_id,
  p.display_name,
  COALESCE(AVG(r.rating)::numeric(3,2), 0) AS avg_rating,
  COUNT(DISTINCT r.id) AS total_ratings,
  COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'completed') AS completed_orders
FROM public.profiles p
LEFT JOIN public.vendor_ratings r ON r.vendor_id = p.user_id
LEFT JOIN public.orders o ON o.vendor_id = p.user_id
GROUP BY p.user_id, p.display_name;
GRANT SELECT ON public.vendor_reputation TO authenticated;

-- Escrow release vendor cüzdana ekleme
CREATE OR REPLACE FUNCTION public.release_escrow(_escrow_id uuid DEFAULT NULL, _order_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE oid UUID; _vendor UUID; _amt NUMERIC; _comm NUMERIC;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  IF _escrow_id IS NOT NULL THEN
    SELECT order_id, amount, commission INTO oid, _amt, _comm FROM public.escrow_pool WHERE id = _escrow_id;
  ELSE
    oid := _order_id;
    SELECT amount, commission INTO _amt, _comm FROM public.escrow_pool WHERE order_id = oid LIMIT 1;
  END IF;
  SELECT vendor_id INTO _vendor FROM public.orders WHERE id = oid;
  UPDATE public.escrow_pool SET status='released' WHERE order_id = oid;
  UPDATE public.orders SET status='completed' WHERE id = oid;
  INSERT INTO public.vendor_wallets (vendor_id, available, total)
  VALUES (_vendor, COALESCE(_amt,0) - COALESCE(_comm,0), COALESCE(_amt,0) - COALESCE(_comm,0))
  ON CONFLICT (vendor_id) DO UPDATE SET
    available = public.vendor_wallets.available + EXCLUDED.available,
    total = public.vendor_wallets.total + EXCLUDED.total,
    updated_at = now();
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.release_escrow(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.release_escrow(uuid, uuid) TO authenticated;

-- vendor_wallets.vendor_id unique olmalı (ON CONFLICT için)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendor_wallets_vendor_id_key') THEN
    ALTER TABLE public.vendor_wallets ADD CONSTRAINT vendor_wallets_vendor_id_key UNIQUE (vendor_id);
  END IF;
END $$;
