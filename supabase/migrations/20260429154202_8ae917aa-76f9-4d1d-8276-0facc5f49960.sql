-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'vendor', 'buyer');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT,
    ip TEXT,
    device TEXT,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.assign_role_on_signup(_role TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _role NOT IN ('vendor', 'buyer') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert logs" ON public.security_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can view all logs" ON public.security_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, description TEXT, price NUMERIC NOT NULL DEFAULT 0,
    category TEXT, image_url TEXT, stock INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Vendors can manage own products" ON public.products FOR ALL TO authenticated USING (auth.uid() = vendor_id) WITH CHECK (auth.uid() = vendor_id);

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES auth.users(id) NOT NULL,
    vendor_id UUID REFERENCES auth.users(id) NOT NULL,
    product_id UUID REFERENCES public.products(id),
    amount NUMERIC NOT NULL DEFAULT 0, status TEXT DEFAULT 'pending',
    delivery_method TEXT DEFAULT 'shipping', shipping_address TEXT, notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Vendors can view orders for them" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = vendor_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Vendors can update own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = vendor_id);

CREATE TABLE public.disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID REFERENCES auth.users(id) NOT NULL,
    seller_id UUID REFERENCES auth.users(id) NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    product_name TEXT, amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'open',
    reason TEXT, resolution TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Involved parties can view disputes" ON public.disputes FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Buyers can create disputes" ON public.disputes FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Admins can update disputes" ON public.disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID REFERENCES public.disputes(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dispute participants can view messages" ON public.dispute_messages FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.disputes d WHERE d.id = dispute_id AND (d.buyer_id = auth.uid() OR d.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
);
CREATE POLICY "Dispute participants can send messages" ON public.dispute_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

CREATE TABLE public.escrow_pool (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id), amount NUMERIC DEFAULT 0,
    commission NUMERIC DEFAULT 0, status TEXT DEFAULT 'held',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.escrow_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view escrow" ON public.escrow_pool FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage escrow" ON public.escrow_pool FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.encrypted_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    ciphertext TEXT NOT NULL, iv TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.encrypted_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants can view messages" ON public.encrypted_messages FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid()))
);
CREATE POLICY "Order participants can send messages" ON public.encrypted_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

CREATE TABLE public.shipping_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    tracking_number TEXT, carrier TEXT, status TEXT DEFAULT 'pending',
    estimated_delivery TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipping_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants can view tracking" ON public.shipping_tracking FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid()))
);

CREATE TABLE public.dead_drop_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    latitude NUMERIC, longitude NUMERIC, description TEXT,
    status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dead_drop_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants can view dead drops" ON public.dead_drop_locations FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.vendor_id = auth.uid()))
);

CREATE TABLE public.vendor_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES auth.users(id) NOT NULL,
    buyer_id UUID REFERENCES auth.users(id) NOT NULL,
    order_id UUID REFERENCES public.orders(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ratings" ON public.vendor_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Buyers can create ratings" ON public.vendor_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

CREATE TABLE public.vendor_bonds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC DEFAULT 0, status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_bonds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendors can view own bonds" ON public.vendor_bonds FOR SELECT TO authenticated USING (auth.uid() = vendor_id);
CREATE POLICY "Admins can view all bonds" ON public.vendor_bonds FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.admin_auto_withdraw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    cold_wallet TEXT, threshold NUMERIC DEFAULT 0, enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_auto_withdraw ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage auto withdraw" ON public.admin_auto_withdraw FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL, content TEXT NOT NULL, category TEXT DEFAULT 'general',
    pinned BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view posts" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create posts" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);