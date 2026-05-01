import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const incoming = req.headers.get("x-cron-secret");
    if (incoming !== cronSecret) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const blockcypherToken = Deno.env.get("BLOCKCYPHER_TOKEN");

  if (!blockcypherToken) {
    return new Response(JSON.stringify({ error: "BLOCKCYPHER_TOKEN missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const service = createClient(supabaseUrl, serviceRole);

  const { data: addresses, error: addrErr } = await service
    .from("user_deposit_addresses")
    .select("user_id, address")
    .eq("network", "LTC")
    .eq("status", "active");

  if (addrErr) {
    return new Response(JSON.stringify({ error: addrErr.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let totalCredited = 0;
  let processed = 0;
  const errors: string[] = [];

  for (const row of addresses ?? []) {
    try {
      const bcResp = await fetch(
        `https://api.blockcypher.com/v1/ltc/main/addrs/${row.address}/full?limit=50&token=${blockcypherToken}`,
      );
      if (!bcResp.ok) continue;
      const bcData = await bcResp.json();

      for (const tx of bcData.txs ?? []) {
        const confirmations = Number(tx.confirmations ?? 0);
        if (confirmations < 3) continue;
        const txHash = String(tx.hash ?? "");
        if (!txHash) continue;

        let amountSatoshi = 0;
        for (const out of tx.outputs ?? []) {
          if ((out.addresses ?? []).includes(row.address)) {
            amountSatoshi += Number(out.value ?? 0);
          }
        }
        if (amountSatoshi <= 0) continue;

        const { data: result, error: creditErr } = await service.rpc("credit_confirmed_deposit", {
          _user_id: row.user_id,
          _address: row.address,
          _tx_hash: txHash,
          _amount_satoshi: amountSatoshi,
          _confirmations: confirmations,
        });

        if (!creditErr && (result as { credited?: boolean } | null)?.credited) {
          totalCredited += 1;
        }
      }
      processed += 1;
    } catch (e) {
      errors.push(String(e));
    }
  }

  return new Response(
    JSON.stringify({ ok: true, processed, total_credited: totalCredited, errors }),
    { headers: { "Content-Type": "application/json" } },
  );
});
