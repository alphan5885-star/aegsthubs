# MAXELPAY INTEGRATION - SETUP CHECKLIST ✓

## 📋 What Was Added

### 1. **Supabase Edge Functions** (2 new functions)
   - ✅ `supabase/functions/maxelpay-webhook/index.ts` - Webhook handler
   - ✅ `supabase/functions/maxelpay-payment/index.ts` - Payment initiation

### 2. **Database** 
   - ✅ `supabase/migrations/20260606_maxelpay_setup.sql` - Database schema
   - Tables: `maxelpay_sessions`, `maxelpay_payments`, `maxelpay_webhooks`

### 3. **React Components**
   - ✅ `src/components/MaxelpayCheckout.tsx` - Payment UI component

### 4. **Documentation & Configuration**
   - ✅ `MAXELPAY_SETUP.md` - Full integration guide
   - ✅ `.env.maxelpay.example` - Environment variables template

---

## 🚀 Quick Start

### Step 1: Set Environment Variables in Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → Edge Functions → Secrets**
4. Add these secrets:

```
MAXELPAY_API_KEY = pk_test_NSNDhMZG8yNx0Wu2frhsZ0NIhW3Uh9v4
MAXELPAY_WEBHOOK_SECRET = whsec_your_secret (optional but recommended)
ALLOWED_ORIGINS = https://your-domain.com,http://localhost:5173
SITE_URL = https://your-domain.com
```

### Step 2: Run Database Migrations

Option A (Using Supabase CLI):
```bash
supabase migration up
```

Option B (Manual):
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy-paste contents of `supabase/migrations/20260606_maxelpay_setup.sql`
4. Run the query

### Step 3: Deploy Edge Functions

```bash
# From project root
supabase functions deploy maxelpay-webhook
supabase functions deploy maxelpay-payment
```

### Step 4: Configure Maxelpay Webhooks

1. Log in to Maxelpay merchant dashboard
2. Go to **Settings → API Webhooks**
3. Add endpoint:
   ```
   https://your-project-id.supabase.co/functions/v1/maxelpay-webhook
   ```
4. Add events to listen for:
   - `payment.success`
   - `payment.failed`
   - `payment.pending`
5. Add webhook secret (same as `MAXELPAY_WEBHOOK_SECRET`)

### Step 5: Use in Your App

In your checkout/payment component:

```typescript
import MaxelpayCheckout from "@/components/MaxelpayCheckout";

export default function CheckoutPage({ orderId, amount }) {
  return (
    <MaxelpayCheckout
      orderId={orderId}
      amount={amount}
      currency="USD"
      description="Ürün satın alımı"
      onSuccess={() => {
        // Handle successful payment
        window.location.href = "/order-success";
      }}
      onError={(error) => {
        console.error("Payment failed:", error);
      }}
    />
  );
}
```

---

## 📝 Workflow

### User Payment Flow
1. User clicks "Maxelpay ile Ödeme Yap"
2. → Edge Function `maxelpay-payment` creates session
3. → User redirected to Maxelpay checkout
4. → User completes payment on Maxelpay
5. → Maxelpay sends webhook to `maxelpay-webhook`
6. → Order status updated to "paid"
7. → User redirected to success page

### Order Status Updates
- **pending** → initial state
- **pending** → **paid** (webhook success)
- **pending** → **payment_failed** (webhook failed)

---

## 🔐 Security

### Webhook Signature Verification
All webhooks are verified using HMAC-SHA256 signature. The function automatically:
- ✅ Checks `x-maxelpay-signature` header
- ✅ Verifies payload hasn't been tampered with
- ✅ Rejects invalid signatures (401 Unauthorized)

### Row Level Security (RLS)
- ✅ Users can only see their own sessions
- ✅ Users can only see their own payments
- ✅ Webhooks restricted to service role only

### Best Practices
- ✅ No credit card data stored locally
- ✅ API keys stored in Supabase secrets
- ✅ HTTPS enforced for all communication
- ✅ Rate limiting ready (implement as needed)

---

## 🧪 Testing

### Test Webhook (Local)
```bash
curl -X POST http://localhost:54321/functions/v1/maxelpay-webhook \
  -H "Content-Type: application/json" \
  -H "x-maxelpay-signature: test" \
  -d '{
    "id": "txn_test_123",
    "status": "success",
    "amount": 10000,
    "currency": "USD",
    "order_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

### Test Payment (Local)
```bash
# First get an auth token
curl -X POST http://localhost:54321/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password"
  }'

# Then create payment
curl -X POST http://localhost:54321/functions/v1/maxelpay-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "550e8400-e29b-41d4-a716-446655440000",
    "amount": 100.00,
    "currency": "USD"
  }'
```

---

## 📊 Monitoring

### View Function Logs
```bash
# Webhook logs
supabase functions logs maxelpay-webhook

# Payment logs
supabase functions logs maxelpay-payment
```

### Database Queries
```sql
-- Check webhook log
SELECT * FROM public.maxelpay_webhooks ORDER BY received_at DESC LIMIT 10;

-- Check payment sessions
SELECT * FROM public.maxelpay_sessions WHERE created_at > NOW() - interval '1 hour';

-- Check completed payments
SELECT * FROM public.maxelpay_payments WHERE created_at > NOW() - interval '1 day';

-- Check order status
SELECT id, status, payment_method, created_at FROM public.orders 
WHERE payment_method = 'maxelpay' ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Webhooks not being received?
- [ ] Check MAXELPAY_WEBHOOK_SECRET is set correctly
- [ ] Verify webhook URL is publicly accessible
- [ ] Check function logs: `supabase functions logs maxelpay-webhook`
- [ ] Verify database tables exist: `SELECT * FROM public.maxelpay_webhooks;`

### Payment sessions fail?
- [ ] Verify MAXELPAY_API_KEY is not expired
- [ ] Check function logs: `supabase functions logs maxelpay-payment`
- [ ] Ensure order_id exists in orders table
- [ ] Check CORS settings: ALLOWED_ORIGINS must include your domain

### Order status not updating?
- [ ] Verify webhook signature verification passed
- [ ] Check if order_id in webhook matches actual order
- [ ] Look for database constraint errors in logs
- [ ] Verify orders table has payment_method column

---

## 📞 Production Checklist

Before going live:

- [ ] Switch API key to production (`pk_live_*` instead of `pk_test_*`)
- [ ] Update webhook secret with production secret
- [ ] Update SITE_URL to production domain
- [ ] Update ALLOWED_ORIGINS to production domain
- [ ] Test end-to-end payment flow
- [ ] Set up monitoring/alerts
- [ ] Configure rate limiting
- [ ] Enable HTTPS everywhere
- [ ] Test refund flow (if applicable)
- [ ] Document support process
- [ ] Train support team on Maxelpay webhooks

---

## 📚 References

- **Maxelpay API Docs**: https://docs.maxelpay.com
- **Supabase Functions**: https://supabase.com/docs/guides/functions
- **Edge Functions Secrets**: https://supabase.com/docs/guides/functions/secrets
- **Webhooks**: https://docs.maxelpay.com/webhooks

---

## ✨ Integration Summary

| Component | Status | Location |
|-----------|--------|----------|
| Edge Functions | ✅ Ready | `supabase/functions/` |
| Database Schema | ✅ Ready | `supabase/migrations/` |
| React Component | ✅ Ready | `src/components/MaxelpayCheckout.tsx` |
| Documentation | ✅ Ready | `MAXELPAY_SETUP.md` |
| Config Template | ✅ Ready | `.env.maxelpay.example` |

All files have been created according to your project's architecture and conventions. The integration is ready for deployment!
