# Maxelpay Integration - Index & Quick Reference

## 🎯 START HERE

**New to this integration?** Start with these files in order:

1. **📖 [MAXELPAY_COMPLETE.md](./MAXELPAY_COMPLETE.md)** ← READ THIS FIRST
   - Overview of what was created
   - 5-step quick start guide
   - Security information

2. **✅ [MAXELPAY_CHECKLIST.md](./MAXELPAY_CHECKLIST.md)** ← THEN DO THIS
   - Step-by-step setup instructions
   - Testing procedures
   - Troubleshooting guide

3. **💻 [MAXELPAY_DEVELOPER_GUIDE.md](./MAXELPAY_DEVELOPER_GUIDE.md)** ← REFERENCE
   - Code examples
   - Component patterns
   - Error handling

4. **🚀 [MAXELPAY_SETUP.md](./MAXELPAY_SETUP.md)** ← DETAILED GUIDE
   - Complete documentation
   - API reference
   - Production checklist

---

## 📦 FILES CREATED

### Backend
- `supabase/functions/maxelpay-webhook/index.ts` - Webhook handler
- `supabase/functions/maxelpay-payment/index.ts` - Payment session creator
- `supabase/migrations/20260606_maxelpay_setup.sql` - Database schema

### Frontend
- `src/components/MaxelpayCheckout.tsx` - Payment button component
- `src/pages/PaymentMethod.tsx` - Full payment page example
- `src/lib/maxelpay.types.ts` - TypeScript definitions

### Configuration
- `.env.maxelpay.example` - Environment variables template
- `setup-maxelpay.sh` - Setup verification script (bash)

### Documentation
- `MAXELPAY_COMPLETE.md` - Overview & summary ⭐ START HERE
- `MAXELPAY_CHECKLIST.md` - Setup checklist ⭐ DO THIS SECOND
- `MAXELPAY_DEVELOPER_GUIDE.md` - Code reference
- `MAXELPAY_SETUP.md` - Detailed guide

---

## 🏃 QUICK START (5 MINUTES)

```bash
# 1. Read the overview
cat MAXELPAY_COMPLETE.md

# 2. Follow the checklist
cat MAXELPAY_CHECKLIST.md

# 3. Verify setup (optional)
bash setup-maxelpay.sh

# 4. Set environment variables in Supabase Dashboard
# 5. Run: supabase migration up
# 6. Deploy: supabase functions deploy
```

---

## 💡 KEY INFORMATION

### API Credentials (Provided)
```
API Key: pk_test_NSNDhMZG8yNx0Wu2frhsZ0NIhW3Uh9v4
Webhook URL: https://example.com
```

### Environment Variables Required
```bash
MAXELPAY_API_KEY=pk_test_NSNDhMZG8yNx0Wu2frhsZ0NIhW3Uh9v4
MAXELPAY_WEBHOOK_SECRET=whsec_your_secret_here
ALLOWED_ORIGINS=https://your-domain.com,http://localhost:5173
SITE_URL=https://your-domain.com
```

### Edge Function URLs
```
Payment Creation: https://PROJECT-ID.supabase.co/functions/v1/maxelpay-payment
Webhook Handler: https://PROJECT-ID.supabase.co/functions/v1/maxelpay-webhook
```

---

## 🚀 USAGE EXAMPLE

```typescript
import MaxelpayCheckout from "@/components/MaxelpayCheckout";

export default function Checkout({ orderId, amount }) {
  return (
    <MaxelpayCheckout
      orderId={orderId}
      amount={amount}
      currency="USD"
      onSuccess={() => alert("Payment successful!")}
      onError={(e) => alert(`Error: ${e}`)}
    />
  );
}
```

---

## 📊 PAYMENT FLOW

```
1. User clicks button
   ↓
2. maxelpay-payment function creates session
   ↓
3. User redirected to Maxelpay checkout
   ↓
4. User completes payment
   ↓
5. Maxelpay sends webhook
   ↓
6. maxelpay-webhook function processes it
   ↓
7. Order status updated to "paid"
   ↓
8. User redirected to success page
```

---

## 🔐 SECURITY CHECKLIST

