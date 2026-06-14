import db from "./db";
import { createServerFn } from "@tanstack/react-start";

export const getProductsFn = createServerFn({ method: "GET" })
  .inputValidator(
    (data?: { searchQuery?: string; category?: string; vendorId?: string }) =>
      data || {},
  )
  .handler(async (ctx) => {
    const { searchQuery, category, vendorId } = ctx.data;

    let query =
      'SELECT "Urunler".*, "Kullanicilar".display_name as vendor_name, "Kullanicilar".vendor_rating FROM "Urunler" LEFT JOIN "Kullanicilar" ON "Urunler".vendor_id = "Kullanicilar".id WHERE "Urunler".status = \'available\'';
    const params: any[] = [];

    if (searchQuery) {
      query +=
        ' AND ("Urunler".title ILIKE ? OR "Urunler".description ILIKE ?)';
      params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }

    if (category && category !== "All") {
      query += ' AND "Urunler".category = ?';
      params.push(category);
    }

    if (vendorId) {
      query += ' AND "Urunler".vendor_id = ?';
      params.push(vendorId);
    }

    query += ' ORDER BY "Urunler".created_at DESC';

    const products = (await db.prepare(query).all(...params)) as any[];
    return products;
  });

export const getProductByIdFn = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .handler(async (ctx) => {
    const { id } = ctx.data;
    const product = (await db
      .prepare(
        'SELECT "Urunler".*, "Kullanicilar".display_name as vendor_name, "Kullanicilar".vendor_rating FROM "Urunler" LEFT JOIN "Kullanicilar" ON "Urunler".vendor_id = "Kullanicilar".id WHERE "Urunler".id = ?',
      )
      .get(id)) as any;

    if (!product) throw new Error("Product not found");
    return product;
  });

export const createProductFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      vendorId: string;
      title: string;
      description: string;
      category: string;
      price: number;
      stock: number;
      imageUrl?: string;
      origin?: string;
      destination?: string;
    }) => data,
  )
  .handler(async (ctx) => {
    const {
      vendorId,
      title,
      description,
      category,
      price,
      stock,
      imageUrl,
      origin,
      destination,
    } = ctx.data;

    // Optional: Check if user is actually a vendor
    const user = (await db
      .prepare('SELECT role FROM "Kullanicilar" WHERE id = ?')
      .get(vendorId)) as any;
    if (!user || user.role !== "vendor") {
      throw new Error("Unauthorized: Only vendors can create products");
    }

    const id = crypto.randomUUID();

    await db
      .prepare(
        `
      INSERT INTO "Urunler" (id, vendor_id, title, description, category, price, stock, image_url, origin, destination)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        id,
        vendorId,
        title,
        description,
        category,
        price,
        stock,
        imageUrl || null,
        origin || "Worldwide",
        destination || "Worldwide",
      );

    return { success: true, productId: id };
  });
