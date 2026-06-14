import db from "./db";
import { createServerFn } from "@tanstack/react-start";
import { generateDepositAddress } from "./crypto/wallet";

export const getDepositAddressFn = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; network: "BTC" | "LTC" | "XMR" }) => data)
  .handler(async (ctx) => {
    const { userId, network } = ctx.data;

    // Fetch real balances from Kullanicilar
    const user = (await db
      .prepare('SELECT balance_btc, balance_ltc FROM "Kullanicilar" WHERE id = ?')
      .get(userId)) as any;

    const balances = {
      BTC: Number(user?.balance_btc || 0),
      LTC: Number(user?.balance_ltc || 0),
      XMR: 0, // XMR not supported in DB schema yet
    };

    if (network === "XMR") {
      return { 
        address: "49VZg8Rqy31LHQpy1rdHFgawh4dcErZEaREXSrqEqivJaPLxGE6Srk8cXoxdWdfSm9c4uduESinA55PCd3reZoov8SSvTXD",
        balances 
      };
    }

    // Check if user has an existing deposit address for this network
    const tx = (await db
      .prepare(
        `SELECT temp_wallet_address FROM "Islemler" WHERE user_id = ? AND currency = ? AND type = 'deposit' ORDER BY created_at DESC LIMIT 1`,
      )
      .get(userId, network)) as any;

    let address = tx?.temp_wallet_address;

    if (!address) {
      const txId = crypto.randomUUID();
      address = generateDepositAddress(userId, txId, network as "BTC" | "LTC");

      await db
        .prepare(
          `INSERT INTO "Islemler" (id, temp_wallet_address, user_id, amount, currency, type) VALUES (?, ?, ?, 0, ?, 'deposit')`,
        )
        .run(txId, address, userId, network);
    }

    return { address, balances };
  });

export const requestWithdrawFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      userId: string;
      address: string;
      amount: number;
      network: "BTC" | "LTC";
      pinCode: string;
    }) => data,
  )
  .handler(async (ctx) => {
    const { userId, address, amount, network, pinCode } = ctx.data;

    // We would normally verify the pinCode against Kullanicilar table or Profiles
    // For now, just decrement the balance
    const user = (await db
      .prepare('SELECT * FROM "Kullanicilar" WHERE id = ?')
      .get(userId)) as any;
    if (!user) throw new Error("User not found");

    if (network === "BTC") {
      if (user.balance_btc < amount)
        throw new Error("Insufficient BTC balance");
      await db
        .prepare(
          `UPDATE "Kullanicilar" SET balance_btc = balance_btc - ? WHERE id = ?`,
        )
        .run(amount, userId);
    } else {
      if (user.balance_ltc < amount)
        throw new Error("Insufficient LTC balance");
      await db
        .prepare(
          `UPDATE "Kullanicilar" SET balance_ltc = balance_ltc - ? WHERE id = ?`,
        )
        .run(amount, userId);
    }

    return { success: true };
  });
