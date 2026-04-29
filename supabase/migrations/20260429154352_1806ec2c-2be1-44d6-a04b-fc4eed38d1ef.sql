CREATE TABLE public.user_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  available numeric NOT NULL DEFAULT 0,
  pending numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  withdrawn numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own balance" ON public.user_balances FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage balances" ON public.user_balances FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.order_chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE,
  buyer_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  destroyed_at timestamptz
);
ALTER TABLE public.order_chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants view rooms" ON public.order_chat_rooms FOR SELECT TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants update rooms" ON public.order_chat_rooms FOR UPDATE TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = vendor_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.chat_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.order_chat_rooms(id) ON DELETE CASCADE,
  sender_id uuid,
  content text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_room_messages_room ON public.chat_room_messages(room_id);
ALTER TABLE public.chat_room_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room participants view messages" ON public.chat_room_messages FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.order_chat_rooms r WHERE r.id = chat_room_messages.room_id
    AND (r.buyer_id = auth.uid() OR r.vendor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));
CREATE POLICY "Room participants send messages" ON public.chat_room_messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.order_chat_rooms r WHERE r.id = chat_room_messages.room_id
      AND (r.buyer_id = auth.uid() OR r.vendor_id = auth.uid())
  )
);

CREATE TABLE public.user_pgp_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  key_id TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_pgp_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PGP keys publicly viewable" ON public.user_pgp_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own PGP key" ON public.user_pgp_keys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own PGP key" ON public.user_pgp_keys FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own PGP key" ON public.user_pgp_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_user_pgp_keys_user_id ON public.user_pgp_keys(user_id);

CREATE TABLE public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add to own watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete from own watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'info',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active announcements" ON public.system_announcements FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage announcements" ON public.system_announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS destination TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_admin_product BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_address TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmations INTEGER DEFAULT 0;

CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action text NOT NULL,
  count integer DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access to rate_limits" ON public.rate_limits FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);