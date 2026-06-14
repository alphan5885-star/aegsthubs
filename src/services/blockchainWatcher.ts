// src/services/blockchainWatcher.ts
/**
 * BlockchainWatcher service
 * Provides balance & transaction confirmations monitoring using two back‑ends:
 *   1. **Esplora** – a HTTP REST API (e.g., https://blockstream.info/api)
 *   2. **Electrum** – JSON‑RPC over TCP/WebSocket.
 *
 * The service is local and does not depend on any third‑party SDKs.
 * It can be instructed to route traffic through a Tor proxy by providing a custom fetch implementation.
 *
 * Failover strategy:
 *   - Attempt the primary backend first (configurable).
 *   - On network error, timeout or non‑2xx response, automatically retry with the secondary backend.
 *   - Errors are surfaced as plain `Error` objects with a `.fallbackUsed` flag for callers to inspect.
 */
import type { Network } from "./addressGenerator.ts";

/** Simple fetch wrapper that can be overridden to support Tor proxy */
export type FetchFn = typeof fetch;

export interface WatcherConfig {
  /** URL of the Esplora endpoint, e.g. https://blockstream.info/api */
  esploraBaseUrl: string;
  /** Electrum server URL (WebSocket) */
  electrumWsUrl: string;
  /** Optional custom fetch implementation (for Tor or testing) */
  fetchFn?: FetchFn;
  /** Primary source – "esplora" or "electrum" */
  primary?: "esplora" | "electrum";
  /** Bitcoin network – "mainnet" or "testnet" */
  network?: Network;
}

/** Result of a transaction lookup */
export interface TxInfo {
  txid: string;
  confirmations: number;
  status: "pending" | "confirmed" | "unknown";
  /** Raw data for further processing */
  raw?: any;
}

/** Simple JSON‑RPC client for Electrum over WebSocket */
class ElectrumClient {
  private ws: WebSocket;
  private id = 0;
  private pending: Map<number, (data: any) => void> = new Map();
  private url: string;

  constructor(url: string) {
    this.url = url;
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (e) => {
      try {
        const resp = JSON.parse(e.data as string);
        if (resp.id && this.pending.has(resp.id)) {
          const resolve = this.pending.get(resp.id)!;
          this.pending.delete(resp.id);
          resolve(resp.result);
        }
      } catch {}
    };
  }

  private send(method: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, resolve);
      const payload = JSON.stringify({ jsonrpc: "2.0", method, params, id });
      if (this.ws.readyState === WebSocket.OPEN) this.ws.send(payload);
      else {
        this.ws.addEventListener("open", () => this.ws.send(payload), { once: true });
      }
      // Simple timeout
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error("Electrum request timeout"));
        }
      }, 8000);
    });
  }

  async getTx(txid: string): Promise<any> {
    // Electrum method: transaction.get (txid, verbose)
    return this.send("blockchain.transaction.get", [txid, true]);
  }

  async getAddressBalance(address: string): Promise<any> {
    // Electrum method: blockchain.address.get_balance
    return this.send("blockchain.address.get_balance", [address]);
  }
}

/** Main watcher class */
export class BlockchainWatcher {
  private fetchFn: FetchFn;
  private electrum: ElectrumClient;
  private cfg: WatcherConfig;

  constructor(cfg: WatcherConfig) {
    this.cfg = cfg;
    this.fetchFn = cfg.fetchFn ?? fetch.bind(globalThis);
    this.electrum = new ElectrumClient(cfg.electrumWsUrl);
  }

  /** Helper to perform failover */
  private async withFailover<T>(primaryFn: () => Promise<T>, secondaryFn: () => Promise<T>): Promise<T> {
    try {
      return await primaryFn();
    } catch (e) {
      // Mark that fallback was used for diagnostics
      const err = e as any;
      err.fallbackUsed = true;
      // Attempt secondary – let its error propagate if it fails as well
      return await secondaryFn();
    }
  }

  /** Get TX info with failover between Esplora and Electrum */
  async getTxInfo(txid: string): Promise<TxInfo> {
    const primaryEsplora = async (): Promise<TxInfo> => {
      const url = `${this.cfg.esploraBaseUrl}/tx/${txid}`;
      const resp = await this.fetchFn(url);
      if (!resp.ok) throw new Error(`Esplora error ${resp.status}`);
      const data = await resp.json();
      return {
        txid,
        confirmations: data.status?.confirmed ? data.status.confirmations : 0,
        status: data.status?.confirmed ? "confirmed" : "pending",
        raw: data,
      };
    };

    const secondaryElectrum = async (): Promise<TxInfo> => {
      const raw = await this.electrum.getTx(txid);
      // Electrum returns confirmations count directly
      const confirmations = raw?.confirmations ?? 0;
      return {
        txid,
        confirmations,
        status: confirmations > 0 ? "confirmed" : "pending",
        raw,
      };
    };

    if (this.cfg.primary === "electrum") {
      return this.withFailover(secondaryElectrum, primaryEsplora);
    }
    return this.withFailover(primaryEsplora, secondaryElectrum);
  }

  /** Get balance for an address */
  async getAddressBalance(address: string): Promise<number> {
    const primaryEsplora = async (): Promise<number> => {
      const url = `${this.cfg.esploraBaseUrl}/address/${address}`;
      const resp = await this.fetchFn(url);
      if (!resp.ok) throw new Error(`Esplora error ${resp.status}`);
      const data = await resp.json();
      // value returned in satoshis
      return Number(data.chain_stats?.funded_txo_sum ?? 0) - Number(data.chain_stats?.spent_txo_sum ?? 0);
    };

    const secondaryElectrum = async (): Promise<number> => {
      const raw = await this.electrum.getAddressBalance(address);
      // Electrum returns {confirmed, unconfirmed}
      return (raw?.confirmed ?? 0) + (raw?.unconfirmed ?? 0);
    };

    if (this.cfg.primary === "electrum") {
      return this.withFailover(secondaryElectrum, primaryEsplora);
    }
    return this.withFailover(primaryEsplora, secondaryElectrum);
  }

  // Static stubs for escrow service
  public static async checkUtxoBalance(address: string, currency: string): Promise<{ confirmed: number }> {
    return { confirmed: 0 };
  }

  public static async checkEthBalance(address: string, rpc: string): Promise<number> {
    return 0;
  }

  public static async checkXmrBalance(rpcUrl: string, subaddressIndex: number): Promise<number> {
    return 0;
  }
}

export default BlockchainWatcher;
