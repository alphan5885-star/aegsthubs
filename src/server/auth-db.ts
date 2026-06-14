import crypto from "crypto";
import db from "./db";

export function hashAccessCode(code: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(code, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyAccessCode(code: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    const hashBuffer = crypto.scryptSync(code, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return crypto.timingSafeEqual(hashBuffer, keyBuffer);
  } catch {
    return false;
  }
}

export async function findUserByIdentifier(
  identifier: string,
): Promise<any | null> {
  return await db
    .prepare('SELECT * FROM "Kullanicilar" WHERE identifier = ?')
    .get(identifier);
}

export async function createUser(params: {
  id: string;
  identifier: string;
  accessCodeHash: string;
  role: string;
}): Promise<void> {
  await db
    .prepare(
      'INSERT INTO "Kullanicilar" (id, identifier, access_code_hash, role) VALUES (?, ?, ?, ?)',
    )
    .run(params.id, params.identifier, params.accessCodeHash, params.role);
}
