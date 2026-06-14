#!/usr/bin/env node
import crypto from 'crypto';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function encrypt(text, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

async function main() {
  console.log('====================================');
  console.log('XPRV ENCRYPTION TOOL');
  console.log('====================================\n');

  const key = await question('Enter your WALLET_ENCRYPTION_KEY (32-byte hex): ');
  if (key.length !== 64) {
    console.error('Error: Key must be 32 bytes (64 hex characters)');
    process.exit(1);
  }

  const xprv = await question('Enter your raw XPRV key: ');
  const encrypted = encrypt(xprv, key);
  
  console.log('\n====================================');
  console.log('ENCRYPTED XPRV:');
  console.log(encrypted);
  console.log('====================================\n');
  console.log('Add this to your .env file as BTC_XPRV or LTC_XPRV\n');

  rl.close();
}

main().catch(console.error);
