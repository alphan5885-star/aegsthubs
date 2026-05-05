## Eksikleri Derleme Planı

Önceki turlarda XMR ve mirrors/.onion büyük oranda kaldırıldı ama kod tabanında hâlâ tutarsız kalıntılar var. Bunları temizleyeceğim.

### 1. PaymentTracker'ı LTC'ye sadeleştir
`src/components/PaymentTracker.tsx` — şu an "LTC/XMR Escrow", "XMR manuel doğrulama", `awaiting_manual_xmr` status, "veya eşdeğer XMR" notu gibi yerler var. Hepsini sadece **LTC** anlatacak şekilde günceller, `awaiting_manual_xmr` → `awaiting_payment` yaparım. Başlık: "LTC Escrow Bekleniyor".

### 2. Checkout / ProductDetail / Market — XMR çevirisi kaldır
- `src/pages/Checkout.tsx` (line 163, 179-181): `XMR` satırı ve `cart.inXmr` etiketi silinir.
- `src/pages/ProductDetail.tsx` (line 248, 289, 386): `(price * 0.62) XMR` ifadeleri ve "LTC/XMR" buton metni LTC'ye sadeleşir.
- `src/pages/Market.tsx` (line 420): aynı XMR satırı silinir.
- `src/components/QuickViewModal.tsx`: `priceXMR` hesabı ve XMR seçeneği kaldırılır.
- `src/pages/Login.tsx` (line 565): dekoratif `<span>XMR</span>` çıkarılır.

### 3. Sidebar para birimi seçici
`src/components/AppSidebar.tsx` line 370: `["LTC","XMR","USD"]` → `["LTC","USD"]`.

### 4. Customization context
`src/lib/customizationContext.tsx`: `preferredCurrency` tipinden `"XMR"` çıkar; mevcut storage'ta XMR varsa LTC'ye düşürülür.

### 5. AppSidebar — Mirrors menü öğesi
`src/components/AppSidebar.tsx` içinde halen `mirrors: "Mirrors"` label'ı translation key olarak referans var ama route silindi. Sidebar'da `to: "/mirrors"` linki varsa kaldırılır (önceden bahsedilmişti, doğrulayıp temizleyeceğim).

### 6. i18n temizliği
`src/lib/i18n.tsx`:
- TR/EN/RU üç dilde de `mirrors.*` anahtarları (title/empty/url/.onion vb.) ve `dashboard...mirrors:` etiketi silinir.
- `cart.inXmr` anahtarları silinir.
- `wallet.desc` metinlerinde "LTC/XMR" → "LTC".

### 7. UpdatesModal changelog
`src/components/UpdatesModal.tsx`: "LTC and XMR support…" satırı LTC-only olarak güncellenir; ayrıca clearweb geçişi için yeni bir 3.0.0 changelog girdisi eklenir ("Clearweb access, anonymous mode") — son değişiklikleri kullanıcıya görünür kılmak için.

### 8. securityContext .onion kontrolü
`src/lib/securityContext.tsx`: `.onion` host kontrolü kalır (gelecekte Tor'a taşıma planı sürdüğü için faydalı), dokunulmaz. Sadece bilgi.

### Etkilenen dosyalar
- `src/components/PaymentTracker.tsx`
- `src/pages/Checkout.tsx`, `src/pages/ProductDetail.tsx`, `src/pages/Market.tsx`, `src/pages/Login.tsx`
- `src/components/QuickViewModal.tsx`, `src/components/AppSidebar.tsx`, `src/components/UpdatesModal.tsx`
- `src/lib/customizationContext.tsx`, `src/lib/i18n.tsx`

DB / edge functions / migrations'a dokunulmayacak — ödeme altyapısı (BlockCypher LTC + cron sync) zaten çalışıyor.