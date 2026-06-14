#!/usr/bin/env node
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function healthCheck() {
  try {
    console.log('====================================');
    console.log('HEALTH CHECK');
    console.log('====================================\n');

    // 1. Database Connection
    await sql`SELECT 1`;
    console.log('✅ Database: Connected');

    // 2. Check required tables
    const tables = await sql`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    const tableNames = tables.map(t => t.tablename);

    const requiredTables = ['Kullanicilar', 'Urunler', 'Siparisler', 'Islemler'];
    for (const table of requiredTables) {
      if (tableNames.includes(table)) {
        console.log(`✅ Table ${table}: Exists`);
      } else {
        console.error(`❌ Table ${table}: Missing`);
        throw new Error(`Missing required table: ${table}`);
      }
    }

    // 3. Check Islemler table columns
    const islemlerColumns = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'Islemler'`;
    const islemlerColNames = islemlerColumns.map(c => c.column_name);
    const requiredCols = ['tx_hash', 'status', 'amount', 'currency', 'type'];
    for (const col of requiredCols) {
      if (islemlerColNames.includes(col)) {
        console.log(`✅ Column ${col}: Exists`);
      } else {
        console.error(`❌ Column ${col}: Missing`);
        throw new Error(`Missing required column: ${col}`);
      }
    }

    // 4. Check env vars
    const requiredEnvVars = ['WALLET_ENCRYPTION_KEY', 'BTC_XPRV', 'LTC_XPRV'];
    for (const v of requiredEnvVars) {
      if (process.env[v]) {
        console.log(`✅ Env var ${v}: Set`);
      } else {
        console.error(`❌ Env var ${v}: Missing`);
        throw new Error(`Missing required env var: ${v}`);
      }
    }

    // 5. Check recent transactions
    const recentFailed = await sql`
      SELECT COUNT(*) as count FROM "Islemler" 
      WHERE type = 'withdraw' AND status = 'failed' 
      AND created_at > NOW() - INTERVAL '1 hour'`;
    console.log(`ℹ️  Failed withdrawals (last hour): ${recentFailed[0].count}`);

    const recentSuccess = await sql`
      SELECT COUNT(*) as count FROM "Islemler" 
      WHERE type = 'withdraw' AND status = 'completed' 
      AND created_at > NOW() - INTERVAL '1 hour'`;
    console.log(`ℹ️  Successful withdrawals (last hour): ${recentSuccess[0].count}`);

    console.log('\n====================================');
    console.log('✅ ALL CHECKS PASSED');
    console.log('====================================\n');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n====================================');
    console.error('❌ HEALTH CHECK FAILED');
    console.error('====================================');
    console.error(error.message);
    console.error('====================================\n');
    await sql.end();
    process.exit(1);
  }
}

healthCheck();
