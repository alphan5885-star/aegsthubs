import db from "@/server/db";
import { createServerFn } from "@tanstack/react-start";
import { generateDepositAddress } from "@/server/crypto/wallet";
import { broadcastBtcTx, broadcastLtcTx, validateAddress } from "@/server/crypto/hotWallet";
import { sendTelegramAlert } from "@/server/crypto/telegramAlert";
import { validateXmrAddress, broadcastXmrTx } from "@/server/crypto/xmrWallet";

// Environment variables for limits
const MAX_DAILY_WITHDRAWAL_BTC = Number(process.env.MAX_DAILY_WITHDRAWAL_BTC || 1);
const MAX_DAILY_WITHDRAWAL_LTC = Number(process.env.MAX_DAILY_WITHDRAWAL_LTC || 100);
const MAX_DAILY_WITHDRAWAL_XMR = Number(process.env.MAX_DAILY_WITHDRAWAL_XMR || 10);
const MAX_TX_WITHDRAWAL_BTC = Number(process.env.MAX_TX_WITHDRAWAL_BTC || 0.1);
const MAX_TX_WITHDRAWAL_LTC = Number(process.env.MAX_TX_WITHDRAWAL_LTC || 10);
const MAX_TX_WITHDRAWAL_XMR = Number(process.env.MAX_TX_WITHDRAWAL_XMR || 1);

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

    // Always generate a new deposit address (for better privacy)
    const txId = crypto.randomUUID();
    const address = generateDepositAddress(userId, txId, network);

    await db
      .prepare(
        `INSERT INTO "Islemler" (id, temp_wallet_address, user_id, amount, currency, type) VALUES (?, ?, ?, 0, ?, 'deposit')`,
      )
      .run(txId, address, userId, network);

    return { address, balances };
  });

