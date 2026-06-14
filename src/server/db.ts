// PostgreSQL veritabanı bağlantısı
import postgres from "postgres";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Load environment variables
const envPath = path.resolve(".env");
const envLocalPath = path.resolve(".env.local");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

function hashAccessCode(code: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(code, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// PostgreSQL bağlantısını başlat
const sql = postgres(DATABASE_URL, {
  max: 20,
  idle_timeout: 30,
});

// Şemayı Kur (Kapsamlı ve Türkçe + İngilizce)
const setupSchema = async () => {
  try {
    // İlk olarak, çakışan foreign key'leri ve tabloları temizle (güvenli, IF EXISTS)
    await sql`DROP TABLE IF EXISTS "vendor_bonds" CASCADE`;
    await sql`DROP TABLE IF EXISTS "user_roles" CASCADE`;
    await sql`DROP TABLE IF EXISTS "user_deposit_addresses" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Orders" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Products" CASCADE`;
    await sql`DROP TABLE IF EXISTS "Users" CASCADE`;

    // 1. Kullanicilar (Users) Tablosu (Türkçe)
    await sql`
      CREATE TABLE IF NOT EXISTS "Kullanicilar" (
        id TEXT PRIMARY KEY,
        identifier TEXT UNIQUE NOT NULL,
        access_code_hash TEXT NOT NULL,
        balance_ltc NUMERIC DEFAULT 0,
        balance_btc NUMERIC DEFAULT 0,
        balance_xmr NUMERIC DEFAULT 0,
        role TEXT DEFAULT 'user',
        pgp_key TEXT,
        display_name TEXT,
        vendor_rating NUMERIC DEFAULT 0,
        vendor_bond_paid BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Users Tablosu (İngilizce - alternatif)
    await sql`
      CREATE TABLE IF NOT EXISTS "Users" (
        id TEXT PRIMARY KEY,
        identifier TEXT UNIQUE NOT NULL,
        access_code_hash TEXT NOT NULL,
        balance_ltc NUMERIC DEFAULT 0,
        balance_btc NUMERIC DEFAULT 0,
        balance_xmr NUMERIC DEFAULT 0,
        role TEXT DEFAULT 'user',
        pgp_key TEXT,
        display_name TEXT,
        vendor_rating NUMERIC DEFAULT 0,
        vendor_bond_paid BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 2. Urunler (Products) Tablosu (Türkçe)
    await sql`
      CREATE TABLE IF NOT EXISTS "Urunler" (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT, -- Ürün kategorisi
        price NUMERIC NOT NULL,
        stock INTEGER DEFAULT 0,
        status TEXT DEFAULT 'available', -- available, hidden, out_of_stock
        image_url TEXT,
        delivery_data TEXT, -- Otomatik teslimat verisi
        origin TEXT, -- Gönderim yeri
        destination TEXT, -- Gönderim hedefi
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vendor_id) REFERENCES "Kullanicilar"(id)
      );
    `;

    // Products Tablosu (İngilizce - alternatif)
    await sql`
      CREATE TABLE IF NOT EXISTS "Products" (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price NUMERIC NOT NULL,
        stock INTEGER DEFAULT 0,
        status TEXT DEFAULT 'available',
        image_url TEXT,
        delivery_data TEXT,
        origin TEXT,
        destination TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vendor_id) REFERENCES "Users"(id)
      );
    `;

    // 3. Siparisler (Orders) Tablosu (Türkçe)
    await sql`
      CREATE TABLE IF NOT EXISTS "Siparisler" (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        vendor_id TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        service_fee NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'pending', -- pending, paid, shipped, delivered, disputed, completed, canceled
        shipping_address TEXT, -- Fiziksel veya PGP şifreli adres
        payment_address TEXT, -- Ödeme yapılacak kripto adresi
        txid TEXT, -- Ödeme kanıtı işlem ID'si
        tracking_number TEXT, -- Kargo takip veya dead-drop koordinatları
        delivery_method TEXT, -- physical, digital, dead_drop
        commission NUMERIC DEFAULT 0, -- Kesilen komisyon
        vendor_earning NUMERIC DEFAULT 0, -- Satıcıya geçecek tutar
        total_amount NUMERIC DEFAULT 0, -- Toplam tutar
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES "Urunler"(id),
        FOREIGN KEY(buyer_id) REFERENCES "Kullanicilar"(id),
        FOREIGN KEY(vendor_id) REFERENCES "Kullanicilar"(id)
      );
    `;

    // Orders Tablosu (İngilizce - alternatif)
    await sql`
      CREATE TABLE IF NOT EXISTS "Orders" (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        vendor_id TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        service_fee NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'pending',
        shipping_address TEXT,
        payment_address TEXT,
        txid TEXT,
        tracking_number TEXT,
        delivery_method TEXT,
        commission NUMERIC DEFAULT 0,
        vendor_earning NUMERIC DEFAULT 0,
        total_amount NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES "Products"(id),
        FOREIGN KEY(buyer_id) REFERENCES "Users"(id),
        FOREIGN KEY(vendor_id) REFERENCES "Users"(id)
      );
    `;

    // 4. Mesajlar (Messages) Tablosu (Türkçe)
    await sql`
      CREATE TABLE IF NOT EXISTS "Mesajlar" (
        id TEXT PRIMARY KEY,
        context_type TEXT NOT NULL, -- 'order', 'dispute', 'direct'
        context_id TEXT NOT NULL, -- İlgili Sipariş veya İtiraz ID'si
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        is_encrypted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES "Kullanicilar"(id)
      );
    `;

    // 5. Islemler (Transactions) Tablosu (Türkçe)
    await sql`
      CREATE TABLE IF NOT EXISTS "Islemler" (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL, -- 'BTC', 'LTC', vb.
        type TEXT NOT NULL, -- 'deposit', 'withdraw', 'escrow_hold', 'escrow_release', 'fee'
        status TEXT DEFAULT 'pending', -- pending, completed, failed
        tx_hash TEXT, -- Kripto ağındaki TX kodu
        temp_wallet_address TEXT, -- Yükleme yapılacak geçici adres
        escrow_state TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES "Kullanicilar"(id)
      );
    `;

    // 6. Itirazlar (Disputes) Tablosu (Türkçe)
    await sql`
      CREATE TABLE IF NOT EXISTS "Itirazlar" (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        vendor_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'open', -- open, resolved_buyer, resolved_vendor, canceled
        resolution TEXT, -- Admin'in karar notu
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(order_id) REFERENCES "Siparisler"(id),
        FOREIGN KEY(buyer_id) REFERENCES "Kullanicilar"(id),
        FOREIGN KEY(vendor_id) REFERENCES "Kullanicilar"(id)
      );
    `;

    // 7. Vendor Bonds Tablosu (İngilizce)
    await sql`
      CREATE TABLE IF NOT EXISTS "vendor_bonds" (
        id SERIAL PRIMARY KEY,
        vendor_id TEXT UNIQUE NOT NULL,
        amount NUMERIC DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vendor_id) REFERENCES "Kullanicilar"(id)
      );
    `;

    // 8. User Roles Tablosu (İngilizce)
    await sql`
      CREATE TABLE IF NOT EXISTS "user_roles" (
        id SERIAL PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES "Kullanicilar"(id)
      );
    `;

    // 9. User Deposit Addresses Tablosu (İngilizce)
    await sql`
      CREATE TABLE IF NOT EXISTS "user_deposit_addresses" (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        network TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // 10. Ürünler (Products) Tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS "Urunler" (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        price NUMERIC NOT NULL,
        currency TEXT NOT NULL DEFAULT 'LTC', -- BTC, LTC, XMR
        type TEXT NOT NULL DEFAULT 'digital', -- digital, physical
        stock INTEGER NOT NULL DEFAULT 0,
        image_emoji TEXT,
        image_url TEXT,
        category TEXT,
        subcategory TEXT,
        subsubcategory TEXT,
        commission_rate NUMERIC DEFAULT 5,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(vendor_id) REFERENCES "Kullanicilar"(id)
      );
    `;

    // 11. Siparişler (Orders) Tablosu
    await sql`
      CREATE TABLE IF NOT EXISTS "Siparisler" (
        id TEXT PRIMARY KEY,
        buyer_id TEXT NOT NULL,
        vendor_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        currency TEXT NOT NULL DEFAULT 'LTC',
        status TEXT DEFAULT 'pending', -- pending, processing, completed, cancelled
        delivery_method TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(buyer_id) REFERENCES "Kullanicilar"(id),
        FOREIGN KEY(vendor_id) REFERENCES "Kullanicilar"(id),
        FOREIGN KEY(product_id) REFERENCES "Urunler"(id)
      );
    `;

    // 12. Platform Defteri (PlatformLedger) - Komisyon gelirleri için
    await sql`
      CREATE TABLE IF NOT EXISTS "PlatformLedger" (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total_fees_btc NUMERIC DEFAULT 0,
        total_fees_ltc NUMERIC DEFAULT 0,
        total_fees_xmr NUMERIC DEFAULT 0
      );
    `;

    // 13. Admin Audit Logs - Admin işlemleri için denetim kaydı
    await sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        target_type TEXT,
        metadata JSONB DEFAULT '{}',
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES "Kullanicilar"(id) ON DELETE SET NULL
      );
    `;

    // Varsayılan defteri oluştur
    await sql`
      INSERT INTO "PlatformLedger" (id, total_fees_btc, total_fees_ltc, total_fees_xmr)
      VALUES (1, 0, 0, 0)
      ON CONFLICT (id) DO NOTHING;
    `;

    // Varsayılan Admin Hesabı Oluştur (Eğer yoksa)
    const adminId = "admin-001";
    const adminIdentifier = "admin@local.aeigsthub";
    const adminPassword = "admin1234"; // Test ortamı için basit şifre
    const hashedPassword = hashAccessCode(adminPassword);
    
    await sql`
      INSERT INTO "Kullanicilar" (id, identifier, access_code_hash, role, balance_btc, balance_ltc, balance_xmr, display_name, vendor_bond_paid)
      VALUES (
        ${adminId}, 
        ${adminIdentifier}, 
        ${hashedPassword}, 
        'admin', 
        10.0,  -- Test için BTC bakiyesi
        1000.0, -- Test için LTC bakiyesi
        500.0, -- Test için XMR bakiyesi
        'System Admin',
        true
      )
      ON CONFLICT (identifier) DO NOTHING;
    `;

    // Test Satıcı Hesabı Oluştur
    const vendorId = "vendor-001";
    const vendorIdentifier = "vendor@local.aeigsthub";
    const vendorPassword = "vendor1234";
    const hashedVendorPassword = hashAccessCode(vendorPassword);

    await sql`
      INSERT INTO "Kullanicilar" (id, identifier, access_code_hash, role, balance_btc, balance_ltc, balance_xmr, display_name, vendor_bond_paid)
      VALUES (
        ${vendorId}, 
        ${vendorIdentifier}, 
        ${hashedVendorPassword}, 
        'vendor', 
        5.0, 
        500.0, 
        250.0,
        'Test Satıcı',
        true
      )
      ON CONFLICT (identifier) DO NOTHING;
    `;

    // Test Ürünleri Ekle
    const testProducts = [
      { id: "product-001", vendorId: vendorId, name: "Premium VPN Hesabı (1 Yıl)", title: "Premium VPN Hesabı (1 Yıl)", description: "Dünya çapında 100+ sunucu, sınırsız bant genişliği", price: 0.05, currency: "BTC", type: "digital", stock: 50, category: "Dijital Ürünler", subcategory: "VPN", subsubcategory: "Premium", imageEmoji: "🔒" },
      { id: "product-002", vendorId: vendorId, name: "Steam Hediye Kartı 50€", title: "Steam Hediye Kartı 50€", description: "Anında teslimat, garantili", price: 1.5, currency: "LTC", type: "digital", stock: 20, category: "Dijital Ürünler", subcategory: "Hediye Kartları", subsubcategory: "Steam", imageEmoji: "🎮" },
      { id: "product-003", vendorId: vendorId, name: "Monero Hesabı (Donanımlı)", title: "Monero Hesabı (Donanımlı)", description: "Tam güvenlikli, XMR bakiyesi ile", price: 10.0, currency: "XMR", type: "digital", stock: 10, category: "Kripto Para", subcategory: "Hesaplar", subsubcategory: "Monero", imageEmoji: "💰" },
      { id: "product-004", vendorId: vendorId, name: "Dijital Kitap Paketi", title: "Dijital Kitap Paketi", description: "1000+ kripto ve güvenlik kitabı", price: 0.001, currency: "BTC", type: "digital", stock: 1000, category: "Dijital Ürünler", subcategory: "Kitaplar", subsubcategory: "E-Kitap", imageEmoji: "📚" }
    ];

    for (const product of testProducts) {
      await sql`
        INSERT INTO "Urunler" (id, vendor_id, name, title, description, price, currency, type, stock, category, subcategory, subsubcategory, image_emoji, is_active)
        VALUES (
          ${product.id},
          ${product.vendorId},
          ${product.name},
          ${product.title},
          ${product.description},
          ${product.price},
          ${product.currency},
          ${product.type},
          ${product.stock},
          ${product.category},
          ${product.subcategory},
          ${product.subsubcategory},
          ${product.imageEmoji},
          true
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    console.log("[PostgreSQL] Şema başarıyla oluşturuldu (Türkçe + İngilizce)");
    console.log("✓ Admin Hesabı Hazır!");
    console.log("  Kullanıcı Adı: admin@local.aeigsthub");
    console.log("  Şifre: admin1234");
    console.log("✓ Test Satıcı Hesabı Hazır!");
    console.log("  Kullanıcı Adı: vendor@local.aeigsthub");
    console.log("  Şifre: vendor1234");
  } catch (e: any) {
    if (e.message && !e.message.includes("already exists")) {
      console.error("[PostgreSQL] Şema kurulum hatası:", e.message);
    }
  }
};

// Modül yüklendiğinde şemayı başlat
setupSchema().catch(console.error);

// SQLite'ın `?` placeholder'larını PostgreSQL'in `$1, $2, ...` formatına dönüştür
function convertPlaceholders(query: string): string {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

// Mevcut kodlarla uyumluluk için db benzeri bir arayüz aktarımı
const db = {
  prepare: (query: string) => {
    const pgQuery = convertPlaceholders(query);
    return {
      get: async (...params: any[]) => {
        const result = await sql.unsafe(pgQuery, params);
        return Array.isArray(result) ? result[0] || null : result;
      },
      run: async (...params: any[]) => {
        await sql.unsafe(pgQuery, params);
        return { changes: 1, lastInsertRowid: null };
      },
      all: async (...params: any[]) => {
        const result = await sql.unsafe(pgQuery, params);
        return Array.isArray(result) ? result : [];
      },
    };
  },
  exec: async (query: string) => {
    try {
      await sql.unsafe(query);
    } catch (e) {
      console.error("[PostgreSQL] Exec hatası:", e);
    }
  },
};

export default db;
