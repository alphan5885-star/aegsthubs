-- Neon/PostgreSQL schema initializer (Option 1)
-- Matches src/server/db.ts expectations: "Users", "Products", "Orders".
-- Run this in your Neon SQL editor after creating the database.

BEGIN;

CREATE TABLE IF NOT EXISTS "Users" (
  id TEXT PRIMARY KEY,
  identifier TEXT UNIQUE NOT NULL,
  access_code_hash TEXT NOT NULL,
  balance_ltc NUMERIC DEFAULT 0,
  balance_btc NUMERIC DEFAULT 0,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Products" (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  status TEXT DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(vendor_id) REFERENCES "Users"(id)
);

CREATE TABLE IF NOT EXISTS "Orders" (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  service_fee NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(product_id) REFERENCES "Products"(id),
  FOREIGN KEY(buyer_id) REFERENCES "Users"(id),
  FOREIGN KEY(vendor_id) REFERENCES "Users"(id)
);

-- Vendor bonds table
CREATE TABLE IF NOT EXISTS "vendor_bonds" (
  id SERIAL PRIMARY KEY,
  vendor_id TEXT UNIQUE NOT NULL,
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(vendor_id) REFERENCES "Users"(id)
);

-- User roles table
CREATE TABLE IF NOT EXISTS "user_roles" (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES "Users"(id)
);

-- User deposit addresses table
CREATE TABLE IF NOT EXISTS "user_deposit_addresses" (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL,
  network TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (if not exists)
CREATE TABLE IF NOT EXISTS "Islemler" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  temp_wallet_address TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'LTC',
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  tx_hash TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;

