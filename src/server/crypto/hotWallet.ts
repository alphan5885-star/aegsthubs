import * as bitcoin from "bitcoinjs-lib";
import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";
import crypto from "crypto";
import https from "https";
import { LITECOIN_NETWORK, BITCOIN_NETWORK } from "./wallet";

const bip32 = BIP32Factory(ecc);

// Environment variables
const WALLET_ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;
const BTC_XPRV = process.env.BTC_XPRV;
const LTC_XPRV = process.env.LTC_XPRV;

// AES-256-GCM encryption/decryption
function encrypt(data: string): string {
  if (!WALLET_ENCRYPTION_KEY) throw new Error("WALLET_ENCRYPTION_KEY not set");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(WALLET_ENCRYPTION_KEY, "hex"),
    iv
  );
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted}:${authTag.toString("hex")}`;
}

function decrypt(encryptedData: string): string {
  if (!WALLET_ENCRYPTION_KEY) throw new Error("WALLET_ENCRYPTION_KEY not set");
  const [ivHex, encryptedHex, authTagHex] = encryptedData.split(":");
  if (!ivHex || !encryptedHex || !authTagHex) throw new Error("Invalid encrypted data format");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(WALLET_ENCRYPTION_KEY, "hex"),
    iv
  );
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Secure memory wipe
function wipeBuffer(buffer: Buffer): void {
  for (let i = 0; i < buffer.length; i++) buffer[i] = 0;
}

// Fetch UTXOs from mempool.space
async function fetchUTXOs(
  address: string,
  cryptoType: "BTC" | "LTC"
): Promise<Array<{ txid: string; vout: number; value: number; status: any }>> {
  const baseUrl = cryptoType === "BTC" ? "https://mempool.space/api" : "https://litecoinspace.org/api";
  const url = `${baseUrl}/address/${address}/utxo`;

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Failed to fetch UTXOs: ${res.statusCode}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Broadcast raw transaction
async function broadcastRawTx(
  rawTx: string,
  cryptoType: "BTC" | "LTC"
): Promise<string> {
  const baseUrl = cryptoType === "BTC" ? "https://mempool.space/api" : "https://litecoinspace.org/api";
  const url = `${baseUrl}/tx`;

  const postData = rawTx;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Failed to broadcast tx: ${res.statusCode} - ${data}`));
        }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

// Get change address from xprv
function getChangeAddress(xprv: string, cryptoType: "BTC" | "LTC"): string {
  const network = cryptoType === "BTC" ? BITCOIN_NETWORK : LITECOIN_NETWORK;
  const node = bip32.fromBase58(xprv, network);
  const child = node.derive(0).derive(0);
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: child.publicKey,
    network,
  });
  if (!address) throw new Error("Failed to generate change address");
  return address;
}

// Broadcast BTC transaction
export async function broadcastBtcTx(toAddress: string, amountSatoshis: number): Promise<string> {
  if (!BTC_XPRV) throw new Error("BTC_XPRV not set");

  const network = BITCOIN_NETWORK;
  let xprvBuffer: Buffer | null = null;

  try {
    xprvBuffer = Buffer.from(decrypt(BTC_XPRV), "utf8");
    const xprv = xprvBuffer.toString();
    const node = bip32.fromBase58(xprv, network);
    const changeAddress = getChangeAddress(xprv, "BTC");

    // TODO: In production, use a proper UTXO selection algorithm
    const utxos = await fetchUTXOs(changeAddress, "BTC");
    if (utxos.length === 0) throw new Error("No UTXOs available");

    let totalInput = 0;
    const inputs: Array<{ txid: string; vout: number }> = [];
    for (const utxo of utxos) {
      inputs.push({ txid: utxo.txid, vout: utxo.vout });
      totalInput += utxo.value;
      if (totalInput >= amountSatoshis + 1000) break; // Estimated fee
    }

    if (totalInput < amountSatoshis + 1000) throw new Error("Insufficient funds");

    const psbt = new bitcoin.Psbt({ network });
    for (let i = 0; i < inputs.length; i++) {
      const utxo = utxos[i];
      const child = node.derive(0).derive(0);
      const { output } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network,
      });
      if (!output) throw new Error("Failed to create scriptPubKey");
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: { script: output, value: BigInt(utxo.value) },
      });
      psbt.signInput(i, child);
    }

    psbt.addOutput({ address: toAddress, value: BigInt(amountSatoshis) });
    const change = totalInput - amountSatoshis - 1000;
    if (change > 0) {
      psbt.addOutput({ address: changeAddress, value: BigInt(change) });
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const txid = await broadcastRawTx(tx.toHex(), "BTC");
    return txid;
  } finally {
    if (xprvBuffer) wipeBuffer(xprvBuffer);
  }
}

// Broadcast LTC transaction
export async function broadcastLtcTx(toAddress: string, amountLitoshis: number): Promise<string> {
  if (!LTC_XPRV) throw new Error("LTC_XPRV not set");

  const network = LITECOIN_NETWORK;
  let xprvBuffer: Buffer | null = null;

  try {
    xprvBuffer = Buffer.from(decrypt(LTC_XPRV), "utf8");
    const xprv = xprvBuffer.toString();
    const node = bip32.fromBase58(xprv, network);
    const changeAddress = getChangeAddress(xprv, "LTC");

    const utxos = await fetchUTXOs(changeAddress, "LTC");
    if (utxos.length === 0) throw new Error("No UTXOs available");

    let totalInput = 0;
    const inputs: Array<{ txid: string; vout: number }> = [];
    for (const utxo of utxos) {
      inputs.push({ txid: utxo.txid, vout: utxo.vout });
      totalInput += utxo.value;
      if (totalInput >= amountLitoshis + 1000) break;
    }

    if (totalInput < amountLitoshis + 1000) throw new Error("Insufficient funds");

    const psbt = new bitcoin.Psbt({ network });
    for (let i = 0; i < inputs.length; i++) {
      const utxo = utxos[i];
      const child = node.derive(0).derive(0);
      const { output } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network,
      });
      if (!output) throw new Error("Failed to create scriptPubKey");
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: { script: output, value: BigInt(utxo.value) },
      });
      psbt.signInput(i, child);
    }

    psbt.addOutput({ address: toAddress, value: BigInt(amountLitoshis) });
    const change = totalInput - amountLitoshis - 1000;
    if (change > 0) {
      psbt.addOutput({ address: changeAddress, value: BigInt(change) });
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    const txid = await broadcastRawTx(tx.toHex(), "LTC");
    return txid;
  } finally {
    if (xprvBuffer) wipeBuffer(xprvBuffer);
  }
}

// Address validation
export function validateAddress(address: string, cryptoType: "BTC" | "LTC"): boolean {
  const network = cryptoType === "BTC" ? BITCOIN_NETWORK : LITECOIN_NETWORK;
  try {
    bitcoin.address.toOutputScript(address, network);
    return true;
  } catch {
    return false;
  }
}
