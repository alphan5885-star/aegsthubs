import express from 'express';
import cors from 'cors';
import postgres from 'postgres';
import { AddressGenerator } from './services/addressGenerator.ts';
import { EscrowService } from './services/escrow.ts';
import 'dotenv/config'; 

const app = express();
app.use(cors());
app.use(express.json());

const sql = postgres(process.env.DATABASE_URL!);

const escrow = new EscrowService(process.env.DATABASE_URL!);
escrow.start();

app.post('/api/create-order', async (req, res) => {
  try {
    const { currency, amount } = req.body;
    
    if (!['BTC', 'LTC', 'ETH', 'XMR'].includes(currency)) {
      return res.status(400).json({ error: 'Unsupported currency' });
    }

    const result = await sql`SELECT count(id) as count FROM orders WHERE currency = ${currency}`;
    const nextIndex = parseInt(result[0].count) + 1;

    let paymentAddress = '';
    let xmrSubaddressIndex = null;

    if (currency === 'BTC' || currency === 'LTC') {
      const xpub = currency === 'BTC' ? process.env.BTC_XPUB! : process.env.LTC_XPUB!;
      paymentAddress = AddressGenerator.generateBtcLtcAddress(xpub, nextIndex, currency);
    } else if (currency === 'ETH') {
      paymentAddress = AddressGenerator.generateEthAddress(process.env.ETH_MNEMONIC!, nextIndex);
    } else if (currency === 'XMR') {
      paymentAddress = await AddressGenerator.generateXmrSubaddress(process.env.XMR_RPC_URL!, nextIndex);
      xmrSubaddressIndex = nextIndex;
    }

    const [newOrder] = await sql`
      INSERT INTO orders (currency, payment_address, expected_amount, status, xmr_subaddress_index)
      VALUES (${currency}, ${paymentAddress}, ${amount}, 'pending', ${xmrSubaddressIndex})
      RETURNING id
    `;

    return res.json({
      order_id: newOrder.id,
      payment_address: paymentAddress,
      currency,
      expected_amount: amount
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/api/order-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [order] = await sql`
      SELECT id, status, currency, payment_address, expected_amount 
      FROM orders 
      WHERE id = ${id}
    `;

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json(order);
  } catch (err: any) {
    console.error('Error fetching order status:', err);
    return res.status(500).json({ error: 'Failed to fetch order status' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Maxelpay API Server running on port ${PORT}`);
});
