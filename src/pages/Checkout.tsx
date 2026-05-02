import { useState } from "react";
import { useNavigate } from "@/lib/router-shim";
import PageShell from "@/components/PageShell";
import { useCart } from "@/lib/cartContext";
import { useAuth } from "@/lib/authContext";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Lock,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, removeItem, updateQuantity, clearCart, totalPrice, itemCount } = useCart();
  const { t } = useI18n();
  const [processing, setProcessing] = useState(false);

  if (itemCount === 0) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <ShoppingCart className="w-16 h-16 text-muted-foreground opacity-30 mb-4" />
          <h2 className="text-lg font-mono font-bold text-foreground mb-2">
            {t("cart.emptyCart")}
          </h2>
          <p className="text-sm text-muted-foreground font-mono mb-6">
            {t("cart.emptyCartDesc")}
          </p>
          <button
            onClick={() => navigate("/market")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded font-mono text-sm"
          >
            {t("cart.goToMarket")}
          </button>
        </div>
      </PageShell>
    );
  }

  const handleCheckout = async () => {
    if (!user || items.length === 0) return;
    setProcessing(true);

    try {
      const results = [];
      for (const item of items) {
        const { data, error } = await (supabase as any).rpc("create_order_with_escrow", {
          _product_id: item.productId,
          _delivery_method: item.type === "digital" ? "cargo" : "cargo",
          _shipping_address: null,
          _notes: null,
        });

        if (error || !(data as any)?.order_id) {
          const errMsg = (data as any)?.error || error?.message || "Order failed";
          if (import.meta.env.DEV) console.error("Order error:", errMsg);
          results.push({ product: item.name, error: errMsg });
        } else {
          results.push({ product: item.name, orderId: (data as any).order_id });
        }
      }

      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        toast.error(`${errors.length} ${t("cart.orderFailed")}`);
        return;
      }

      toast.success(`${itemCount} ${t("cart.ordersCreated")}`);
      clearCart();
      navigate("/orders");
    } catch (e) {
      if (import.meta.env.DEV) console.error("Checkout error:", e);
      toast.error(t("err.generic"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1 as unknown as string)}
            className="p-2 hover:bg-secondary rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-mono font-bold text-primary">
            {t("cart.checkoutTitle")}
          </h1>
        </div>

        <div className="glass-card rounded-lg overflow-hidden mb-6">
          <div className="p-4 border-b border-border">
            <h2 className="font-mono text-sm text-foreground">
              {t("cart.items")} ({itemCount})
            </h2>
          </div>

          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.productId} className="p-4 flex gap-4">
                <div className="w-16 h-16 rounded bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">{item.imageEmoji || "📦"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {item.name}
                  </div>
                  <div className="text-xs font-mono text-primary mt-1">
                    {item.price.toFixed(4)} LTC
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="p-1 bg-background rounded hover:bg-secondary"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-mono w-6 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-1 bg-background rounded hover:bg-secondary"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="ml-auto p-1 text-destructive hover:bg-destructive/10 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-mono font-bold text-foreground">
                    {(item.price * item.quantity).toFixed(4)} LTC
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground">
                    {(item.price * item.quantity * 0.62).toFixed(4)} XMR
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-muted-foreground">{t("cart.subtotal")}</span>
            <span className="text-lg font-mono font-bold text-foreground">
              {totalPrice.toFixed(4)} LTC
            </span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="font-mono text-muted-foreground">{t("cart.inXmr")}</span>
            <span className="text-sm font-mono text-orange-400">
              {(totalPrice * 0.62).toFixed(4)} XMR
            </span>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <span className="font-mono font-bold text-foreground">{t("cart.total")}</span>
            <span className="text-xl font-mono font-bold text-primary">
              {totalPrice.toFixed(4)} LTC
            </span>
          </div>
        </div>

        <div className="glass-card rounded-lg p-3 mb-4 flex items-center gap-2 border border-primary/20">
          <Lock className="w-4 h-4 text-primary shrink-0" />
          <div className="text-[10px] font-mono text-muted-foreground">
            {t("cart.escrowNote")}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={clearCart}
            className="flex-1 py-3 border border-border rounded-lg font-mono text-sm hover:bg-secondary"
          >
            {t("cart.clearCart")}
          </button>
          <motion.button
            onClick={handleCheckout}
            disabled={processing}
            whileTap={{ scale: 0.98 }}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-mono font-bold neon-glow-btn disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              <span className="animate-pulse">{t("cart.processing")}</span>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                {t("cart.checkout")} — {totalPrice.toFixed(4)} LTC
              </>
            )}
          </motion.button>
        </div>
      </div>
    </PageShell>
  );
}
