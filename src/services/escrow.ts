import postgres from 'postgres';
import { BlockchainWatcher } from './blockchainWatcher.ts';

export class EscrowService {
  private sql: any;
  private readonly intervalMs = 30_000;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString);
  }

  start() {
    if (this.intervalId) return;
    this.runLoop();
    this.intervalId = setInterval(() => this.runLoop(), this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async runLoop() {
    try {
      const orders = await this.sql`
        SELECT id, currency, payment_address, expected_amount, status, xmr_subaddress_index 
        FROM orders 
        WHERE status = 'pending'
      `;

      if (!orders || orders.length === 0) return;

      for (const order of orders) {
        try {
          await this.processOrder(order);
        } catch (inner) {
          console.error('Error processing order:', inner);
        }
      }
    } catch (outer) {
      console.error('Escrow watcher loop error:', outer);
    }
  }

  private async processOrder(order: any) {
    let isPaid = false;

    switch (order.currency) {
      case 'BTC':
      case 'LTC': {
        const { confirmed } = await BlockchainWatcher.checkUtxoBalance(order.payment_address, order.currency);
        if (confirmed >= order.expected_amount) isPaid = true;
        break;
      }
      case 'ETH': {
        const ethRpc = process.env.ETH_RPC_URL || 'https://cloudflare-eth.com';
        const balance = await BlockchainWatcher.checkEthBalance(order.payment_address, ethRpc);
        if (balance >= order.expected_amount) isPaid = true;
        break;
      }
      case 'XMR': {
        const xmrRpc = process.env.XMR_RPC_URL || 'http://127.0.0.1:18082';
        const balance = await BlockchainWatcher.checkXmrBalance(xmrRpc, order.xmr_subaddress_index);
        if (balance >= order.expected_amount) isPaid = true;
        break;
      }
      default:
        console.warn(`Unsupported currency: ${order.currency}`);
    }

    if (isPaid) {
      await this.sql`SELECT trg_order_paid()`;
      console.log(`Order ${order.id} paid successfully.`);
    }
  }
}
