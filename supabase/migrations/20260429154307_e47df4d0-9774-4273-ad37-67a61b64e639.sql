CREATE TABLE public.forum_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view comments" ON public.forum_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create comments" ON public.forum_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT DEFAULT 'system',
    title TEXT NOT NULL,
    body TEXT,
    read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_vendor_rating(_vendor_id UUID)
RETURNS TABLE(avg_rating NUMERIC, total_ratings BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(AVG(rating)::NUMERIC, 0), COUNT(*) FROM public.vendor_ratings WHERE vendor_id = _vendor_id;
$$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE public.products SET name = title WHERE name IS NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0.05;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'physical';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_emoji TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_data TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tracking_number TEXT;

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    display_name TEXT, avatar_url TEXT, bio TEXT, pgp_key TEXT, withdraw_pin_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.anti_phishing_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    code TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.anti_phishing_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own code" ON public.anti_phishing_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own code" ON public.anti_phishing_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own code" ON public.anti_phishing_codes FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    type TEXT DEFAULT 'payment', amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'pending',
    description TEXT, order_id UUID REFERENCES public.orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.vendor_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance NUMERIC DEFAULT 0, btc_address TEXT,
    pending NUMERIC DEFAULT 0, available NUMERIC DEFAULT 0, commission NUMERIC DEFAULT 0, total NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view own wallet" ON public.vendor_wallets FOR SELECT TO authenticated USING (auth.uid() = vendor_id);
CREATE POLICY "Vendors can update own wallet" ON public.vendor_wallets FOR UPDATE TO authenticated USING (auth.uid() = vendor_id);

CREATE OR REPLACE FUNCTION public.confirm_delivery(_order_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN UPDATE public.orders SET status = 'delivered' WHERE id = _order_id AND buyer_id = auth.uid(); END;
$$;

CREATE OR REPLACE FUNCTION public.generate_payment_address(_order_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN 'bc1qpyugsrx9xjvjpcdjkqjwhdm645l0039skthesp'; END;
$$;

CREATE OR REPLACE FUNCTION public.release_escrow(_escrow_id UUID DEFAULT NULL, _order_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE oid UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  IF _escrow_id IS NOT NULL THEN SELECT order_id INTO oid FROM public.escrow_pool WHERE id = _escrow_id;
  ELSE oid := _order_id; END IF;
  UPDATE public.escrow_pool SET status = 'released' WHERE (id = _escrow_id OR order_id = oid);
  UPDATE public.orders SET status = 'completed' WHERE id = oid;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.panic_destroy()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized'); END IF;
  UPDATE public.orders SET status = 'cancelled' WHERE status = 'pending';
  UPDATE public.escrow_pool SET status = 'refunded' WHERE status = 'held';
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_order_payment(_order_id UUID, _tx_hash TEXT DEFAULT NULL, _ltc_address TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vendor_id UUID; _product_name TEXT; _amount NUMERIC;
BEGIN
  SELECT o.vendor_id, COALESCE(p.name, p.title), o.amount INTO _vendor_id, _product_name, _amount
  FROM public.orders o LEFT JOIN public.products p ON p.id = o.product_id WHERE o.id = _order_id;
  UPDATE public.orders SET status = 'paid', txid = _tx_hash WHERE id = _order_id;
  INSERT INTO public.escrow_pool (order_id, amount, commission, status) VALUES (_order_id, _amount, _amount * 0.05, 'held');
  INSERT INTO public.notifications (user_id, title, body, type, link)
  VALUES (_vendor_id, 'Ödeme Alındı', 'Sipariş #' || LEFT(_order_id::text, 8) || ' için ödeme alındı.', 'order', '/orders');
END;
$$;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS txid TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_fee NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.dispute_messages ADD COLUMN IF NOT EXISTS from_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.dispute_messages ADD COLUMN IF NOT EXISTS text TEXT;
ALTER TABLE public.admin_auto_withdraw ADD COLUMN IF NOT EXISTS min_amount NUMERIC DEFAULT 0;
ALTER TABLE public.admin_auto_withdraw ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'weekly';
ALTER TABLE public.admin_auto_withdraw ADD COLUMN IF NOT EXISTS available NUMERIC DEFAULT 0;
ALTER TABLE public.security_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE POLICY "Buyers can update own orders txid" ON public.orders FOR UPDATE USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

CREATE OR REPLACE FUNCTION public.is_account_locked(_email TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT false; $$;

CREATE OR REPLACE FUNCTION public.record_login_attempt(_email TEXT, _success BOOLEAN, _ip TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN INSERT INTO public.security_logs (user_email, success, ip) VALUES (_email, _success, _ip); END;
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('banners', 'banners', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;