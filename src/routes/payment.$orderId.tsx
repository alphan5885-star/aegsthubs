import { createFileRoute } from "@tanstack/react-router";
import { useParams } from "@/lib/router-shim";
import { Protected } from "@/lib/Protected";
import PaymentMethodPage from "@/pages/PaymentMethod";
import { getOrderDetailsFn } from "@/lib/escrowFns";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/payment/$orderId")({
  component: () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchOrder = async () => {
        try {
          if (orderId) {
            const data = await getOrderDetailsFn({ data: { orderId } });
            setOrder(data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    }, [orderId]);

    if (loading) {
      return (
        <Protected roles={["buyer", "vendor", "admin"]}>
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </Protected>
      );
    }

    if (!order) {
      return (
        <Protected roles={["buyer", "vendor", "admin"]}>
          <div className="text-center py-20 text-red-500 font-mono">
            Sipariş bulunamadı veya geçersiz.
          </div>
        </Protected>
      );
    }

    return (
      <Protected roles={["buyer", "vendor", "admin"]}>
        <PaymentMethodPage
          orderId={orderId ?? "unknown-order"}
          amount={Number(order.total_amount) || Number(order.amount) || 0}
          productTitle={order.product_title || `Sipariş: ${orderId}`}
        />
      </Protected>
    );
  },
});
