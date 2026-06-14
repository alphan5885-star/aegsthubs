import { createServerFn } from "@tanstack/react-start";
import db from "../server/db";
import crypto from "crypto";

export interface Product {
  id: string;
  vendor_id: string;
  name: string;
  title: string;
  description?: string | null;
  price: number;
  currency: "BTC" | "LTC" | "XMR";
  type: "digital" | "physical";
  stock: number;
  image_emoji?: string | null;
  image_url?: string | null;
  category?: string | null;
  subcategory?: string | null;
  subsubcategory?: string | null;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

// Get all active products
export const getProductsFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const products = (await db
      .prepare('SELECT * FROM "Urunler" WHERE is_active = true ORDER BY created_at DESC')
      .all()) as Product[];

    return { success: true, products };
  } catch (e) {
    console.error("getProductsFn error:", e);
    return { success: false, error: "Failed to get products", products: [] };
  }
});

// Get product by ID
export const getProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async (ctx) => {
    const { id } = ctx.data;

    try {
      const product = (await db
        .prepare('SELECT * FROM "Urunler" WHERE id = ?')
        .get(id)) as Product | null;

      if (!product) {
        return { success: false, error: "Product not found", product: null };
      }

      return { success: true, product };
    } catch (e) {
      console.error("getProductFn error:", e);
      return { success: false, error: "Failed to get product", product: null };
    }
  });

// Add product
export const addProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: Omit<Product, "id" | "created_at">) => data)
  .handler(async (ctx) => {
    const data = ctx.data;

    try {
      const id = `product-${crypto.randomBytes(8).toString("hex")}`;
      await db
        .prepare(
          `INSERT INTO "Urunler" (id, vendor_id, name, title, description, price, currency, type, stock, image_emoji, image_url, category, subcategory, subsubcategory, commission_rate, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          data.vendor_id,
          data.name,
          data.title,
          data.description,
          data.price,
          data.currency,
          data.type,
          data.stock,
          data.image_emoji,
          data.image_url,
          data.category,
          data.subcategory,
          data.subsubcategory,
          data.commission_rate,
          data.is_active,
        );

      const product = (await db
        .prepare('SELECT * FROM "Urunler" WHERE id = ?')
        .get(id)) as Product;

      return { success: true, product };
    } catch (e) {
      console.error("addProductFn error:", e);
      return { success: false, error: "Failed to add product" };
    }
  });

// Edit product
export const editProductFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { id: string; updates: Partial<Omit<Product, "id" | "created_at">> }) => data,
  )
  .handler(async (ctx) => {
    const { id, updates } = ctx.data;

    try {
      // Build update query
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        setClauses.push(`"${key}" = $${paramIndex++}`);
        values.push(value);
      });

      if (setClauses.length === 0) {
        const product = (await db
          .prepare('SELECT * FROM "Urunler" WHERE id = ?')
          .get(id)) as Product;
        return { success: true, product };
      }

      values.push(id);
      const query = `UPDATE "Urunler" SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`;

      await db.prepare(query.replace(/\$\d+/g, "?")).run(...values);

      const product = (await db
        .prepare('SELECT * FROM "Urunler" WHERE id = ?')
        .get(id)) as Product;

      return { success: true, product };
    } catch (e) {
      console.error("editProductFn error:", e);
      return { success: false, error: "Failed to edit product" };
    }
  });

// Delete product
export const deleteProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async (ctx) => {
    const { id } = ctx.data;

    try {
      await db.prepare('DELETE FROM "Urunler" WHERE id = ?').run(id);
      return { success: true };
    } catch (e) {
      console.error("deleteProductFn error:", e);
      return { success: false, error: "Failed to delete product" };
    }
  });

// Get all products (admin)
export const getAdminProductsFn = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const products = (await db
      .prepare('SELECT * FROM "Urunler" ORDER BY created_at DESC')
      .all()) as Product[];

    return { success: true, products };
  } catch (e) {
    console.error("getAdminProductsFn error:", e);
    return { success: false, error: "Failed to get products", products: [] };
  }
});
