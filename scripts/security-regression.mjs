#!/usr/bin/env node
/**
 * Security Regression Checks
 * Runs before every build to catch common security regressions.
 * Exit 1 = build blocked, Exit 0 = OK
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = process.cwd();
let errors = 0;
let warnings = 0;

function fail(msg) {
  console.error(`[SECURITY FAIL] ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`[SECURITY WARN] ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`[SECURITY OK]   ${msg}`);
}

// ── Collect all source files ──────────────────────────────────────────────────
function collectFiles(dir, exts = [".ts", ".tsx", ".js", ".mjs"]) {
  const results = [];
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith(".") || entry === "node_modules" || entry === "dist")
        continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...collectFiles(full, exts));
      } else if (exts.includes(extname(entry))) {
        results.push(full);
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return results;
}

const srcFiles = collectFiles(join(ROOT, "src"));

// ── Check 1: No hardcoded secrets / API keys in source ───────────────────────
const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]{20,}/, // Stripe live key
  /AKIA[0-9A-Z]{16}/, // AWS access key
  /-----BEGIN (RSA |EC )?PRIVATE KEY/, // Private keys
  /password\s*=\s*["'][^"']{8,}["']/i, // Hardcoded passwords
];

for (const file of srcFiles) {
  const rel = file.replace(ROOT, "");
  const content = readFileSync(file, "utf8");
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(content)) {
      fail(`Potential hardcoded secret in ${rel} (pattern: ${pattern})`);
    }
  }
}
ok("No hardcoded secrets detected in source files");

// ── Check 2: simulateWithdrawal must not exist in production code ─────────────
for (const file of srcFiles) {
  const rel = file.replace(ROOT, "");
  const content = readFileSync(file, "utf8");
  if (content.includes("simulateWithdrawal")) {
    fail(
      `simulateWithdrawal() found in ${rel} — remove simulation fallbacks before build`,
    );
  }
}
ok("No simulateWithdrawal() calls found");

// ── Check 3: MOCK_PIN_HASH must not be in source ──────────────────────────────
for (const file of srcFiles) {
  const rel = file.replace(ROOT, "");
  const content = readFileSync(file, "utf8");
  if (content.includes("MOCK_PIN_HASH")) {
    fail(`MOCK_PIN_HASH found in ${rel} — replace with real PIN hash logic`);
  }
}
ok("No MOCK_PIN_HASH found");

// ── Check 4: console.log must not leak sensitive data ────────────────────────
const SENSITIVE_LOG_PATTERNS = [
  /console\.log\(.*password/i,
  /console\.log\(.*pin/i,
  /console\.log\(.*secret/i,
  /console\.log\(.*private_key/i,
];
for (const file of srcFiles) {
  const rel = file.replace(ROOT, "");
  const content = readFileSync(file, "utf8");
  for (const pattern of SENSITIVE_LOG_PATTERNS) {
    if (pattern.test(content)) {
      warn(`Possible sensitive data in console.log at ${rel}`);
    }
  }
}
ok("No obvious sensitive console.log leaks");

// ── Check 5: .env must not be committed ──────────────────────────────────────
const gitignore = (() => {
  try {
    return readFileSync(join(ROOT, ".gitignore"), "utf8");
  } catch {
    return "";
  }
})();
if (!gitignore.includes(".env")) {
  fail(".env is not listed in .gitignore — secrets may be committed");
} else {
  ok(".env is in .gitignore");
}

// ── Check 6: Supabase client must use env vars, not hardcoded URLs ────────────
const clientFile = join(ROOT, "src", "integrations", "supabase", "client.ts");
try {
  const clientContent = readFileSync(clientFile, "utf8");
  if (
    /supabaseUrl\s*=\s*["']https:\/\//.test(clientContent) &&
    !clientContent.includes("import.meta.env")
  ) {
    warn("Supabase client may have hardcoded URL instead of env var");
  } else {
    ok("Supabase client uses env vars");
  }
} catch {
  warn("Could not read supabase client file");
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("");
console.log(`Security regression: ${errors} error(s), ${warnings} warning(s)`);

if (errors > 0) {
  console.error("Build blocked due to security errors.");
  process.exit(1);
}

process.exit(0);
