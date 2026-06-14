import { createServerFn } from "@tanstack/react-start";

export type CreateMaxelpaySessionInput = {
  userId: string;
  orderId: string;
  amount: number;
  currency?: string;
  description?: string;
};

export const createMaxelpaySessionFn = createServerFn({ method: "POST" })
  .inputValidator((data: CreateMaxelpaySessionInput) => data)
  .handler(async (ctx) => {
    const { userId, orderId, amount, currency = "USD", description } = ctx.data;
    const apiKey = process.env.MAXELPAY_API_KEY;
    const siteUrl = process.env.SITE_URL || "https://example.com";

    if (!apiKey) {
      throw new Error("MAXELPAY_API_KEY is not configured");
    }
    if (!userId) {
      throw new Error("User ID is required to create a Maxelpay session");
    }
    if (!orderId) {
      throw new Error("Order ID is required");
    }
    if (!amount || amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const webhookUrl = `${siteUrl.replace(/\/$/, "")}/webhooks/maxelpay`;
    const returnUrl = `${siteUrl.replace(/\/$/, "")}/orders`;
    const cancelUrl = `${siteUrl.replace(/\/$/, "")}/orders`;

    const payload = {
      amount: Math.round(amount * 100),
      currency,
      order_id: orderId,
      description: description || `Sipariş ${orderId}`,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: userId,
        order_id: orderId,
        source: "neon-db",
      },
    };

    const response = await fetch(
      "https://api.maxelpay.com/v1/checkout/session",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Maxelpay API request failed (${response.status}): ${errorText}`,
      );
    }

    const data = await response.json();

    return {
      session_id: data.id || data.session_id || null,
      checkout_url: data.checkout_url,
      status: data.status,
    };
  });
