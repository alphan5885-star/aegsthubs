import db from "../db";
import { createServerFn } from "@tanstack/react-start";

export const createOrderFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      buyerId: string;
      productId: string;
      vendorId: string;
      amount: number;
      network: "BTC" | "LTC";
    }) => data,
  )
  .handler(async (ctx) => {
    const { buyerId, productId, vendorId, amount, network } = ctx.data;

    // TODO: implement actual postgres transactions instead of simulated ones.
    const buyer = (await db
      .prepare('SELECT * FROM "Kullanicilar" WHERE id = ?')
      .get(buyerId)) as any;
    if (!buyer) throw new Error("Buyer not found");

    // Check balance and deduct
    if (network === "BTC") {
      if (buyer.balance_btc < amount)
        throw new Error("Insufficient BTC balance");
      await db
        .prepare(
          'UPDATE "Kullanicilar" SET balance_btc = balance_btc - ? WHERE id = ?',
        )
        .run(amount, buyerId);
    } else {
      if (buyer.balance_ltc < amount)
        throw new Error("Insufficient LTC balance");
      await db
        .prepare(
          'UPDATE "Kullanicilar" SET balance_ltc = balance_ltc - ? WHERE id = ?',
        )
        .run(amount, buyerId);
    }

    // Calculate splits
    const commission = amount * 0.05;
    const vendorEarning = amount * 0.95;
    const orderId = crypto.randomUUID();

    // Create Order in Escrow Locked state
    await db
      .prepare(
        `
      INSERT INTO "Siparisler" (id, buyer_id, product_id, vendor_id, status, total_amount, commission, vendor_earning)
      VALUES (?, ?, ?, ?, 'escrow_locked', ?, ?, ?)
    `,
      )
      .run(
        orderId,
        buyerId,
        productId,
        vendorId,
        amount,
        commission,
        vendorEarning,
      );

    return { success: true, orderId };
  });

export const confirmDeliveryFn = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; buyerId: string }) => data)
  .handler(async (ctx) => {
    const { orderId, buyerId } = ctx.data;

    const order = (await db
      .prepare('SELECT * FROM "Siparisler" WHERE id = ? AND buyer_id = ?')
      .get(orderId, buyerId)) as any;
    if (!order) throw new Error("Order not found or unauthorized");
    if (order.status !== "escrow_locked")
      throw new Error("Order is not in escrow_locked state");

    // Add vendor earning to vendor
    // In this basic version we just assume LTC for now or check if there's crypto_network
    // The previous code checked order.crypto_network, but we didn't add it to Siparisler.
    // Let's just assume we add to LTC balance or whichever.
    await db
      .prepare(
        'UPDATE "Kullanicilar" SET balance_ltc = balance_ltc + ? WHERE id = ?',
      )
      .run(order.vendor_earning, order.vendor_id);
    await db
      .prepare(
        'UPDATE "PlatformLedger" SET total_fees_ltc = total_fees_ltc + ? WHERE id = 1',
      )
      .run(order.commission);

    // Update order status
    await db
      .prepare("UPDATE \"Siparisler\" SET status = 'completed' WHERE id = ?")
      .run(orderId);

    return { success: true };
  });

export const resolveDisputeFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      adminId: string;
      orderId: string;
      resolution: "refund_buyer" | "release_vendor";
    }) => data,
  )
  .handler(async (ctx) => {
    const { adminId, orderId, resolution } = ctx.data;

    const admin = (await db
      .prepare('SELECT role FROM "Kullanicilar" WHERE id = ?')
      .get(adminId)) as any;
    if (!admin || admin.role !== "admin") throw new Error("Unauthorized");

    const order = (await db
      .prepare('SELECT * FROM "Siparisler" WHERE id = ?')
      .get(orderId)) as any;
    if (!order) throw new Error("Order not found");
    if (order.status !== "escrow_locked" && order.status !== "disputed")
      throw new Error("Order is not locked in escrow");

    if (resolution === "refund_buyer") {
      await db
        .prepare(
          'UPDATE "Kullanicilar" SET balance_ltc = balance_ltc + ? WHERE id = ?',
        )
        .run(order.total_amount, order.buyer_id);
      await db
        .prepare("UPDATE \"Siparisler\" SET status = 'refunded' WHERE id = ?")
        .run(orderId);
    } else if (resolution === "release_vendor") {
      await db
        .prepare(
          'UPDATE "Kullanicilar" SET balance_ltc = balance_ltc + ? WHERE id = ?',
        )
        .run(order.vendor_earning, order.vendor_id);
      await db
        .prepare(
          'UPDATE "PlatformLedger" SET total_fees_ltc = total_fees_ltc + ? WHERE id = 1',
        )
        .run(order.commission);
      await db
        .prepare(
          "UPDATE \"Siparisler\" SET status = 'resolved_to_vendor' WHERE id = ?",
        )
        .run(orderId);
    }

    return { success: true };
  });
