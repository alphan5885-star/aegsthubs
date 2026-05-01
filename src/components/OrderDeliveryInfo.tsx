import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Truck, MapPin, Mail, Navigation, Lock, Copy } from "lucide-react";
import DeadDropMap from "./DeadDropMap";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface Props {
  orderId: string;
  deliveryMethod: string;
  isVendor?: boolean;
}

export default function OrderDeliveryInfo({ orderId, deliveryMethod }: Props) {
  const { t } = useI18n();
  const [tracking, setTracking] = useState<any>(null);
  const [deadDrop, setDeadDrop] = useState<any>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const fetchData = async () => {
      try {
        if (deliveryMethod === "cargo") {
          const { data } = await supabase
            .from("shipping_tracking")
            .select("*")
            .eq("order_id", orderId)
            .maybeSingle();
          if (isMounted.current && data) setTracking(data);
        }
        if (deliveryMethod === "dead_drop") {
          const { data } = await supabase
            .from("dead_drop_locations")
            .select("*")
            .eq("order_id", orderId)
            .maybeSingle();
          if (isMounted.current && data) setDeadDrop(data);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error("delivery info:", e);
      }
    };
    fetchData();
    return () => { isMounted.current = false; };
  }, [orderId, deliveryMethod]);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast.success(t("copied")));
  };

  if (deliveryMethod === "cargo") {
    if (!tracking)
      return (
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-2">
          <Truck className="w-3 h-3" /> {t("delivery.waiting")}
        </div>
      );
    const isEncrypted = !!tracking.pgp_encrypted_tracking;
    return (
      <div className="mt-2 bg-secondary/50 rounded p-2 space-y-1.5">
        <div className="flex items-center gap-2 text-[10px] font-mono text-orange-400">
          <Truck className="w-3 h-3" /> {String(tracking.carrier || "").toUpperCase()}
          {tracking.country_from && tracking.country_to && (
            <span className="text-muted-foreground">· {tracking.country_from} → {tracking.country_to}</span>
          )}
        </div>
        {isEncrypted ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-[9px] font-mono text-green-400">
              <Lock className="w-3 h-3" /> {t("delivery.encryptedTracking")}
            </div>
            <div className="bg-background/50 rounded p-1.5 text-[8px] font-mono text-muted-foreground break-all max-h-20 overflow-y-auto">
              {tracking.pgp_encrypted_tracking}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] font-mono text-muted-foreground">{t("delivery.decryptHint")}</span>
              <button onClick={() => copy(tracking.pgp_encrypted_tracking)} className="text-[9px] font-mono text-primary flex items-center gap-1">
                <Copy className="w-3 h-3" /> {t("copy")}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-[10px] font-mono text-foreground">{tracking.tracking_number}</div>
        )}
        {tracking.notes && (
          <div className="text-[9px] font-mono text-muted-foreground">{tracking.notes}</div>
        )}
        <div className="text-[9px] font-mono text-muted-foreground">{t("status")}: {tracking.status}</div>
      </div>
    );
  }

  if (deliveryMethod === "dead_drop") {
    if (!deadDrop)
      return (
        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-2">
          <MapPin className="w-3 h-3" /> {t("delivery.waiting")}
        </div>
      );
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-mono text-green-400">
          <MapPin className="w-3 h-3" /> {t("orders.deadDropInfo")}
        </div>
        {deadDrop.latitude && deadDrop.longitude && (
          <DeadDropMap mode="view" latitude={Number(deadDrop.latitude)} longitude={Number(deadDrop.longitude)} />
        )}
        {deadDrop.description && (
          <div className="text-[10px] font-mono text-muted-foreground bg-secondary/50 rounded p-2">
            <Navigation className="w-3 h-3 inline mr-1" />
            {deadDrop.description}
          </div>
        )}
        {deadDrop.pgp_encrypted_data && (
          <div className="bg-background/50 rounded p-1.5 text-[8px] font-mono text-muted-foreground break-all max-h-24 overflow-y-auto">
            <Lock className="w-3 h-3 inline mr-1" /> {deadDrop.pgp_encrypted_data}
          </div>
        )}
      </div>
    );
  }

  if (deliveryMethod === "mailbox") {
    return (
      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mt-2">
        <Mail className="w-3 h-3" /> {t("delivery.mailbox")}
      </div>
    );
  }

  return null;
}
