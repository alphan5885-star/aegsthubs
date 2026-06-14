# CRYPTO E-COMMERCE PLATFORM - PRODUCTION DEPLOYMENT CHECKLIST

---

## 1. FINAL SECURITY AUDIT

### [ ] 1.1 Verify No Raw Key Logging
- **Check `hotWallet.ts`** for any `console.log`, `console.error`, or other logging of decrypted keys
- **Verify**:
  - Keys are only decrypted in memory
  - Memory is wiped after use
  - No logging of sensitive data

### [ ] 1.2 Verify Encryption Key Usage
- Confirm `WALLET_ENCRYPTION_KEY` is always loaded from environment variables
- Never hardcoded
- Never committed to git

### [ ] 1.3 Verify Secure Memory Handling
- Confirm `wipeBuffer` function is called
- Decrypted keys are not stored in variables longer than necessary

---

## 2. ENVIRONMENT SETUP

### [ ] 2.1 Generate Required Keys
```bash
# Generate WALLET_ENCRYPTION_KEY (32-byte hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### [ ] 2.2 Encrypt XPRV Keys
```bash
# Encrypt your raw BTC XPRV
node scripts/encrypt-xprv.mjs

# Encrypt your raw LTC XPRV
node scripts/encrypt-xprv.mjs
```

### [ ] 2.3 Configure Production .env
- Copy `.env.production.example` to `.env` on production VPS
- Fill in **all** values with real production keys
- **DO NOT** commit `.env` to git!

### [ ] 2.4 Verify Environment Variables
```bash
# Check that all required env vars are set
node -e "
const required = ['DATABASE_URL', 'WALLET_ENCRYPTION_KEY', 'BTC_XPRV', 'LTC_XPRV'];
const missing = required.filter(v => !process.env[v]);
if (missing.length) { console.error('Missing env vars:', missing); process.exit(1); }
console.log('All env vars present!');
"
```

---

## 3. DATABASE READINESS

### [ ] 3.1 Verify PostgreSQL Connection
```bash
# Test connection (replace with your DATABASE_URL)
psql "postgresql://user:password@localhost:5432/crypto_platform"
```

### [ ] 3.2 Initialize Database Schema
The schema is auto-initialized when the app starts, but you can run manually:
```sql
-- Connect to PostgreSQL first
-- Islemler table already has required columns (tx_hash, status, amount, currency)
-- Verify table structure:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Islemler' 
ORDER BY ordinal_position;
```

### [ ] 3.3 Verify Indexes (Optional but Recommended)
```sql
-- Create indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_islemler_user_id ON "Islemler"(user_id);
CREATE INDEX IF NOT EXISTS idx_islemler_currency ON "Islemler"(currency);
CREATE INDEX IF NOT EXISTS idx_islemler_type ON "Islemler"(type);
CREATE INDEX IF NOT EXISTS idx_islemler_status ON "Islemler"(status);
CREATE INDEX IF NOT EXISTS idx_islemler_created_at ON "Islemler"(created_at);
```

---

## 4. PRODUCTION BUILD

### [ ] 4.1 Install Production Dependencies
```bash
npm ci --only=production
```

### [ ] 4.2 Build Application
```bash
npm run build
```

### [ ] 4.3 Run Pre-Deployment Checks
```bash
npm run check
```

---

## 5. PRODUCTION DEPLOYMENT

### [ ] 5.1 Start Application with Process Manager
We recommend using **PM2** for process management:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start npm --name "crypto-platform" -- start

# Or if using a custom start script:
# pm2 start ecosystem.config.js
```

### [ ] 5.2 Verify Application is Running
```bash
pm2 status
pm2 logs crypto-platform
```

### [ ] 5.3 Set Up Auto-Start on Reboot
```bash
pm2 startup
pm2 save
```

---

## 6. MONITORING CHECKLIST

### [ ] 6.1 Monitor Application Logs
```bash
# Tail PM2 logs in real-time
pm2 logs crypto-platform --lines 100

# Show only error logs
pm2 logs crypto-platform --err
```

### [ ] 6.2 Monitor Withdrawals & Transactions
```sql
-- Check pending withdrawals
SELECT * FROM "Islemler" 
WHERE type = 'withdraw' AND status = 'pending' 
ORDER BY created_at DESC;

-- Check failed transactions (last 24 hours)
SELECT * FROM "Islemler" 
WHERE type = 'withdraw' AND status = 'failed' 
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check successful transactions (last 24 hours)
SELECT * FROM "Islemler" 
WHERE type = 'withdraw' AND status = 'completed' 
AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;
```

### [ ] 6.3 Monitor Hot Wallet Balance
```bash
# For BTC: Check balance using your preferred method (mempool.space API, etc.)
# For LTC: Check balance using litecoinspace.org API, etc.
```

### [ ] 6.4 Set Up Alerting
- Configure Telegram bot (already set up in code!)
- Monitor `failed` status transactions
- Monitor daily withdrawal limits

---

## 7. GO-LIVE CHECKLIST

### [ ] 7.1 Final Test Transaction
- Perform a small test deposit
- Perform a small test withdrawal
- Verify transaction completes successfully

### [ ] 7.2 Verify Escrow & Order Flow
- Create test order
- Test payment flow
- Verify escrow state changes

### [ ] 7.3 Verify Notifications
- Confirm Telegram alerts are sent for all withdrawals

### [ ] 7.4 Enable Live Mode
- Update UI to show "Live" instead of "Test"
- Start accepting real transactions!

---

## QUICK REFERENCE: COMMON PRODUCTION COMMANDS

```bash
# Application Management
pm2 start npm --name "crypto-platform" -- start
pm2 stop crypto-platform
pm2 restart crypto-platform
pm2 delete crypto-platform
pm2 status
pm2 logs crypto-platform

# Database Queries
psql $DATABASE_URL

# Update Application
git pull
npm ci --only=production
npm run build
pm2 restart crypto-platform
```
