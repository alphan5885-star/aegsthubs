import { createServerFn } from "@tanstack/react-start";
import db from "../server/db";
import crypto from "crypto";

function hashAccessCode(code: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(code, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyAccessCode(code: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  const hashBuffer = crypto.scryptSync(code, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  return crypto.timingSafeEqual(hashBuffer, keyBuffer);
}

export const loginAction = createServerFn({ method: "POST" })
  .inputValidator((data: { identifier: string; accessCode: string }) => data)
  .handler(async (ctx) => {
    const { identifier, accessCode } = ctx.data;

    const user = (await db
      .prepare('SELECT * FROM "Kullanicilar" WHERE identifier = ?')
      .get(identifier)) as any;

    if (!user) {
      throw new Error("User not found");
    }

    const isValid = verifyAccessCode(accessCode, user.access_code_hash);
    if (!isValid) {
      throw new Error("Invalid access code");
    }

    const token = crypto.randomBytes(32).toString("hex");

    return {
      success: true,
      user: {
        id: user.id,
        identifier: user.identifier,
        role: user.role,
        balance_ltc: user.balance_ltc,
        balance_btc: user.balance_btc,
      },
      token,
    };
  });

export const signupAction = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      identifier: string;
      accessCode: string;
      role: "vendor" | "buyer";
    }) => data,
  )
  .handler(async (ctx) => {
    const { identifier, accessCode, role } = ctx.data;

    if (!identifier || !accessCode || !role) {
      throw new Error("Missing required fields");
    }

    const cleanId = identifier.trim();
    if (cleanId.length === 0) {
      throw new Error("Identifier cannot be empty");
    }

    const existingUser = await db
      .prepare('SELECT id FROM "Kullanicilar" WHERE identifier = ?')
      .get(cleanId);
    if (existingUser) {
      throw new Error("Identifier already taken");
    }

    const id = crypto.randomUUID();
    const hash = hashAccessCode(accessCode);

    await db
      .prepare(
        'INSERT INTO "Kullanicilar" (id, identifier, access_code_hash, role) VALUES (?, ?, ?, ?)',
      )
      .run(id, cleanId, hash, role);

    const token = crypto.randomBytes(32).toString("hex");

    return {
      success: true,
      user: {
        id,
        identifier: cleanId,
        role,
        balance_ltc: 0,
        balance_btc: 0,
      },
      token,
    };
  });
