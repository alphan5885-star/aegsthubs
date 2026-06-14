/**
 * Maxelpay TypeScript Type Definitions
 * Add to your project for better type safety
 */

// Maxelpay Payment Session
export interface MaxelpaySession {
  id: string;
  session_id: string;
  order_id: string;
  user_id: string;
  amount: number;
  currency: string;
  checkout_url: string;
  status: "pending" | "completed" | "expired" | "failed";
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// Maxelpay Payment Record
export interface MaxelpayPayment {
  id: string;
  order_id: string;
  maxelpay_transaction_id: string;
  status: "completed" | "failed" | "pending";
  amount: number;
  currency: string;
  processed_at: string;
  created_at: string;
}

// Maxelpay Webhook Payload
export interface MaxelpayWebhook {
  id: string;
  transaction_id: string;
  status: "success" | "failed" | "pending";
  amount: number;
  currency: string;
  order_id?: string;
  merchant_id?: string;
  timestamp: number;
  signature?: string;
  metadata?: Record<string, any>;
}

// Maxelpay Webhook Log Entry
export interface MaxelpayWebhookLog {
  id: string;
  transaction_id: string;
  status: string;
  amount?: number;
  currency?: string;
  order_id?: string;
  payload: MaxelpayWebhook;
  received_at: string;
  processed_at?: string;
}

// Payment Creation Request
export interface CreateMaxelpayPaymentRequest {
  order_id: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

// Payment Session Response
export interface CreateMaxelpayPaymentResponse {
  session_id: string;
  checkout_url: string;
  status: string;
  error?: string;
}

// Order Extension (add to your existing Order type)
export interface OrderWithMaxelpay {
  id: string;
  status: string;
  amount: number;
  buyer_id: string;
  vendor_id: string;
  payment_method?: "crypto" | "maxelpay" | "bank";
  payment_id?: string;
  created_at: string;
  updated_at: string;
  // ... other fields
}

// Webhook Verification Result
export interface WebhookVerificationResult {
  valid: boolean;
  payload?: MaxelpayWebhook;
  error?: string;
}
