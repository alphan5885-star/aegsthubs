# Monero (XMR) Kurulum Kılavuzu

Bu kılavuz, Monero testnet entegrasyonunu tamamen çalışır hale getirmek için adımları içerir.

## Gereksinimler

1. **Monero CLI Wallet** veya **Monero Daemon** (monerod)
2. **Monero Wallet RPC** sunucusu
3. Testnet XMR (ücretsiz olarak testnet faucetlardan alınabilir)

## Adım 1: Monero Yazılımını İndirin

Resmi Monero web sitesinden en son sürümü indirin:
https://www.getmonero.org/downloads/

## Adım 2: Testnet Cüzdanı Oluşturun

1. Monero CLI'yi çalıştırın:
   ```bash
   ./monero-wallet-cli --testnet
   ```

2. Yeni bir cüzdan oluşturun ve şifrenizi belirleyin.

3. Testnet XMR alın:
   - Testnet faucet: https://testnet.xmrchain.net/faucet
   - Veya başka testnet faucetları kullanın.

## Adım 3: Monero Wallet RPC'yi Başlatın

Cüzdan RPC sunucusunu testnet modunda başlatın:

```bash
./monero-wallet-rpc \
  --testnet \
  --wallet-file YOUR_TESTNET_WALLET \
  --password "YOUR_WALLET_PASSWORD" \
  --rpc-bind-port 18082 \
  --rpc-bind-ip 127.0.0.1 \
  --disable-rpc-login
```

Parametreler:
- `--testnet`: Testnet ağını kullanır
- `--wallet-file`: Cüzdan dosyanızın yolu
- `--password`: Cüzdan şifreniz
- `--rpc-bind-port`: RPC portu (varsayılan: 18082)
- `--disable-rpc-login`: Güvenlik için üretimde kullanmayın!

## Adım 4: Çevre Değişkenlerini Ayarlayın

Projenizin kök dizinindeki `.env` dosyasına şunları ekleyin:

```env
# Monero Wallet RPC Ayarları
XMR_WALLET_RPC=http://127.0.0.1:18082
XMR_NETWORK=testnet
```

## Adım 5: Gerçek XMR Entegrasyonunu Aktifleştirin

`src/server/crypto/xmrWallet.ts` dosyasındaki `broadcastXmrTx` fonksiyonundaki yorum satırlarını kaldırın ve gerçek RPC çağrılarını kullanın.

## Test Aşamaları

1. **Depozito Testi**:
   - Platformda bir XMR depozito adresi oluşturun
   - Testnet XMR gönderin
   - İşlemi doğrulayın

2. **Çekme Testi**:
   - Platformunuzdan başka bir testnet adresine XMR çekin
   - İşlemin başarılı olduğunu doğrulayın

## Faydalı Bağlantılar

- Monero Belgeleri: https://www.getmonero.org/resources/developer-guides/
- Monero Testnet Explorer: https://testnet.xmrchain.net/
- Monero Wallet RPC Referansı: https://www.getmonero.org/resources/developer-guides/wallet-rpc.html
