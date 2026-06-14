// Maxelpay Webhook Handler - Processes payment notifications from Maxelpay API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as crypto from "https://deno.land/std@0.208.0/crypto/mod.ts";

const corsHeadersBase = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-maxelpay-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface MaxelpayWebhookPayload {
  id: string;
  status: "success" | "failed" | "pending";
  amount: number;
  currency: string;
  order_id?: string;
  merchant_id?: string;
  timestamp: number;
  signature?: string;
  [key: string]: any;
}

interface PaymentRecord {
  id: string;
  status: string;
  amount: number;
  currency: string;
  maxelpay_transaction_id: string;
  created_at: string;
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

async function verifyWebhookSignature(
  payload: string,
  signature: string,
): Promise<boolean> {
  try {
    const secret = Deno.env.get("MAXELPAY_WEBHOOK_SECRET") || "";
    if (!secret) {
      console.warn(
        "MAXELPAY_WEBHOOK_SECRET not configured - skipping signature verification",
      );
      return true;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(payload + secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex === signature;
  } catch (e) {
    console.error("Signature verification error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("MAXELPAY_API_KEY");
    if (!apiKey) {
      console.error("MAXELPAY_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Maxelpay not configured",
          status: "error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse webhook payload
    const bodyText = await req.text();
    const payload: MaxelpayWebhookPayload = JSON.parse(bodyText);

    // Verify webhook signature
    const signature = req.headers.get("x-maxelpay-signature") || "";
    const isValid = await verifyWebhookSignature(bodyText, signature);
    if (!isValid) {
      console.error("Invalid webhook signature for transaction:", payload.id);
      return new Response(
        JSON.stringify({
          error: "Invalid signature",
          status: "unauthorized",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Processing Maxelpay webhook:", {
      transactionId: payload.id,
      status: payload.status,
      orderId: payload.order_id,
    });

    // Store webhook data for debugging/audit
    const { error: logError } = await supabase
      .from("maxelpay_webhooks")
      .insert({
        transaction_id: payload.id,
        status: payload.status,
        amount: payload.amount,
        currency: payload.currency,
        order_id: payload.order_id,
        payload,
        received_at: new Date().toISOString(),
      });

    if (logError) {
      console.error("Error logging webhook:", logError);
    }

    // Handle successful payments
    if (payload.status === "success") {
      const orderId = payload.order_id;

      if (orderId) {
        // Check if order exists and is pending
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("id, status, amount, buyer_id")
          .eq("id", orderId)
          .maybeSingle();

        if (orderError) {
          console.error("Order lookup error:", orderError);
          return new Response(
            JSON.stringify({
              error: "Order not found",
              status: "error",
            }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (order && order.status === "pending") {
          // Create payment record
          const { error: paymentError } = await supabase
            .from("maxelpay_payments")
            .insert({
              order_id: orderId,
              maxelpay_transaction_id: payload.id,
              status: "completed",
              amount: payload.amount,
              currency: payload.currency,
              processed_at: new Date().toISOString(),
            });

          if (paymentError) {
            console.error("Payment record error:", paymentError);
          }

          // Update order status to paid
          const { error: updateError } = await supabase
            .from("orders")
            .update({
              status: "paid",
              payment_method: "maxelpay",
              payment_id: payload.id,
            })
            .eq("id", orderId);

          if (updateError) {
            console.error("Order update error:", updateError);
          } else {
            console.log(`Order ${orderId} marked as paid via Maxelpay`);
          }
        }
      }
    } else if (payload.status === "failed") {
      // Handle failed payments
      const orderId = payload.order_id;
      if (orderId) {
        const { error: failError } = await supabase
          .from("orders")
          .update({
            status: "payment_failed",
          })
          .eq("id", orderId);

        if (failError) {
          console.error("Failed order update error:", failError);
        } else {
          console.log(`Order ${orderId} payment failed`);
        }
      }
    }

    // Return success to Maxelpay
    return new Response(
      JSON.stringify({
        status: "received",
        transaction_id: payload.id,
        timestamp: Date.now(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("Maxelpay webhook error:", e);
    return new Response(
      JSON.stringify({
        error: String(e),
        status: "error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