export const requestWithdrawFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      userId: string;
      address: string;
      amount: number;
      network: "BTC" | "LTC" | "XMR";
      pinCode: string;
    }) => data,
  )
  .handler(async (ctx) => {
    const { userId, address, amount, network, pinCode } = ctx.data;

    // Validate address
    if (network === "XMR") {
      if (!validateXmrAddress(address)) {
        throw new Error("Invalid Monero wallet address");
      }
    } else {
      if (!validateAddress(address, network)) {
        throw new Error("Invalid wallet address");
      }
    }

    // Validate transaction limits
    const maxTx = network === "BTC" ? MAX_TX_WITHDRAWAL_BTC : 
                 network === "LTC" ? MAX_TX_WITHDRAWAL_LTC : 
                 MAX_TX_WITHDRAWAL_XMR;
    if (amount > maxTx) {
      throw new Error(`Transaction amount exceeds limit (max ${maxTx} ${network})`);
    }

    // Fetch user
    const user = (await db
      .prepare('SELECT * FROM "Kullanicilar" WHERE id = ?')
      .get(userId)) as any;
    if (!user) throw new Error("User not found");

    // Check balance
    if (network === "XMR") {
      // For testing, allow XMR withdrawals with mock balance
      // In production, add balance_xmr to DB schema
      console.log(`[XMR TEST] Withdrawal requested: ${amount} XMR`);
    } else if (network === "BTC") {
      if (user.balance_btc < amount) throw new Error("Insufficient BTC balance");
    } else {
      if (user.balance_ltc < amount) throw new Error("Insufficient LTC balance");
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const dailyWithdrawals = (await db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM "Islemler" WHERE user_id = ? AND currency = ? AND type = 'withdraw' AND status = 'completed' AND DATE(created_at) = ?`,
      )
      .get(userId, network, today)) as any;
    const totalToday = Number(dailyWithdrawals?.total || 0);
    const maxDaily = network === "BTC" ? MAX_DAILY_WITHDRAWAL_BTC : 
                    network === "LTC" ? MAX_DAILY_WITHDRAWAL_LTC : 
                    MAX_DAILY_WITHDRAWAL_XMR;
    if (totalToday + amount > maxDaily) {
      throw new Error(`Daily withdrawal limit exceeded (max ${maxDaily} ${network}/day)`);
    }

    // Create withdrawal transaction record
    const txId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO "Islemler" (id, user_id, amount, currency, type, status) VALUES (?, ?, ?, ?, 'withdraw', 'pending')`,
      )
      .run(txId, userId, amount, network);

    try {
      // Decrement balance first (if not XMR)
      if (network === "BTC") {
        await db
          .prepare(
            `UPDATE "Kullanicilar" SET balance_btc = balance_btc - ? WHERE id = ?`,
          )
          .run(amount, userId);
      } else if (network === "LTC") {
        await db
          .prepare(
            `UPDATE "Kullanicilar" SET balance_ltc = balance_ltc - ? WHERE id = ?`,
          )
          .run(amount, userId);
      }

      // Broadcast transaction
      let txHash: string;
      if (network === "BTC") {
        const satoshis = Math.floor(amount * 100000000);
        txHash = await broadcastBtcTx(address, satoshis);
      } else if (network === "LTC") {
        const litoshis = Math.floor(amount * 100000000);
        txHash = await broadcastLtcTx(address, litoshis);
      } else {
        const atomicUnits = Math.floor(amount * 1000000000000); // XMR has 12 decimals
        txHash = await broadcastXmrTx(address, atomicUnits);
      }

      // Update transaction record
      await db
        .prepare(
          `UPDATE "Islemler" SET status = 'completed', tx_hash = ? WHERE id = ?`,
        )
        .run(txHash, txId);

      // Send Telegram alert
      await sendTelegramAlert(
        `*Withdrawal Successful*\n` +
        `User: ${userId}\n` +
        `Amount: ${amount} ${network}\n` +
        `Address: ${address}\n` +
        `TX Hash: ${txHash}`
      );

      return { success: true, txHash };
    } catch (error) {
      // Rollback balance if broadcast fails (if not XMR)
      if (network === "BTC") {
        await db
          .prepare(
            `UPDATE "Kullanicilar" SET balance_btc = balance_btc + ? WHERE id = ?`,
          )
          .run(amount, userId);
      } else if (network === "LTC") {
        await db
          .prepare(
            `UPDATE "Kullanicilar" SET balance_ltc = balance_ltc + ? WHERE id = ?`,
          )
          .run(amount, userId);
      }

      // Update transaction record as failed
      await db
        .prepare(
          `UPDATE "Islemler" SET status = 'failed' WHERE id = ?`,
        )
        .run(txId);

      // Send Telegram alert
      await sendTelegramAlert(
        `*Withdrawal Failed*\n` +
        `User: ${userId}\n` +
        `Amount: ${amount} ${network}\n` +
        `Address: ${address}\n` +
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );

      throw error;
    }
  });

export const getLatestOrderIdFn = createServerFn({ method: "GET" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async (ctx) => {
    const { userId } = ctx.data;
    
    const order = (await db
      .prepare('SELECT id FROM "Siparisler" WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(userId)) as any;

    return { orderId: order?.id || null };
  });

// VENDOR WALLET FUNCTIONS
export const getVendorWalletFn = createServerFn({ method: "POST" })
  .inputValidator((data: { vendorId: string }) => data)
  .handler(async (ctx) => {
    const { vendorId } = ctx.data;

    // Fetch vendor data (using Kullanicilar table for now, can extend to vendor_wallets later)
    const vendor = (await db
      .prepare('SELECT balance_btc, balance_ltc FROM "Kullanicilar" WHERE id = ?')
      .get(vendorId)) as any;

    // Fetch vendor orders
    const orders = (await db
      .prepare('SELECT id, amount, status, service_fee, created_at FROM "Siparisler" WHERE vendor_id = ? ORDER BY created_at DESC')
      .all(vendorId)) as any[];

    // Calculate wallet values (for now using LTC as base like original code)
    let pending = 0;
    let available = 0;
    let commission = 0;
    let totalRevenue = 0;

    const completedOrders: any[] = [];
    const pendingOrders: any[] = [];

    orders.forEach((order: any) => {
      const orderAmount = Number(order.amount || 0);
      const orderFee = Number(order.service_fee || 0);
      
      totalRevenue += orderAmount;
      commission += orderFee;

      if (order.status === "completed" || order.status === "delivered") {
        available += orderAmount;
        completedOrders.push(order);
      } else if (order.status === "paid" || order.status === "pending") {
        pending += orderAmount;
        pendingOrders.push(order);
      }
    });

    return {
      wallet: {
        pending,
        available,
        commission,
        total: pending + available + commission,
      },
      orderSummary: {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        pendingOrders: pendingOrders.length,
        totalRevenue,
        totalCommission: commission,
      },
      recentOrders: orders.slice(0, 10),
      balances: {
        BTC: Number(vendor?.balance_btc || 0),
        LTC: Number(vendor?.balance_ltc || 0),
        XMR: 0, // XMR not supported in DB schema yet
      },
    };
  });

export const vendorWithdrawFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      vendorId: string;
      address: string;
      amount: number;
      network: "BTC" | "LTC" | "XMR";
    }) => data,
  )
  .handler(async (ctx) => {
    const { vendorId, address, amount, network } = ctx.data;

    // Validate address
    if (network === "XMR") {
      if (!validateXmrAddress(address)) {
        throw new Error("Invalid Monero wallet address");
      }
    } else {
      if (!validateAddress(address, network)) {
        throw new Error("Invalid wallet address");
      }
    }

    // Validate transaction limits
    const maxTx = network === "BTC" ? MAX_TX_WITHDRAWAL_BTC : 
                 network === "LTC" ? MAX_TX_WITHDRAWAL_LTC : 
                 MAX_TX_WITHDRAWAL_XMR;
    if (amount > maxTx) {
      throw new Error(`Transaction amount exceeds limit (max ${maxTx} ${network})`);
    }

    // Fetch vendor
    const vendor = (await db
      .prepare('SELECT * FROM "Kullanicilar" WHERE id = ?')
      .get(vendorId)) as any;
    if (!vendor) throw new Error("Vendor not found");

    // Check balance (for now, assuming LTC is base balance)
    if (network === "LTC" && vendor.balance_ltc < amount) {
      throw new Error("Insufficient LTC balance");
    } else if (network === "XMR") {
      console.log(`[XMR TEST] Vendor withdrawal requested: ${amount} XMR`);
    }

    // Check daily limit
    const today = new Date().toISOString().split('T')[0];
    const dailyWithdrawals = (await db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM "Islemler" WHERE user_id = ? AND currency = ? AND type = 'withdraw' AND status = 'completed' AND DATE(created_at) = ?`,
      )
      .get(vendorId, network, today)) as any;
    const totalToday = Number(dailyWithdrawals?.total || 0);
    let maxDaily: number;
    if ((network as string) === "BTC") {
      maxDaily = MAX_DAILY_WITHDRAWAL_BTC;
    } else if (network === "LTC") {
      maxDaily = MAX_DAILY_WITHDRAWAL_LTC;
    } else {
      maxDaily = MAX_DAILY_WITHDRAWAL_XMR;
    }
    if (totalToday + amount > maxDaily) {
      throw new Error(`Daily withdrawal limit exceeded (max ${maxDaily} ${network}/day)`);
    }

    // Create withdrawal transaction record
    const txId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO "Islemler" (id, user_id, amount, currency, type, status) VALUES (?, ?, ?, ?, 'withdraw', 'pending')`,
      )
      .run(txId, vendorId, amount, network);

    try {
      // Decrement balance first (if LTC)
      if (network === "LTC") {
        await db
          .prepare(
            `UPDATE "Kullanicilar" SET balance_ltc = balance_ltc - ? WHERE id = ?`,
          )
          .run(amount, vendorId);
      }

      // Broadcast transaction
      let txHash: string;
      if ((network as string) === "BTC") {
        const satoshis = Math.floor(amount * 100000000);
        txHash = await broadcastBtcTx(address, satoshis);
      } else if (network === "LTC") {
        const litoshis = Math.floor(amount * 100000000);
        txHash = await broadcastLtcTx(address, litoshis);
      } else {
        const atomicUnits = Math.floor(amount * 1000000000000); // XMR has 12 decimals
        txHash = await broadcastXmrTx(address, atomicUnits);
      }

      // Update transaction record
      await db
        .prepare(
          `UPDATE "Islemler" SET status = 'completed', tx_hash = ? WHERE id = ?`,
        )
        .run(txHash, txId);

      // Send Telegram alert
      await sendTelegramAlert(
        `*Vendor Withdrawal Successful*\n` +
        `Vendor: ${vendorId}\n` +
        `Amount: ${amount} ${network}\n` +
        `Address: ${address}\n` +
        `TX Hash: ${txHash}`
      );

      return { success: true, txHash };
    } catch (error) {
      // Rollback balance if broadcast fails (if LTC)
      if (network === "LTC") {
        await db
          .prepare(
            `UPDATE "Kullanicilar" SET balance_ltc = balance_ltc + ? WHERE id = ?`,
          )
          .run(amount, vendorId);
      }

      // Update transaction record as failed
      await db
        .prepare(
          `UPDATE "Islemler" SET status = 'failed' WHERE id = ?`,
        )
        .run(txId);

      // Send Telegram alert
      await sendTelegramAlert(
        `*Vendor Withdrawal Failed*\n` +
        `Vendor: ${vendorId}\n` +
        `Amount: ${amount} ${network}\n` +
        `Address: ${address}\n` +
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );

      throw error;
    }
  });
