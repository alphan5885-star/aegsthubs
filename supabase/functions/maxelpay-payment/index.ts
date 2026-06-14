// Create Maxelpay Payment - Initiates a payment session with Maxelpay API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeadersBase = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PaymentRequest {
  order_id: string;
  amount: number;
  currency?: string;
  description?: string;
}

interface MaxelpaySession {
  id: string;
  checkout_url: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  expires_at: string;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const envAllowlist = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  const allowedOrigins = envAllowlist
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowedOrigins.length === 0) {
    const siteUrl = Deno.env.get("SITE_URL");
    if (siteUrl) allowedOrigins.push(siteUrl);
  }
  const allowOrigin =
    origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0] || "null";
  return {
    ...corsHeadersBase,
    "Access-Control-Allow-Origin": allowOrigin,
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Maxelpay API key
    const apiKey = Deno.env.get("MAXELPAY_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Maxelpay not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.substring(7);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: PaymentRequest = await req.json();
    const { order_id, amount, currency = "USD", description } = body;

    if (!order_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid order_id or amount" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get webhook URL
    const siteUrl = Deno.env.get("SITE_URL") || "https://example.com";
    const webhookUrl = `${siteUrl}/api/webhooks/maxelpay`;

    // Create payment session with Maxelpay
    const maxelpayPayload = {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      order_id,
      description: description || `Order #${order_id}`,
      return_url: `${siteUrl}/payment-success?order_id=${order_id}`,
      cancel_url: `${siteUrl}/payment-cancelled?order_id=${order_id}`,
      webhook_url: webhookUrl,
      metadata: {
        user_id: userData.user.id,
        order_id,
      },
    };

    console.log("Creating Maxelpay payment session:", {
      orderId: order_id,
      amount,
      currency,
    });

    // Call Maxelpay API
    const maxelpayResponse = await fetch(
      "https://api.maxelpay.com/v1/checkout/session",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(maxelpayPayload),
      },
    );

    if (!maxelpayResponse.ok) {
      const errorText = await maxelpayResponse.text();
      console.error("Maxelpay API error:", {
        status: maxelpayResponse.status,
        body: errorText,
      });
      return new Response(
        JSON.stringify({
          error: "Failed to create payment session",
          details: errorText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const maxelpaySession: MaxelpaySession = await maxelpayResponse.json();

    console.log("Maxelpay session created:", maxelpaySession.id);

    // Store session in database
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: storeError } = await supabaseAdmin
      .from("maxelpay_sessions")
      .insert({
        session_id: maxelpaySession.id,
        order_id,
        user_id: userData.user.id,
        amount,
        currency,
        checkout_url: maxelpaySession.checkout_url,
        status: maxelpaySession.status,
        expires_at: maxelpaySession.expires_at,
      });

    if (storeError) {
      console.error("Error storing session:", storeError);
    }

    return new Response(
      JSON.stringify({
        session_id: maxelpaySession.id,
        checkout_url: maxelpaySession.checkout_url,
        status: maxelpaySession.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("Maxelpay payment error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
