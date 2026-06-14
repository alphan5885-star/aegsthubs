# Maxelpay Integration Setup Guide

## Overview
This project now includes Maxelpay payment gateway integration. Maxelpay is a modern payment API that supports various payment methods and regions.

## API Key Configuration
- **Test Key**: `pk_test_NSNDhMZG8yNx0Wu2frhsZ0NIhW3Uh9v4` (provided)
- **Webhook URL**: `https://example.com` (provided)

## Files Added

### 1. Supabase Edge Functions
- **`supabase/functions/maxelpay-webhook/index.ts`** - Webhook handler for payment notifications
- **`supabase/functions/maxelpay-payment/index.ts`** - Creates payment sessions

### 2. Database Schema
- **`supabase/migrations/20260606_maxelpay_setup.sql`** - Creates necessary tables

### 3. Configuration
- **`.env.maxelpay.example`** - Environment variable template

## Setup Instructions

### Step 1: Set Environment Variables
Add to your Supabase project secrets or `.env.local`:

```bash
MAXELPAY_API_KEY=pk_test_NSNDhMZG8yNx0Wu2frhsZ0NIhW3Uh9v4
MAXELPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

### Step 2: Run Database Migrations
```bash
# Option A: Using Supabase CLI
supabase migration up

# Option B: Copy-paste into Supabase SQL Editor
# Copy contents of supabase/migrations/20260606_maxelpay_setup.sql
```

### Step 3: Deploy Edge Functions
```bash
# Deploy the functions
supabase functions deploy maxelpay-webhook
supabase functions deploy maxelpay-payment
```

### Step 4: Configure Maxelpay Dashboard
1. Log in to your Maxelpay merchant dashboard
2. Go to Settings → Webhooks
3. Add webhook endpoint: `https://your-domain.com/functions/v1/maxelpay-webhook`
4. Add secret key for signature verification (set in `MAXELPAY_WEBHOOK_SECRET`)

### Step 5: Update Payment Methods in UI
Add Maxelpay as a payment option in your checkout flow:

```typescript
// Example: In your checkout component
const { data: session, error } = await supabase.functions.invoke(
  "maxelpay-payment",
  {
    body: {
      order_id: "your-order-id",
      amount: 100.00,
      currency: "USD",
      description: "Order description",
    },
  }
);

// Redirect user to checkout
window.location.href = session.checkout_url;
```

## Integration Points

### Initiate Payment
**Endpoint**: `supabase.functions.invoke("maxelpay-payment")`

**Request Body**:
```json
{
  "order_id": "uuid",
  "amount": 100.00,
  "currency": "USD",
  "description": "Optional description"
}
```

**Response**:
```json
{
  "session_id": "sess_...",
  "checkout_url": "https://checkout.maxelpay.com/...",
  "status": "created"
}
```

### Handle Webhooks
Maxelpay will POST to your webhook endpoint with:
```json
{
  "id": "transaction-id",
  "status": "success|failed|pending",
  "amount": 10000,
  "currency": "USD",
  "order_id": "uuid",
  "timestamp": 1234567890
}
```

## Database Tables

### `maxelpay_sessions`
Stores payment session information
- `session_id` - Maxelpay session ID
- `order_id` - Reference to orders table
- `checkout_url` - URL for customer to complete payment
- `status` - Session status
- `expires_at` - Session expiration time

### `maxelpay_payments`
Completed payments
- `maxelpay_transaction_id` - Unique transaction ID
- `order_id` - Reference to orders table
- `status` - Payment status (completed, failed)
- `amount` - Payment amount

### `maxelpay_webhooks`
Webhook audit log
- `transaction_id` - Transaction ID
- `payload` - Full webhook payload (JSONB)
- `received_at` - Timestamp received

## Security Considerations

1. **Signature Verification** - All webhooks are verified using HMAC-SHA256
2. **Row Level Security** - Database policies restrict data access
3. **Rate Limiting** - Implement rate limiting on payment endpoints
4. **PCI Compliance** - Maxelpay handles PCI compliance; no card data stored locally

## Testing

### Test Webhook Locally
```bash
curl -X POST http://localhost:54321/functions/v1/maxelpay-webhook \
  -H "Content-Type: application/json" \
  -H "x-maxelpay-signature: test_signature" \
  -d '{
    "id": "txn_test",
    "status": "success",
    "amount": 10000,
    "currency": "USD",
    "order_id": "your-order-id"
  }'
```

### Test Payment Session
```bash
curl -X POST http://localhost:54321/functions/v1/maxelpay-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "your-order-id",
    "amount": 100.00,
    "currency": "USD"
  }'
```

## Troubleshooting

### Webhooks Not Received
- Verify MAXELPAY_WEBHOOK_SECRET is set
- Check function logs: `supabase functions logs maxelpay-webhook`
- Ensure webhook URL is publicly accessible

### Payment Sessions Failing
- Verify MAXELPAY_API_KEY is valid and not expired
- Check function logs: `supabase functions logs maxelpay-payment`
- Ensure amount is positive and currency is supported

### Database Errors
- Run migrations again to ensure tables exist
- Check database quotas in Supabase dashboard

## Production Checklist

- [ ] Switch to production API key (starts with `pk_live_`)
- [ ] Update MAXELPAY_WEBHOOK_SECRET with production secret
- [ ] Test end-to-end payment flow
- [ ] Configure CORS for production domain
- [ ] Monitor webhook logs and error rates
- [ ] Set up alerts for failed payments
- [ ] Implement payment reconciliation process
- [ ] Document refund/chargeback procedures

## References

- [Maxelpay API Documentation](https://docs.maxelpay.com)
- [Maxelpay Webhook Events](https://docs.maxelpay.com/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
