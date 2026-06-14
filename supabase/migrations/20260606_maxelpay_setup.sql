-- Maxelpay Integration Tables
-- Run in Supabase SQL Editor or place in migrations/

-- Maxelpay Sessions Table
CREATE TABLE IF NOT EXISTS public.maxelpay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  checkout_url TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maxelpay Payments Table
CREATE TABLE IF NOT EXISTS public.maxelpay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  maxelpay_transaction_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maxelpay Webhooks Log (for debugging/audit)
CREATE TABLE IF NOT EXISTS public.maxelpay_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL,
  status TEXT NOT NULL,
  amount NUMERIC,
  currency TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_maxelpay_sessions_order_id ON public.maxelpay_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_maxelpay_sessions_user_id ON public.maxelpay_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_maxelpay_payments_order_id ON public.maxelpay_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_maxelpay_webhooks_order_id ON public.maxelpay_webhooks(order_id);
CREATE INDEX IF NOT EXISTS idx_maxelpay_webhooks_transaction_id ON public.maxelpay_webhooks(transaction_id);

-- Add maxelpay-related columns to orders table if needed
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'crypto',
ADD COLUMN IF NOT EXISTS payment_id TEXT;

-- Row Level Security (RLS) - Sessions
ALTER TABLE public.maxelpay_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.maxelpay_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON public.maxelpay_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Row Level Security (RLS) - Payments
ALTER TABLE public.maxelpay_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.maxelpay_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = maxelpay_payments.order_id 
      AND orders.buyer_id = auth.uid()
    )
  );

-- Row Level Security (RLS) - Webhooks (admin only)
ALTER TABLE public.maxelpay_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view webhooks" ON public.maxelpay_webhooks
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Grant permissions
GRANT SELECT, INSERT ON public.maxelpay_sessions TO authenticated;
GRANT SELECT ON public.maxelpay_payments TO authenticated;
GRANT INSERT ON public.maxelpay_webhooks TO service_role;
