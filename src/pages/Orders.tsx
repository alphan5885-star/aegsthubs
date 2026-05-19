import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { CheckCircle, Star, Truck, MapPin, Mail, X, Package as PackageIcon, ShoppingCart, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "@/lib/router-shim";
import RateOrderDialog from "@/components/RateOrderDialog";
import OrderDeliveryInfo from "@/components/OrderDeliveryInfo";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import EmptyState from "@/components/EmptyState";
import OrderChatButton from "@/components/OrderChatButton";
import CreateDisputeDialog from "@/components/CreateDisputeDialog";
import { useI18n } from "@/lib/i18n";

interface OrderRow {
  id: string;
  amount: number;
  status: string;
  delivery_confirmed: boolean | null;
  delivery_method: string;
  created_at: string;
  products: {
    name: string;
    image_url: string | null;
    image_emoji: string | null;
    type: string;
    vendor_id: string;
  } | null;
}

export default function Orders() {
  const { user, role } = useAuth();
  const { t } = useI18n();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingOrder, setRatingOrder] = useState<{ id: string; vendorId: string; productName: string } | null>(null);
  const [ratedOrders, setRatedOrders] = useState<Set<string>>(new Set());
  
  // Dispute state variables
  const [disputeOrder, setDisputeOrder] = useState<{ id: string; vendorId: string; productName: string; amount: number } | null>(null);
  const [disputedOrders, setDisputedOrders] = useState<Set<string>>(new Set());
  
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const query = supabase
          .from("orders")
          .select("id, amount, status, delivery_method, created_at, products:product_id(name, image_url, image_emoji, type, vendor_id)")
          .order("created_at", { ascending: false }).limit(50);
        if (role === "buyer" || role === "vendor") query.eq("buyer_id", user.id);
        const { data } = await query;
        if (!isMounted.current) return;
        if (data) setOrders(data as any);

        const { data: ratings } = await supabase.from("vendor_ratings").select("order_id").eq("buyer_id", user.id);
        if (!isMounted.current) return;
        if (ratings) setRatedOrders(new Set(ratings.map((r: any) => r.order_id)));
        
        // Fetch existing disputes to set active locks
        const { data: disputes } = await supabase.from("disputes").select("order_id").eq("buyer_id", user.id);
        if (!isMounted.current) return;
        if (disputes) setDisputedOrders(new Set(disputes.map((d: any) => d.order_id)));
        
        setLoading(false);
      } catch {
        if (isMounted.current) setLoading(false);
      }
    };
    fetch();
    return () => { isMounted.current = false; };
  }, [user, role]);

  const confirmDelivery = async (orderId: string) => {
    const { data, error } = await supabase.rpc("confirm_delivery", { _order_id: orderId });
    if (error) { toast.error(t("err.generic")); return; }
    if (data && (data as any).success !== false) {
      toast.success(t("orders.confirmDelivery"));
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "delivered" } : o));
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm(t("orders.cancelConfirm"))) return;
    const { data, error } = await supabase.rpc("cancel_order", { _order_id: orderId });
    if (error || !(data as any)?.success) {
      toast.error((data as any)?.error || t("err.generic"));
      return;
    }
    toast.success(t("orders.cancelled"));
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "cancelled" } : o));
  };

  const deliveryIcon = (method: string) => {
    if (method === "dead_drop") return <MapPin className="w-3 h-3" />;
    if (method === "mailbox") return <Mail className="w-3 h-3" />;
    return <Truck className="w-3 h-3" />;
  };

  if (loading)
    return <PageShell><div className="text-muted-foreground font-mono animate-pulse">{t("loading")}</div></PageShell>;

  return (
    <PageShell>
      <h1 className="text-xl font-mono font-bold text-primary neon-text mb-6">{t("orders.title")}</h1>

      {orders.length === 0 ? (
        <div className="glass-card rounded-lg">
          <EmptyState
            icon={<PackageIcon className="w-8 h-8" />}
            title={t("orders.empty")}
            description={t("orders.emptyDesc")}
            action={
              <Link to="/market" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-mono rounded hover:opacity-90 transition">
                <ShoppingCart className="w-4 h-4" /> {t("orders.goToMarket")}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="glass-card rounded-lg p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}>
                <div className="flex items-center gap-3">
                  {o.products?.image_url ? (
                    <img src={o.products.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <span className="text-2xl">{o.products?.image_emoji || "📦"}</span>
                  )}
                  <div>
                    <div className="text-sm font-medium text-foreground">{o.products?.name || "—"}</div>
                    <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-2 flex-wrap">
                      {new Date(o.created_at).toLocaleDateString()} • {o.amount} LTC
                      {o.products?.type === "physical" && (
                        <span className="flex items-center gap-1 text-primary">
                          {deliveryIcon(o.delivery_method)}
                          {o.delivery_method === "dead_drop" ? t("delivery.deadDrop") : o.delivery_method === "mailbox" ? t("delivery.mailbox") : t("delivery.cargo")}
                        </span>
                      )}
                      {disputedOrders.has(o.id) && (
                        <span className="px-1.5 py-0.2 bg-red-600/10 border border-red-600/20 rounded text-[7.5px] font-black text-red-500 uppercase tracking-widest animate-pulse">
                           UYUŞMAZLIK AÇIK
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {["paid","shipped","delivered","completed"].includes(o.status) && (
                    <OrderChatButton orderId={o.id} label={t("orders.chatBtn")} />
                  )}
                  {role === "buyer" && o.status === "pending" && (
                    <button onClick={(e) => { e.stopPropagation(); cancelOrder(o.id); }} className="flex items-center gap-1 px-2 py-1 bg-red-600/80 text-white text-[10px] font-mono rounded hover:bg-red-700 cursor-pointer">
                      <X className="w-3 h-3" /> {t("orders.cancel")}
                    </button>
                  )}
                  {role === "buyer" && o.status === "shipped" && !disputedOrders.has(o.id) && (
                    <button onClick={(e) => { e.stopPropagation(); confirmDelivery(o.id); }} className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-[10px] font-mono rounded hover:bg-green-700 cursor-pointer">
                      <CheckCircle className="w-3 h-3" /> {t("orders.confirmDelivery")}
                    </button>
                  )}
                  {role === "buyer" && (o.status === "completed" || o.status === "delivered") && !ratedOrders.has(o.id) && o.products && !disputedOrders.has(o.id) && (
                    <button onClick={(e) => { e.stopPropagation(); setRatingOrder({ id: o.id, vendorId: o.products!.vendor_id, productName: o.products!.name }); }} className="flex items-center gap-1 px-2 py-1 bg-yellow-600 text-white text-[10px] font-mono rounded hover:bg-yellow-700 cursor-pointer">
                      <Star className="w-3 h-3" /> {t("orders.rateVendor")}
                    </button>
                  )}
                  {role === "buyer" && ["paid", "shipped", "delivered"].includes(o.status) && !disputedOrders.has(o.id) && o.products && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setDisputeOrder({ 
                          id: o.id, 
                          vendorId: o.products!.vendor_id, 
                          productName: o.products!.name, 
                          amount: o.amount 
                        }); 
                      }} 
                      className="flex items-center gap-1 px-2 py-1 bg-red-950/40 border border-red-500/20 text-red-500 text-[10px] font-mono rounded hover:bg-red-900/40 cursor-pointer"
                    >
                      <ShieldAlert className="w-3 h-3 animate-pulse" /> Uyuşmazlık Başlat
                    </button>
                  )}
                  {disputedOrders.has(o.id) && (
                    <Link to="/disputes" className="flex items-center gap-1 px-2 py-1 bg-red-600/10 border border-red-600/20 text-red-500 text-[10px] font-mono rounded hover:bg-red-600 hover:text-white transition-all cursor-pointer font-bold">
                      Uyuşmazlığa Git
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <OrderStatusTimeline status={disputedOrders.has(o.id) ? "disputed" : o.status} />
              </div>

              {expandedOrder === o.id && o.products?.type === "physical" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border">
                  <OrderDeliveryInfo orderId={o.id} deliveryMethod={o.delivery_method} />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
      {ratingOrder && (
        <RateOrderDialog
          orderId={ratingOrder.id}
          vendorId={ratingOrder.vendorId}
          productName={ratingOrder.productName}
          onClose={() => setRatingOrder(null)}
          onRated={() => setRatedOrders((prev) => new Set([...prev, ratingOrder.id]))}
        />
      )}
      {disputeOrder && (
        <CreateDisputeDialog
          orderId={disputeOrder.id}
          vendorId={disputeOrder.vendorId}
          productName={disputeOrder.productName}
          amount={disputeOrder.amount}
          onClose={() => setDisputeOrder(null)}
          onCreated={() => setDisputedOrders((prev) => new Set([...prev, disputeOrder.id]))}
        />
      )}
    </PageShell>
  );
}
