
-- 1. shipping_tracking tablosuna anonim/global kargo alanları
ALTER TABLE public.shipping_tracking
  ADD COLUMN IF NOT EXISTS country_from text,
  ADD COLUMN IF NOT EXISTS country_to text,
  ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS stealth_method text DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS pgp_encrypted_tracking text,
  ADD COLUMN IF NOT EXISTS cover_sender_name text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

-- 2. shipping_tracking INSERT/UPDATE policy (sadece sipariş satıcısı)
DROP POLICY IF EXISTS "Vendors insert tracking" ON public.shipping_tracking;
CREATE POLICY "Vendors insert tracking" ON public.shipping_tracking
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = shipping_tracking.order_id AND o.vendor_id = auth.uid()));

DROP POLICY IF EXISTS "Vendors update tracking" ON public.shipping_tracking;
CREATE POLICY "Vendors update tracking" ON public.shipping_tracking
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = shipping_tracking.order_id AND o.vendor_id = auth.uid()));

-- 3. dead_drop_locations UPDATE policy
DROP POLICY IF EXISTS "Order participants update dead drops" ON public.dead_drop_locations;
CREATE POLICY "Order participants update dead drops" ON public.dead_drop_locations
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = dead_drop_locations.order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid())));

-- 4. Sipariş iptal RPC (alıcı, pending durumdayken)
CREATE OR REPLACE FUNCTION public.cancel_order(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row RECORD;
BEGIN
  SELECT * INTO _row FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'order not found'); END IF;
  IF _row.buyer_id <> auth.uid() THEN RETURN jsonb_build_object('success', false, 'error', 'unauthorized'); END IF;
  IF _row.status NOT IN ('pending') THEN RETURN jsonb_build_object('success', false, 'error', 'cannot cancel non-pending order'); END IF;
  UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = _order_id;
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (_row.vendor_id, 'Sipariş İptal', 'Sipariş #' || LEFT(_order_id::text, 8) || ' alıcı tarafından iptal edildi.', 'order', '/vendor');
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.cancel_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid) TO authenticated;

-- 5. Otomatik escrow release (14 gün delivered → released)
CREATE OR REPLACE FUNCTION public.auto_release_pending_escrow()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row RECORD; _count INT := 0; _vendor UUID; _amt NUMERIC; _comm NUMERIC;
BEGIN
  FOR _row IN
    SELECT o.id AS order_id, o.vendor_id, e.amount, e.commission
    FROM public.orders o
    JOIN public.escrow_pool e ON e.order_id = o.id
    WHERE o.status = 'delivered'
      AND e.status = 'held'
      AND o.updated_at < now() - interval '14 days'
  LOOP
    UPDATE public.escrow_pool SET status = 'released' WHERE order_id = _row.order_id;
    UPDATE public.orders SET status = 'completed' WHERE id = _row.order_id;
    INSERT INTO public.vendor_wallets (vendor_id, available, total)
    VALUES (_row.vendor_id, COALESCE(_row.amount,0) - COALESCE(_row.commission,0), COALESCE(_row.amount,0) - COALESCE(_row.commission,0))
    ON CONFLICT (vendor_id) DO UPDATE SET
      available = public.vendor_wallets.available + EXCLUDED.available,
      total = public.vendor_wallets.total + EXCLUDED.total,
      updated_at = now();
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (_row.vendor_id, 'Escrow Otomatik Bırakıldı', 'Sipariş #' || LEFT(_row.order_id::text, 8) || ' için escrow otomatik bırakıldı.', 'wallet', '/vendor/wallet');
    _count := _count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'released', _count);
END $$;
REVOKE EXECUTE ON FUNCTION public.auto_release_pending_escrow() FROM PUBLIC, anon, authenticated;

-- 6. Sipariş durumu değişince notification trigger
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (NEW.buyer_id, 'Sipariş Durumu', 'Sipariş #' || LEFT(NEW.id::text, 8) || ' durumu: ' || NEW.status, 'order', '/orders');
    IF NEW.status IN ('shipped', 'delivered', 'cancelled', 'completed') THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.vendor_id, 'Sipariş Durumu', 'Sipariş #' || LEFT(NEW.id::text, 8) || ' durumu: ' || NEW.status, 'order', '/vendor');
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.orders;
CREATE TRIGGER trg_notify_order_status_change AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();

-- 7. Stok 0 olunca ürün auto-deactivate
CREATE OR REPLACE FUNCTION public.auto_deactivate_zero_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stock IS NOT NULL AND NEW.stock <= 0 AND NEW.is_active = true THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_auto_deactivate_zero_stock ON public.products;
CREATE TRIGGER trg_auto_deactivate_zero_stock BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.auto_deactivate_zero_stock();

-- 8. Mark order as shipped helper RPC (vendor only)
CREATE OR REPLACE FUNCTION public.mark_order_shipped(_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND vendor_id = auth.uid()) THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;
  UPDATE public.orders SET status = 'shipped', updated_at = now() WHERE id = _order_id AND status IN ('paid', 'pending');
  RETURN jsonb_build_object('success', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.mark_order_shipped(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_order_shipped(uuid) TO authenticated;
