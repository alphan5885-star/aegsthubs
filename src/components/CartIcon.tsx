import { useCart } from "@/lib/cartContext";
import { ShoppingCart as CartIcon, X, Plus, Minus, Trash2 } from "lucide-react";
import { useNavigate } from "@/lib/router-shim";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

export default function CartIconButton() {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalPrice,
    itemCount,
    isOpen,
    setIsOpen,
  } = useCart();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (itemCount === 0) return null;

  return (
    <>
      {/* Floating Cart Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg neon-glow-btn hover:scale-110 transition-transform"
      >
        <CartIcon className="w-5 h-5" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-xs font-mono font-bold flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-border flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CartIcon className="w-5 h-5 text-primary" />
                  <span className="font-mono font-bold text-foreground">
                    {t("cart.sepet")} ({itemCount})
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3 p-3 bg-secondary/30 rounded-lg"
                  >
                    <div className="w-14 h-14 rounded bg-background flex items-center justify-center overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl">
                          {item.imageEmoji || "📦"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {item.name}
                      </div>
                      <div className="text-xs font-mono text-primary">
                        {item.price.toFixed(4)} LTC
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          className="p-1 bg-background rounded hover:bg-secondary"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
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
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-muted-foreground">
                    {t("cart.toplam")}
                  </span>
                  <span className="text-lg font-mono font-bold text-primary">
                    {totalPrice.toFixed(4)} LTC
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-2 text-xs font-mono border border-border rounded hover:bg-secondary"
                  >
                    {t("cart.temizle")}
                  </button>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/checkout");
                    }}
                    className="flex-1 py-2 bg-primary text-primary-foreground text-xs font-mono rounded neon-glow-btn"
                  >
                    {t("cart.checkout")}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
