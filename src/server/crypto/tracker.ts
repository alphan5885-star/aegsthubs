import db from "../db";
import https from "https";

// Autonomous Blockchain Tracker
// Queries public non-authenticated REST APIs to detect incoming deposits
const BTC_API_URL = "https://mempool.space/api";
const LTC_API_URL = "https://litecoinspace.org/api";

function fetchAddressData(
  address: string,
  cryptoType: "BTC" | "LTC",
): Promise<any> {
  const baseUrl = cryptoType === "BTC" ? BTC_API_URL : LTC_API_URL;
  const url = `${baseUrl}/address/${address}`;

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              resolve(null); // Ignore 404s or rate limits gracefully
            }
          } catch (e) {
            resolve(null);
          }
        });
      })
      .on("error", (err) => {
        console.error(
          `Tracker error for ${cryptoType} address ${address}:`,
          err.message,
        );
        resolve(null);
      });
  });
}

export async function scanPendingTransactions() {
  try {
    // Fetch pending transactions from our local SQLite/Postgres
    const pendingTxs = (await db
      .prepare(`SELECT * FROM "Islemler" WHERE escrow_state = 'pending'`)
      .all()) as any[];

    for (const tx of pendingTxs) {
      // For dual support, we infer crypto type based on address prefix.
      const cryptoType: "BTC" | "LTC" =
        tx.temp_wallet_address.startsWith("ltc1") ||
        tx.temp_wallet_address.startsWith("M") ||
        tx.temp_wallet_address.startsWith("L")
          ? "LTC"
          : "BTC";

      const data = await fetchAddressData(tx.temp_wallet_address, cryptoType);

      if (data && data.chain_stats) {
        // Chain stats show funded amounts in satoshis (1e8)
        const fundedSats =
          data.chain_stats.funded_txo_sum + data.mempool_stats.funded_txo_sum;

        if (fundedSats > 0) {
          const cryptoAmount = fundedSats / 100000000;

          console.log(
            `[Escrow Motor] Detected ${cryptoAmount} ${cryptoType} deposit for TxID ${tx.id}`,
          );

          // Execute escrow state machine: Lock the transaction and credit the user's base balance
          await db
            .prepare(
              `UPDATE "Islemler" SET escrow_state = 'completed', amount = ? WHERE id = ?`,
            )
            .run(cryptoAmount, tx.id);

          // Credit User
          if (cryptoType === "BTC") {
            await db
              .prepare(
                `UPDATE "Kullanicilar" SET balance_btc = balance_btc + ? WHERE id = ?`,
              )
              .run(cryptoAmount, tx.user_id);
          } else {
            await db
              .prepare(
                `UPDATE "Kullanicilar" SET balance_ltc = balance_ltc + ? WHERE id = ?`,
              )
              .run(cryptoAmount, tx.user_id);
          }
        }
      }

      // Delay to avoid aggressive rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (error) {
    console.error("[Escrow Motor] Tracker iteration failed:", error);
  }
}

// Start tracking loop every 2 minutes
setInterval(scanPendingTransactions, 2 * 60 * 1000);
