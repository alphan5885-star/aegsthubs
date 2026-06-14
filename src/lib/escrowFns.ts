import db from "@/server/db";
import { createServerFn } from "@tanstack/react-start";

export const createPendingOrderFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      buyerId: string;
      productId: string;
      vendorId: string;
      amount: number;
      deliveryMethod: string;
    }) => data,
  )
  .handler(async (ctx) => {
    const { buyerId, productId, vendorId, amount, deliveryMethod } = ctx.data;

    // Check if buyer exists
    const buyer = (await db
      .prepare('SELECT * FROM "Kullanicilar" WHERE id = ?')
      .get(buyerId)) as any;
    if (!buyer) throw new Error("Buyer not found");

    const commission = amount * 0.05;
    const vendorEarning = amount * 0.95;
    const orderId = crypto.randomUUID();

    // Create Order in pending state (No balance deduction!)
    await db
      .prepare(
        `
      INSERT INTO "Siparisler" (id, buyer_id, product_id, vendor_id, status, amount, total_amount, commission, vendor_earning, delivery_method)
      VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `,
      )
      .run(
        orderId,
        buyerId,
        productId,
        vendorId,
        amount,
        amount, // total_amount is same as amount for now
        commission,
        vendorEarning,
        deliveryMethod
      );

    return { success: true, orderId };
  });

export const payWithWalletBalanceFn = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; currency: "BTC" | "LTC" }) => data)
  .handler(async (ctx) => {
    const { orderId, currency } = ctx.data;

    const order = (await db
      .prepare('SELECT * FROM "Siparisler" WHERE id = ?')
      .get(orderId)) as any;
    if (!order) throw new Error("Order not found");
    if (order.status !== "pending") throw new Error("Order is already paid or cancelled");

    const amount = Number(order.total_amount) || Number(order.amount);
    if (!amount || amount <= 0) throw new Error("Invalid order amount");

    const buyerId = order.buyer_id;
    const buyer = (await db
      .prepare('SELECT * FROM "Kullanicilar" WHERE id = ?')
      .get(buyerId)) as any;
    if (!buyer) throw new Error("Buyer not found");

    if (currency === "BTC") {
      if (buyer.balance_btc < amount) throw new Error("Yetersiz BTC bakiyesi");
      await db
        .prepare('UPDATE "Kullanicilar" SET balance_btc = balance_btc - ? WHERE id = ?')
        .run(amount, buyerId);
    } else {
      if (buyer.balance_ltc < amount) throw new Error("Yetersiz LTC bakiyesi");
      await db
        .prepare('UPDATE "Kullanicilar" SET balance_ltc = balance_ltc - ? WHERE id = ?')
        .run(amount, buyerId);
    }

    const commission = amount * 0.05;
    const vendorEarning = amount * 0.95;

    await db
      .prepare(`UPDATE "Siparisler" SET status = 'escrow_locked', commission = ?, vendor_earning = ? WHERE id = ?`)
      .run(commission, vendorEarning, orderId);

    return { success: true };
  });

export const getOrderDetailsFn = createServerFn({ method: "GET" })
  .inputValidator((data: { orderId: string }) => data)
  .handler(async (ctx) => {
    const { orderId } = ctx.data;

    const order = (await db
      .prepare(`
        SELECT s.*, u.title as product_title 
        FROM "Siparisler" s 
        LEFT JOIN "Urunler" u ON s.product_id = u.id 
        WHERE s.id = ?
      `)
      .get(orderId)) as any;

    if (!order) return null;
    return order;
  });

export const confirmCryptoPaymentFn = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string }) => data)
  .handler(async (ctx) => {
    const { orderId } = ctx.data;

    const order = (await db
      .prepare('SELECT * FROM "Siparisler" WHERE id = ?')
      .get(orderId)) as any;

    if (!order) throw new Error("Order not found");

    // Calculate splits if they are zero
    const amount = Number(order.total_amount) || Number(order.amount) || 0;
    const commission = amount * 0.05;
    const vendorEarning = amount * 0.95;

    // Update order status to indicate it has been paid by crypto and locked in escrow
    await db
      .prepare(
        `UPDATE "Siparisler" SET status = 'escrow_locked', commission = ?, vendor_earning = ? WHERE id = ?`
      )
      .run(commission, vendorEarning, orderId);

    return { success: true };
  });

export const confirmDeliveryFn = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; buyerId: string }) => data)
  .handler(async (ctx) => {
    const { orderId, buyerId } = ctx.data;

    const order = (await db
      .prepare('SELECT * FROM "Siparisler" WHERE id = ? AND buyer_id = ?')
      .get(orderId, buyerId)) as any;
    if (!order) throw new Error("Order not found or unauthorized");
    if (order.status !== "escrow_locked" && order.status !== "shipped")
      throw new Error("Order is not in a valid escrow state");

    // Add vendor earning to vendor
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
