# GERÇEKÇİ TEST REHBERİ

---

## 🚀 Geliştirme Ortamını Başlat

```bash
npm run dev
```
Tarayıcınızda `http://localhost:5173` adresine gidin.

---

## 1. Testnet Kullanımı (Önerilen!)

### Bitcoin Testnet
- **Network**: Bitcoin Testnet3
- **Faucet (Ücretsiz Test BTC Al)**:
  - https://coinfaucet.eu/en/btc-testnet/
  - https://testnet-faucet.com/btc-testnet/
- **Explorer**: https://blockstream.info/testnet/

### Litecoin Testnet
- **Network**: Litecoin Testnet
- **Faucet**: https://testnet.litecointools.com/
- **Explorer**: https://blockexplorer.one/litecoin/testnet

---

## 2. Test İçin Gerekli Environment Değişkenleri

`.env.local` dosyasını oluşturun ve doldurun:

```env
# Veritabanı Bağlantısı
DATABASE_URL=postgresql://... (local postgres veya test veritabanı)

# Güvenlik Anahtarı (Üretin: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
WALLET_ENCRYPTION_KEY=your_32_byte_hex_key_here

# Testnet XPRV (Kendi test cüzdanınızı oluşturun!)
# Nasıl oluşturulur?
# 1. Electrum cüzdanını indirin (Testnet modunda)
# 2. Yeni cüzdan oluşturun
# 3. Wallet > Private Keys > Show Master Private Key
BTC_XPRV=your_encrypted_testnet_btc_xprv_here
LTC_XPRV=your_encrypted_testnet_ltc_xprv_here

# Testnet XPUB (Yukarıdaki cüzdandan alın)
BTC_XPUB=your_testnet_btc_xpub_here
LTC_XPUB=your_testnet_ltc_xpub_here

# Çekim Limitleri (Test için yüksek ayarlayın)
MAX_DAILY_WITHDRAWAL_BTC=10
MAX_DAILY_WITHDRAWAL_LTC=1000
MAX_TX_WITHDRAWAL_BTC=1
MAX_TX_WITHDRAWAL_LTC=100

# Telegram (İsteğe bağlı, test için gerekli değil)
# TELEGRAM_BOT_TOKEN=...
# TELEGRAM_CHAT_ID=...
```

---

## 3. Adım Adım Test Senaryoları

### Test 1: Para Yatırma (Deposit)
1. Siteye giriş yapın
2. Cüzdan sayfasına gidin
3. BTC/LTC seçin
4. Çıkan adresi kopyalayın
5. Yukarıdaki faucetlardan test coinleri bu adrese gönderin
6. Tracker'ın (blockchain dinleyici) işlemi tespit etmesini bekleyin (1-2 dakika)
7. Bakiyenizin güncellendiğini kontrol edin

### Test 2: Para Çekme (Withdrawal)
1. Cüzdan sayfasına gidin
2. BTC/LTC seçin
3. Çekim yapmak istediğiniz testnet adresini girin
4. Miktarı girin
5. 6 haneli pin'i girin (şu an pin doğrulaması yok, test için herhangi 6 hane)
6. "ÇEKİM_İŞLEMİNİ_BAŞLAT" butonuna tıklayın
7. İşlemin başarılı olduğunu görün
8. Blockchain explorer'dan tx hash'ini kontrol edin

---

## 4. Test için Testnet Cüzdanı Oluşturma (Kolay Yöntem)

### Electrum ile (BTC ve LTC için)
1. **Electrum Bitcoin Wallet** indirin: https://electrum.org/
2. İlk çalıştırmada "Testnet" modunda çalıştırın (Tools > Network > Server > Testnet)
3. "Standard Wallet" seçin
4. "Create a new seed" seçin
5. Seed'i kaydedin!
6. Cüzdan oluşturulduktan sonra:
   - Wallet > Private Keys > Show Master Private Key → bu `BTC_XPRV`'nizdir
   - Wallet > Information → Master Public Key (MPK) bu da `BTC_XPUB`'nizdir

Litecoin için de benzer bir cüzdan kullanın (Electrum-LTC).

---

## 5. Database Testi

Eğer local postgres'iniz yoksa, kolayca bir test veritabanı oluşturabilirsiniz:

### Docker ile PostgreSQL (Kolay)
```bash
docker run -d \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=test \
  -p 5432:5432 \
  --name test-postgres \
  postgres:16
```

Ardından `.env.local`'a ekleyin:
```
DATABASE_URL=postgresql://test:test@localhost:5432/test
```

---

## 6. Debugging İpuçları

### Console Loglarını Kontrol Edin
- Tarayıcının geliştirici konsolunu açın (F12)
- Terminaldeki server loglarını izleyin

### Sağlık Kontrolü
```bash
npm run health:check
```

### Typecheck ve Lint
```bash
npm run typecheck
npm run lint
```

---

## 7. Üretimden Önce Son Kontroller

1. Tüm test senaryolarını tekrar çalıştırın
2. Security regression testini çalıştırın: `npm run security:regression`
3. Tüm lint ve typecheck hatalarının düzeltildiğinden emin olun
4. .env dosyasının üretimde doğru olduğundan emin olun
