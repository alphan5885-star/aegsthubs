## Plan

### 1. BlockCypher Token Kurulumu
- `BLOCKCYPHER_TOKEN` secret olarak eklenir (`be7108df52714399be6716f85ae7edb1`).
- `create-deposit-address` ve `cron-sync-deposits` edge function'ları zaten bu token'ı bekliyor — ek kod değişikliği yok, sadece secret eklemek yeterli.

### 2. Otomatik LTC Sync (pg_cron)
- `pg_cron` + `pg_net` extension'ları aktifleştirilir.
- Her 5 dakikada bir `cron-sync-deposits` edge function'ı tetiklenir:
  - Tüm aktif kullanıcı LTC adreslerini tarar
  - 3+ konfirmasyonlu işlemleri `credit_confirmed_deposit` ile bakiyeye yazar
  - Sipariş ödemelerini `confirm_order_payment_by_tx` ile eşleştirir → escrow + admin %5 + satıcı dağıtımı otomatik

### 3. Monero (XMR) Devre Dışı
BlockCypher Monero'yu desteklemiyor, yanıltıcı olmasın diye UI'dan gizlenir:
- `Wallet.tsx`: XMR yatırma/çekme tab'ı kaldırılır (sadece LTC kalır)
- `VendorWallet.tsx`: XMR çekim seçeneği kaldırılır
- `Market.tsx` ticker'ında "XMR / LTC" yazısı sadeleştirilir
- DB'deki `vendor_withdraw_xmr` / `user_withdraw_xmr` RPC'leri silinmez (gelecekte XMR node eklenirse hazır kalır), sadece UI'dan erişim kapatılır

### 4. Market Sayfası Temizliği
`src/pages/Market.tsx` (line 237-244): üst satırdaki **"LTC/USD $84.xx +2.4%"** kartı tamamen kaldırılır. Yerine geriye kalan iki kart (En Popüler Kategori, Güvenlik) `md:grid-cols-2`'ye düşürülür. Sahte/sabit fiyat verisi sergilemekten kurtuluruz.

### 5. Test Rehberi (uygulama sonrası)
1. `/wallet` → "LTC Adresi Oluştur" → kişisel adres üretilir
2. O adrese küçük miktar LTC gönder (mainnet)
3. ~5–15 dk sonra (3 konfirmasyon + cron tick) bakiye otomatik artar, bildirim gelir
4. Market'tan ürün al → ödeme adresine LTC gönder → sipariş otomatik `paid` → escrow tutulur → satıcıya kazanç dağılır

### Etkilenen dosyalar
- Yeni secret: `BLOCKCYPHER_TOKEN`
- DB migration: `pg_cron` + `pg_net` enable + 5 dk'lık `cron-sync-deposits` job
- `src/pages/Market.tsx` — LTC/USD kartı silinir, ticker sadeleşir
- `src/pages/Wallet.tsx` — XMR sekmesi kaldırılır
- `src/pages/VendorWallet.tsx` — XMR çekim seçeneği kaldırılır

### Bitcart Notu
Bitcart entegrasyonu YAPILMAYACAK (ayrı VPS + full node + bakım yükü Tor pazaryeri için pratik değil). İleride Monero gerçekten şart olursa NowNodes API veya kendi `monero-wallet-rpc` node'u ile ayrı bir edge function eklenir — mevcut altyapı silinmez, üzerine eklenir.
