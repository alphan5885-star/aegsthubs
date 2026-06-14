import * as bitcoin from "bitcoinjs-lib";
import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";
import { generateXmrAddress } from "./xmrWallet";

const bip32 = BIP32Factory(ecc);

export const LITECOIN_NETWORK = {
  messagePrefix: "\x19Litecoin Signed Message:\n",
  bech32: "tltc",
  bip32: {
    public: 0x0436f6e1,
    private: 0x0436ef7d,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};

export const BITCOIN_NETWORK = bitcoin.networks.testnet;

// Master XPUBs configured for the platform's cold wallets (TESTNET ONLY)
const BTC_XPUB =
  process.env.BTC_XPUB ||
  "tpubD6NzVbkrYhZ4Y4keqTV6xW67GkXhJd5L1JqkLd5H1Yd51M1K1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1"; // Dummy fallback testnet
const LTC_XPUB =
  process.env.LTC_XPUB ||
  "tpubD6NzVbkrYhZ4Y4keqTV6xW67GkXhJd5L1JqkLd5H1Yd51M1K1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E1E"; // Dummy fallback testnet

export function generateDepositAddress(
  userId: string,
  transactionId: string,
  cryptoType: "BTC" | "LTC" | "XMR",
): string {
  // Handle XMR separately
  if (cryptoType === "XMR") {
    return generateXmrAddress(userId, transactionId);
  }
  // Test için basit ama benzersiz adresler üretelim (XPUB yoksa)
  // Gerçek üretimde gerçek XPUB kullanın!
  const network = cryptoType === "BTC" ? BITCOIN_NETWORK : LITECOIN_NETWORK;
  
  // Basit bir test anahtarı (testnet için güvenli, üretimde ASLA KULLANMAYIN!)
  const testSeed = Buffer.from(
    "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    "hex"
  );
  
  try {
    // Benzersiz path için txId ve userId kullan
    const hash = Buffer.from(transactionId.replace(/-/g, ""), "hex");
    const index1 = hash.readUInt32BE(0) & 0x7fffffff;
    const index2 = hash.readUInt32BE(4) & 0x7fffffff;
    
    // Test için basit bir node oluştur (üretimde XPUB kullanın!)
    const node = bip32.fromSeed(testSeed, network);
    const child = node.derive(0).derive(0).derive(index1).derive(index2);
    
    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: network,
    });

    if (!address) {
      // Fallback adresleri (sadece test için)
      if (cryptoType === "BTC") {
        return "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7";
      } else {
        return "tltc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q7z85t0";
      }
    }

    return address;
  } catch (err) {
    console.error("HD Wallet generation error:", err);
    // Fallback adresleri
    if (cryptoType === "BTC") {
      return "tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7";
    } else if (cryptoType === "LTC") {
      return "tltc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q7z85t0";
    } else {
      return generateXmrAddress(userId, transactionId);
    }
  }
}
