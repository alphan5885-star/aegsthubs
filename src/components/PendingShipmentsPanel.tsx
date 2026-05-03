import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { useI18n } from "@/lib/i18n";
import { Truck, Send } from "lucide-react";
import AnonymousShippingForm from "./AnonymousShippingForm";
import EmptyState from "./EmptyState";
import OrderChatButton from "./OrderChatButton";

interface PendingOrder {
  id: string;
  buyer_id: string;
  amount: number;
  delivery_method: string;
  created_at: string;
  product_name: string | null;
}

export default function PendingShipmentsPanel() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<PendingOrder | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, buyer_id, amount, delivery_method, created_at, product_name")
      .eq("vendor_id", user.id)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(20);
    setOrders((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  return (
    <div className="glass-card rounded-xl p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-4 h-4 text-orange-400" />
        <h2 className="text-sm font-mono font-bold text-foreground">{t("vendor.pendingShipments")}</h2>
        {orders.length > 0 && (
          <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">{orders.length}</span>
        )}
      </div>

      {loading ? (
        <div className="text-xs font-mono text-muted-foreground animate-pulse">{t("loading")}</div>
      ) : orders.length === 0 ? (
        <EmptyState title={t("vendor.noPending")} />
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between bg-secondary/30 rounded p-2">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono text-foreground truncate">
                  {o.product_name || "—"} <span className="text-muted-foreground">#{o.id.slice(0, 8)}</span>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {o.amount} LTC · {o.delivery_method === "dead_drop" ? t("delivery.deadDrop") : o.delivery_method === "mailbox" ? t("delivery.mailbox") : t("delivery.cargo")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <OrderChatButton orderId={o.id} label="Alıcı" />
                <button
                  onClick={() => setActive(o)}
                  className="flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-mono rounded hover:opacity-90"
                >
                  <Send className="w-3 h-3" /> {t("vendor.fulfillNow")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {active && (
        <AnonymousShippingForm
          open={!!active}
          onOpenChange={(open) => { if (!open) setActive(null); }}
          orderId={active.id}
          buyerId={active.buyer_id}
          onSubmitted={load}
        />
      )}
    </div>
  );
}
