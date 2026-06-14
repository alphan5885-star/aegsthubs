// src/lib/escrow.ts
// 30-second interval that watches Supabase  orders table, checks blockchain status via Tor SOCKS5 proxy, and calls rpc('trg_order_paid') on confirmed payments.
// Errors are logged with console.error and the loop continues.

// @ts-ignore
import { createClient, SupabaseClient } from '@supabase/supabase-js';
// @ts-ignore
import { rpc } from '../rpc.ts'; // adjust import as needed
import { SocksProxyAgent } from 'socks-proxy-agent';

// Supabase configuration (environment variables expected)
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY as string;
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Tor SOCKS5 proxy configuration
const TOR_PROXY = 'socks5://127.0.0.1:9050';
const proxyAgent = new SocksProxyAgent(TOR_PROXY);

/** Query blockchain transaction status via a proxy-routed HTTP request. */
async function getTxStatus(txHash: string): Promise<string> {
  const url = `https://blockchain-watcher.example.com/api/v1/tx/${txHash}`;
  const resp = await fetch(url, { method: 'GET', agent: proxyAgent } as any);
  if (!resp.ok) throw new Error(`Tx status request failed: ${resp.status}`);
  const data = await resp.json() as any;
  return data.status; // expected 'pending' | 'confirmed' etc.
}

/** Main watcher loop - runs every 30 seconds. */
function startEscrowWatcher() {
  setInterval(async () => {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, tx_hash, status')
        .neq('status', 'paid');

      if (error) {
        console.error('Supabase query error:', error);
        return;
      }

      if (!orders) return;

      for (const order of orders) {
        try {
          const status = await getTxStatus(order.tx_hash as string);
          if (status === 'confirmed') {
            await rpc('trg_order_paid', { orderId: order.id });
          }
        } catch (inner) {
          console.error('Error processing order:', inner);
        }
      }
    } catch (outer) {
      console.error('Escrow watcher loop error:', outer);
    }
  }, 30_000);
}

// Start watching immediately when the module loads.
startEscrowWatcher();
