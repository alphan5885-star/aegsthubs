# Maxelpay Integration - Developer Guide

## 📖 Table of Contents
1. [How to Use](#how-to-use)
2. [Component Integration](#component-integration)
3. [API Integration](#api-integration)
4. [Error Handling](#error-handling)
5. [Testing](#testing)

---

## How to Use

### Basic Usage

```typescript
import MaxelpayCheckout from "@/components/MaxelpayCheckout";

export function YourCheckoutComponent() {
  return (
    <MaxelpayCheckout
      orderId="550e8400-e29b-41d4-a716-446655440000"
      amount={99.99}
      currency="USD"
      description="Premium Plan - Monthly"
      onSuccess={() => {
        console.log("Payment successful!");
        window.location.href = "/success";
      }}
      onError={(error) => {
        console.error("Payment failed:", error);
      }}
    />
  );
}
```

### Props Documentation

```typescript
interface MaxelpayCheckoutProps {
  orderId: string;           // UUID of the order
  amount: number;            // Amount in USD (e.g., 99.99)
  currency?: string;         // Currency code (default: "USD")
  description?: string;      // Order description for display
  onSuccess?: () => void;    // Callback on successful redirect
  onError?: (error) => void; // Callback on error
}
```

---

## Component Integration

### Example 1: In Checkout Page

```typescript
import { useState } from "react";
import MaxelpayCheckout from "@/components/MaxelpayCheckout";
import { useI18n } from "@/lib/i18n";

export default function CheckoutPage({ orderId, cart }) {
  const { t } = useI18n();
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const [processing, setProcessing] = useState(false);

  return (
    <div className="checkout-container">
      <div className="order-summary">
        <h2>{t("checkout.summary")}</h2>
        <p>Total: ${total.toFixed(2)}</p>
      </div>

      <div className="payment-methods">
        <MaxelpayCheckout
          orderId={orderId}
          amount={total}
          currency="USD"
          description={`${cart.length} items`}
          onSuccess={() => {
            setProcessing(true);
            // Redirect handled by Maxelpay
          }}
          onError={(error) => {
            toast.error(`Payment error: ${error}`);
          }}
        />
      </div>
    </div>
  );
}
```

### Example 2: Tabbed Payment Methods

See [src/pages/PaymentMethod.tsx](../src/pages/PaymentMethod.tsx) for a complete example with both Maxelpay and crypto options.

```typescript
<Tabs value={selectedMethod} onValueChange={setSelectedMethod}>
  <TabsList>
    <TabsTrigger value="maxelpay">💳 Card Payment</TabsTrigger>
    <TabsTrigger value="crypto">₿ Crypto</TabsTrigger>
  </TabsList>

  <TabsContent value="maxelpay">
    <MaxelpayCheckout orderId={orderId} amount={amount} />
  </TabsContent>

  <TabsContent value="crypto">
    <PaymentTracker orderId={orderId} amount={amount} />
  </TabsContent>
</Tabs>
```

### Example 3: Vendor Wallet Integration

```typescript
import { supabase } from "@/integrations/supabase/client";
import MaxelpayCheckout from "@/components/MaxelpayCheckout";

export function VendorWithdrawalModal({ vendorId, withdrawAmount }) {
  const handleMaxelpayPayout = async () => {
    // Create order for payout
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        vendor_id: vendorId,
        amount: withdrawAmount,
        type: "payout",
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create payout order");
      return;
    }

    // Show Maxelpay checkout for payout
    return (
      <MaxelpayCheckout
        orderId={order.id}
        amount={withdrawAmount}
        description={`Vendor payout - ${vendorId}`}
        onSuccess={() => {
          toast.success("Payout initiated!");
        }}
      />
    );
  };

  return (
    <Dialog>
      <DialogContent>
        <h2>Withdraw via Maxelpay</h2>
        {handleMaxelpayPayout()}
      </DialogContent>
    </Dialog>
  );
}
```

---

## API Integration

### Creating a Payment Session Manually

```typescript
import { supabase } from "@/integrations/supabase/client";

async function createPaymentSession(orderId: string, amount: number) {
  const { data, error } = await supabase.functions.invoke(
    "maxelpay-payment",
    {
      body: {
        order_id: orderId,
        amount,
        currency: "USD",
        description: "Order payment",
      },
    }
  );

  if (error) {
    console.error("Payment error:", error);
    return null;
  }

  return data; // { session_id, checkout_url, status }
}
```

### Handling Webhook Responses

The webhook is automatically handled by the Edge Function. To track payment status:

```typescript
// Query payment status
async function getPaymentStatus(orderId: string) {
  const { data, error } = await supabase
    .from("maxelpay_payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data?.status; // 'completed', 'failed', 'pending'
}

// Watch for order status changes
function watchOrderStatus(orderId: string) {
  return supabase
    .from("orders")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        console.log("Order updated:", payload.new.status);
        if (payload.new.status === "paid") {
          // Handle payment success
        }
      }
    )
    .subscribe();
}
```

---

## Error Handling

### Common Error Scenarios

```typescript
import { toast } from "sonner";

export function handleMaxelpayError(error: string, context: string) {
  const errorMap: Record<string, string> = {
    "Maxelpay not configured": "Payment gateway is not available. Please try again later.",
    "Invalid order_id or amount": "Please ensure all required fields are filled correctly.",
    "Failed to create payment session": "Could not initialize payment. Please retry.",
    "order_id required": "Missing order information. Please reload the page.",
    "Unauthorized": "Your session has expired. Please log in again.",
    "BlockCypher not configured": "Crypto payment is temporarily unavailable.",
  };

  const userMessage = errorMap[error] || "Payment failed. Please try again.";
  toast.error(`${context}: ${userMessage}`);
  
  console.error(`[Maxelpay Error] ${context}:`, error);
}
```

### Advanced Error Handling Pattern

```typescript
interface PaymentError {
  code: string;
  message: string;
  recoverable: boolean;
}

async function createPaymentWithErrorHandling(
  orderId: string,
  amount: number
): Promise<{ success: boolean; error?: PaymentError }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "maxelpay-payment",
      { body: { order_id: orderId, amount } }
    );

    if (error?.status === 401) {
      return {
        success: false,
        error: {
          code: "AUTH_FAILED",
          message: "Please log in to continue",
          recoverable: true,
        },
      };
    }

    if (error?.status === 400) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid payment details",
          recoverable: true,
        },
      };
    }

    if (error?.status >= 500) {
      return {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Payment server error. Please try again.",
          recoverable: true,
        },
      };
    }

    if (!data?.checkout_url) {
      return {
        success: false,
        error: {
          code: "NO_CHECKOUT_URL",
          message: "Could not retrieve payment page",
          recoverable: false,
        },
      };
    }

    // Success
    window.location.href = data.checkout_url;
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: {
        code: "UNKNOWN",
        message: e instanceof Error ? e.message : "Unknown error",
        recoverable: true,
      },
    };
  }
}
```

---

## Testing

### Unit Test Example (Vitest)

```typescript
import { describe, it, expect, vi } from "vitest";
import MaxelpayCheckout from "@/components/MaxelpayCheckout";
import { render, screen, fireEvent } from "@testing-library/react";

describe("MaxelpayCheckout", () => {
  it("renders payment button", () => {
    render(
      <MaxelpayCheckout orderId="test-id" amount={100} />
    );
    expect(screen.getByText(/Maxelpay/i)).toBeInTheDocument();
  });

  it("shows loading state while processing", async () => {
    const { getByText } = render(
      <MaxelpayCheckout orderId="test-id" amount={100} />
    );
    
    const button = getByText(/Ödeme Yap/i);
    fireEvent.click(button);
    
    expect(getByText(/Yükleniyor/i)).toBeInTheDocument();
  });

  it("calls onError on payment failure", async () => {
    const onError = vi.fn();
    render(
      <MaxelpayCheckout 
        orderId="invalid" 
        amount={-100} 
        onError={onError}
      />
    );
    
    fireEvent.click(screen.getByText(/Ödeme Yap/i));
    expect(onError).toBeCalled();
  });
});
```

### Integration Test Example

```typescript
it("complete payment flow", async () => {
  // 1. Create order
  const { data: order } = await supabase
    .from("orders")
    .insert({ amount: 100, status: "pending" })
    .select()
    .single();

  // 2. Create payment session
  const { data: session } = await supabase.functions.invoke(
    "maxelpay-payment",
    {
      body: {
        order_id: order.id,
        amount: 100,
      },
    }
  );

  expect(session.checkout_url).toBeDefined();
  expect(session.session_id).toBeDefined();

  // 3. Simulate webhook
  const webhook = {
    id: session.session_id,
    status: "success",
    order_id: order.id,
    amount: 10000,
  };

  await fetch(`/functions/v1/maxelpay-webhook`, {
    method: "POST",
    body: JSON.stringify(webhook),
  });

  // 4. Verify order status updated
  const { data: updatedOrder } = await supabase
    .from("orders")
    .select("status")
    .eq("id", order.id)
    .single();

  expect(updatedOrder.status).toBe("paid");
});
```

### Manual Testing Steps

1. **Test Payment Creation**
   ```bash
   curl -X POST http://localhost:54321/functions/v1/maxelpay-payment \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "order_id": "550e8400-e29b-41d4-a716-446655440000",
       "amount": 100.00
     }'
   ```

2. **Test Webhook**
   ```bash
   curl -X POST http://localhost:54321/functions/v1/maxelpay-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "id": "txn_test",
       "status": "success",
       "order_id": "550e8400-e29b-41d4-a716-446655440000",
       "amount": 10000
     }'
   ```

3. **Verify Database Updates**
   ```sql
   SELECT * FROM public.maxelpay_webhooks ORDER BY received_at DESC LIMIT 1;
   SELECT status FROM public.orders WHERE id = '550e8400-e29b-41d4-a716-446655440000';
   ```

---

## Best Practices

✅ **DO:**
- Use the MaxelpayCheckout component for consistency
- Handle errors gracefully with user-friendly messages
- Log errors for debugging
- Test with test API key first
- Use TypeScript for type safety

❌ **DON'T:**
- Store API keys in frontend code
- Hardcode webhook URLs
- Ignore error responses
- Trust unverified webhooks
- Skip CORS configuration

---

## Support & Resources

- 📚 [Full Setup Guide](./MAXELPAY_SETUP.md)
- ✅ [Setup Checklist](./MAXELPAY_CHECKLIST.md)
- 🔗 [Maxelpay API Docs](https://docs.maxelpay.com)
- 📦 [Type Definitions](./src/lib/maxelpay.types.ts)
- 💻 [Example Component](./src/components/MaxelpayCheckout.tsx)
- 📄 [Example Page](./src/pages/PaymentMethod.tsx)