- ✅ Webhook signature verification (HMAC-SHA256)
- ✅ Row-level security on database tables
- ✅ API keys stored in Supabase secrets
- ✅ No credit card data stored locally
- ✅ HTTPS enforced
- ✅ CORS configured
- ✅ Authentication required for payment endpoint

---

## 📚 DOCUMENTATION MAP

| Document | Purpose | Audience | Read Time |
|----------|---------|----------|-----------|
| **MAXELPAY_COMPLETE.md** | Overview & quick start | Everyone | 5 min |
| **MAXELPAY_CHECKLIST.md** | Step-by-step setup | DevOps/Backend | 10 min |
| **MAXELPAY_DEVELOPER_GUIDE.md** | Code examples & patterns | Developers | 20 min |
| **MAXELPAY_SETUP.md** | Complete reference | Technical | 30 min |
| **This file** | Quick navigation | Everyone | 2 min |

---

## 🧪 TESTING

### Quick Test
```bash
# Test payment creation
curl -X POST http://localhost:54321/functions/v1/maxelpay-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"test-id","amount":100}'

# Test webhook
curl -X POST http://localhost:54321/functions/v1/maxelpay-webhook \
  -H "Content-Type: application/json" \
  -d '{"id":"txn_test","status":"success","order_id":"test-id"}'
```

### View Logs
```bash
supabase functions logs maxelpay-webhook
supabase functions logs maxelpay-payment
```

---

## 🐛 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Webhooks not received | Check MAXELPAY_WEBHOOK_SECRET + verify URL is public |
| Payment fails | Verify MAXELPAY_API_KEY is valid + check order exists |
| Database errors | Run `supabase migration up` again |
| CORS errors | Update ALLOWED_ORIGINS in Supabase secrets |
| Functions not found | Run `supabase functions deploy` |

See [MAXELPAY_CHECKLIST.md](./MAXELPAY_CHECKLIST.md#-troubleshooting) for more.

---

## 📞 SUPPORT

- 📖 Read the relevant documentation file above
- 🔗 Check [Maxelpay API Docs](https://docs.maxelpay.com)
- 📚 See [Supabase Docs](https://supabase.com/docs)
- 💬 Check project README for project-specific help

---

## ✨ FEATURES

### Payment Component
- One-click payments
- Turkish language support
- Loading states
- Error handling
- Responsive design

### Webhook Handler
- Signature verification
- Status tracking
- Audit logging
- CORS support

### Database
- Optimized schema
- Row-level security
- Indexes for performance
- Audit trails

---

## 🎯 NEXT STEPS

1. **Read** [MAXELPAY_COMPLETE.md](./MAXELPAY_COMPLETE.md)
2. **Follow** [MAXELPAY_CHECKLIST.md](./MAXELPAY_CHECKLIST.md)
3. **Code** with [MAXELPAY_DEVELOPER_GUIDE.md](./MAXELPAY_DEVELOPER_GUIDE.md)
4. **Reference** [MAXELPAY_SETUP.md](./MAXELPAY_SETUP.md)

---

## 📝 PROJECT STRUCTURE

```
src/
├── components/
│   └── MaxelpayCheckout.tsx        ← Use this in your UI
├── pages/
│   └── PaymentMethod.tsx           ← See this for example
└── lib/
    └── maxelpay.types.ts            ← TypeScript types

supabase/
├── functions/
│   ├── maxelpay-webhook/           ← Webhook handler
│   └── maxelpay-payment/           ← Payment creator
└── migrations/
    └── 20260606_maxelpay_setup.sql  ← Database schema

MAXELPAY_*.md                        ← Read these docs
```

---

## ✅ READY?

1. **I want to set up Maxelpay** → Read [MAXELPAY_COMPLETE.md](./MAXELPAY_COMPLETE.md)
2. **I want step-by-step instructions** → Follow [MAXELPAY_CHECKLIST.md](./MAXELPAY_CHECKLIST.md)
3. **I want code examples** → See [MAXELPAY_DEVELOPER_GUIDE.md](./MAXELPAY_DEVELOPER_GUIDE.md)
4. **I want all the details** → Read [MAXELPAY_SETUP.md](./MAXELPAY_SETUP.md)

---

**Last Updated**: June 6, 2026
**API Key**: pk_test_NSNDhMZG8yNx0Wu2frhsZ0NIhW3Uh9v4 (test)
**Status**: ✅ Ready to Deploy
