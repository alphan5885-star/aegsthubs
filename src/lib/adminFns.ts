import { createServerFn } from "@tanstack/react-start";
import db from "../server/db";
import crypto from "crypto";

export interface Stats {
  totalVolume: { btc: number; ltc: number; xmr: number };
  activeDisputes: number;
  totalVendors: number;
  totalOrders: number;
  totalCommissions: { btc: number; ltc: number; xmr: number };
  heldEscrow: { btc: number; ltc: number; xmr: number };
  volume24h: { btc: number; ltc: number; xmr: number };
  pendingPayments: number;
  adminBalance: { btc: number; ltc: number; xmr: number };
}

export interface AuditLog {
  id: string;
  action: string;
  target_type: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

// Get comprehensive admin statistics from database
export const getAdminStatsFn = createServerFn({ method: "POST" }).handler(async (ctx) => {
  try {
    // Total orders and volume
    const orders = await db`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN currency = 'BTC' THEN amount ELSE 0 END), 0) as btc_vol,
        COALESCE(SUM(CASE WHEN currency = 'LTC' THEN amount ELSE 0 END), 0) as ltc_vol,
        COALESCE(SUM(CASE WHEN currency = 'XMR' THEN amount ELSE 0 END), 0) as xmr_vol
      FROM "Siparisler"
      WHERE status IN ('completed', 'shipped', 'paid')
    `;

    // Volume in last 24 hours
    const volume24h = await db`
      SELECT 
        COALESCE(SUM(CASE WHEN currency = 'BTC' THEN amount ELSE 0 END), 0) as btc_vol,
        COALESCE(SUM(CASE WHEN currency = 'LTC' THEN amount ELSE 0 END), 0) as ltc_vol,
        COALESCE(SUM(CASE WHEN currency = 'XMR' THEN amount ELSE 0 END), 0) as xmr_vol
      FROM "Siparisler"
      WHERE status IN ('completed', 'shipped', 'paid')
        AND created_at > NOW() - INTERVAL '24 hours'
    `;

    // Weekly volume (last 7 days)
    const weeklyData = await db`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(CASE WHEN currency = 'BTC' THEN amount ELSE 0 END), 0) as btc_vol,
        COALESCE(SUM(CASE WHEN currency = 'LTC' THEN amount ELSE 0 END), 0) as ltc_vol,
        COALESCE(SUM(CASE WHEN currency = 'XMR' THEN amount ELSE 0 END), 0) as xmr_vol
      FROM "Siparisler"
      WHERE status IN ('completed', 'shipped', 'paid')
        AND created_at > NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Total commissions
    const commissions = await db`
      SELECT 
        COALESCE(SUM(CASE WHEN currency = 'BTC' THEN commission ELSE 0 END), 0) as btc_comm,
        COALESCE(SUM(CASE WHEN currency = 'LTC' THEN commission ELSE 0 END), 0) as ltc_comm,
        COALESCE(SUM(CASE WHEN currency = 'XMR' THEN commission ELSE 0 END), 0) as xmr_comm
      FROM "Siparisler"
      WHERE status = 'completed'
    `;

    // Held escrow
    const escrow = await db`
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN currency = 'BTC' THEN amount ELSE 0 END), 0) as btc_esc,
        COALESCE(SUM(CASE WHEN currency = 'LTC' THEN amount ELSE 0 END), 0) as ltc_esc,
        COALESCE(SUM(CASE WHEN currency = 'XMR' THEN amount ELSE 0 END), 0) as xmr_esc
      FROM "Siparisler"
      WHERE status = 'pending'
    `;

    // Total vendors
    const vendors = await db`
      SELECT COUNT(*) as count FROM "Kullanicilar" WHERE role = 'vendor'
    `;

    // Active disputes (mocked for now - add disputes table later)
    const disputes = 3; // TODO: Query actual disputes table when implemented

    // Pending payments
    const pending = await db`
      SELECT COUNT(*) as count FROM "Siparisler" WHERE status = 'pending'
    `;

    // Admin balance (commission pool)
    const adminBal = commissions[0] || { btc_comm: 0, ltc_comm: 0, xmr_comm: 0 };

    // Audit logs (last 50)
    const auditLogs = await db`
      SELECT id, action, target_type, metadata, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 50
    `;

    // Format week data
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekData = weeklyData.map((day: any) => ({
      name: days[new Date(day.date).getDay()],
      btc: parseFloat(day.btc_vol),
      ltc: parseFloat(day.ltc_vol),
      xmr: parseFloat(day.xmr_vol),
    }));

    const stats: Stats = {
      totalVolume: {
        btc: parseFloat(orders[0]?.btc_vol || 0),
        ltc: parseFloat(orders[0]?.ltc_vol || 0),
        xmr: parseFloat(orders[0]?.xmr_vol || 0),
      },
      activeDisputes: disputes,
      totalVendors: vendors[0]?.count || 0,
      totalOrders: orders[0]?.count || 0,
      totalCommissions: {
        btc: parseFloat(adminBal.btc_comm || 0),
        ltc: parseFloat(adminBal.ltc_comm || 0),
        xmr: parseFloat(adminBal.xmr_comm || 0),
      },
      heldEscrow: {
        btc: parseFloat(escrow[0]?.btc_esc || 0),
        ltc: parseFloat(escrow[0]?.ltc_esc || 0),
        xmr: parseFloat(escrow[0]?.xmr_esc || 0),
      },
      volume24h: {
        btc: parseFloat(volume24h[0]?.btc_vol || 0),
        ltc: parseFloat(volume24h[0]?.ltc_vol || 0),
        xmr: parseFloat(volume24h[0]?.xmr_vol || 0),
      },
      pendingPayments: pending[0]?.count || 0,
      adminBalance: {
        btc: parseFloat(adminBal.btc_comm || 0),
        ltc: parseFloat(adminBal.ltc_comm || 0),
        xmr: parseFloat(adminBal.xmr_comm || 0),
      },
    };

    return { success: true, stats, weekData, escrows: [], auditLogs };
  } catch (e) {
    console.error("getAdminStats error:", e);
    return { 
      success: false, 
      error: "Failed to load admin stats",
      stats: {
        totalVolume: { btc: 0, ltc: 0, xmr: 0 },
        activeDisputes: 0,
        totalVendors: 0,
        totalOrders: 0,
        totalCommissions: { btc: 0, ltc: 0, xmr: 0 },
        heldEscrow: { btc: 0, ltc: 0, xmr: 0 },
        volume24h: { btc: 0, ltc: 0, xmr: 0 },
        pendingPayments: 0,
        adminBalance: { btc: 0, ltc: 0, xmr: 0 },
      },
      weekData: [],
      escrows: [],
      auditLogs: [],
    };
  }
});

// Get all users (admin)
export const getAdminUsersFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const users = await db`
      SELECT id, identifier, display_name, role, vendor_rating, vendor_bond_paid, balance_ltc, balance_btc, created_at
      FROM "Kullanicilar"
      ORDER BY created_at DESC
    `;
    return { success: true, users };
  } catch (e) {
    console.error("getAdminUsersFn error:", e);
    return { success: false, error: "Failed to get users", users: [] };
  }
});

// Get all orders (admin)
export const getAdminOrdersFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const orders = await db`
      SELECT 
        s.id, s.product_id, s.buyer_id, s.vendor_id, s.amount, s.status,
        s.delivery_method, s.created_at, p.title as product_name,
        b.display_name as buyer_name, v.display_name as vendor_name
      FROM "Siparisler" s
      LEFT JOIN "Urunler" p ON s.product_id = p.id
      LEFT JOIN "Kullanicilar" b ON s.buyer_id = b.id
      LEFT JOIN "Kullanicilar" v ON s.vendor_id = v.id
      ORDER BY s.created_at DESC
    `;
    return { success: true, orders };
  } catch (e) {
    console.error("getAdminOrdersFn error:", e);
    return { success: false, error: "Failed to get orders", orders: [] };
  }
});

// Update order status (admin)
export const updateOrderStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: { orderId: string; status: string }) => data)
  .handler(async (ctx) => {
    const { orderId, status } = ctx.data;
    try {
      await db`
        UPDATE "Siparisler" SET status = ${status} WHERE id = ${orderId}
      `;
      return { success: true };
    } catch (e) {
      console.error("updateOrderStatusFn error:", e);
      return { success: false, error: "Failed to update order status" };
    }
  });

// Approve vendor bond (admin)
export const approveVendorBondFn = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string }) => data)
  .handler(async (ctx) => {
    const { userId } = ctx.data;
    try {
      await db`
        UPDATE "Kullanicilar" SET vendor_bond_paid = true WHERE id = ${userId}
      `;
      return { success: true };
    } catch (e) {
      console.error("approveVendorBondFn error:", e);
      return { success: false, error: "Failed to approve vendor bond" };
    }
  });

// Create audit log entry (admin)
export const createAuditLogFn = createServerFn({ method: "POST" })
  .inputValidator((data: { action: string; target_type?: string; metadata?: any }) => data)
  .handler(async (ctx) => {
    const { action, target_type, metadata } = ctx.data;
    try {
      const id = `audit-${crypto.randomBytes(8).toString("hex")}`;
      await db`
        INSERT INTO audit_logs (id, action, target_type, metadata, created_at)
        VALUES (${id}, ${action}, ${target_type || null}, ${JSON.stringify(metadata || {})}, NOW())
      `;
      return { success: true, id };
    } catch (e) {
      console.error("createAuditLogFn error:", e);
      return { success: false, error: "Failed to create audit log" };
    }
  });

// Get dashboard data (orders, disputes, recent activity)
export const getAdminDashboardDataFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    // Recent orders
    const recentOrders = await db`
      SELECT id, buyer_id, vendor_id, amount, status, created_at
      FROM "Siparisler"
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Pending vendor bonds
    const pendingBonds = await db`
      SELECT id, identifier, display_name, created_at
      FROM "Kullanicilar"
      WHERE role = 'vendor' AND vendor_bond_paid = false
      ORDER BY created_at ASC
    `;

    // Recent transactions
    const recentTransactions = await db`
      SELECT id, user_id, amount, currency, type, status, created_at
      FROM "Islemler"
      ORDER BY created_at DESC
      LIMIT 20
    `;

    return { success: true, recentOrders, pendingBonds, recentTransactions };
  } catch (e) {
    console.error("getAdminDashboardDataFn error:", e);
    return { success: false, error: "Failed to get dashboard data", recentOrders: [], pendingBonds: [], recentTransactions: [] };
  }
});
