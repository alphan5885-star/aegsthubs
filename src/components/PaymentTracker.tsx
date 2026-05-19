import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Coins } from "lucide-react";
import { toast } from "sonner";
import OrderChatRoom from "./OrderChatRoom";
import { useI18n } from "@/lib/i18n";

interface Props {
  orderId: string;
  amount: number;
}

export default function PaymentTracker({ orderId, amount }: Props) {
  const isMounted = useRef(true);
  const { t } = useI18n();
  const [address, setAddress] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState(0);
  const [status, setStatus] = useState<string>("loading");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // 1. Generate LTC payment address on mount
  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
      setGenerating(true);
      try {
        const { data, error } = await supabase.functions.invoke("create-payment-address", {
          body: { order_id: orderId },
        });
        if (!isMounted.current) return;
        if (error || !data?.address) {
          toast.error(t("payment.addressError" as any));
          setStatus("error");
        } else {
          setAddress(data.address);
          setStatus("awaiting_payment");
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error("Catch create-payment-address:", e);
        if (isMounted.current) setStatus("error");
      } finally {
        if (isMounted.current) setGenerating(false);
      }
    };
    init();
    return () => {
      isMounted.current = false;
    };
  }, [orderId]);

  // 2. Poll every 30s
  useEffect(() => {
    if (!address || status === "confirmed") return;
    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-payment-status", {
          body: { order_id: orderId },
        });
        if (!isMounted.current) return;
        if (error) {
          if (import.meta.env.DEV) console.error("Error checking payment status:", error);
          return;
        }
        if (data) {
          setConfirmations(data.confirmations || 0);
          setStatus(data.status || "awaiting_payment");
          if (data.underpaid) {
            toast.error(t("payment.underpaidAlert" as any));
          }
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error("Catch check-payment-status:", e);
      }
    };
    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      clearInterval(interval);
    };
  }, [address, orderId, status]);

  // 3. Once confirmed, fetch chat room id
  useEffect(() => {
    if (status !== "confirmed") return;
    const fetchChatRoom = async () => {
      try {
        const { data, error } = await supabase
          .from("order_chat_rooms")
          .select("id")
          .eq("order_id", orderId)
          .maybeSingle();
        if (!isMounted.current) return;
        if (error) {
          if (import.meta.env.DEV) console.error("Error fetching chat room:", error);
          return;
        }
        if (data) setRoomId(data.id);
      } catch (e) {
        if (import.meta.env.DEV) console.error("Catch fetching chat room:", e);
      }
    };
    fetchChatRoom();
  }, [status, orderId]);

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast.success(t("payment.addressCopied" as any));
  };

  if (generating) {
    return (
      <div className="glass-card rounded-lg p-6 text-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
        <p className="text-sm font-mono text-muted-foreground">
          {t("payment.generating" as any)}
        </p>
      </div>
    );
  }

  if (status === "confirmed" && roomId) {
    return (
      <div className="space-y-3">
        <div className="glass-card rounded-lg p-4 border border-green-500/40 bg-green-500/10">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-mono text-sm font-bold">{t("payment.confirmed" as any)}</span>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-1">
            {t("payment.dmOpened" as any)}
          </p>
        </div>
        <OrderChatRoom roomId={roomId} />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-sm font-bold text-primary">{t("payment.waiting" as any)}</h3>
        <span className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-mono text-primary">
          <Coins className="w-3 h-3" /> LTC
        </span>
      </div>

      <div className="rounded border border-primary/25 bg-primary/10 p-3 text-xs font-mono text-foreground">
        <div className="flex items-center gap-2 font-bold text-primary mb-1">
          <ShieldCheck className="w-4 h-4" /> {t("payment.autoEscrow" as any)}
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {t("payment.autoDesc" as any)}
        </p>
      </div>

      {address && (
        <>
          <div className="flex justify-center bg-secondary p-3 rounded">
            <QRCodeSVG
              value={address}
              size={140}
              bgColor="transparent"
              fgColor="hsl(var(--foreground))"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {t("payment.addressLabel" as any)}
            </label>
            <div className="flex gap-2">
              <code className="flex-1 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5 break-all select-all">
                {address}
              </code>
              <button
                onClick={copy}
                className="p-1.5 rounded border border-border hover:border-primary active:scale-95 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-background/60 border border-border rounded p-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t("payment.amountLabel" as any)}</span>
              <div className="text-right">
                <div className="text-primary font-bold">{amount} LTC</div>
              </div>
            </div>
            {status === "underpaid" && (
              <div className="mt-1 border-t border-border/50 pt-1 text-[10px] text-destructive">
                {t("payment.underpaid" as any)}
              </div>
            )}
            <div className="flex justify-between mt-1 border-t border-border/50 pt-1">
              <span className="text-muted-foreground">{t("payment.confirmations" as any)}</span>
              <span className={`font-bold ${confirmations >= 3 ? "text-green-500" : "text-yellow-500"}`}>
                {Math.min(confirmations, 3)}/3
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2 py-1.5 bg-destructive/10 border border-destructive/40 rounded text-[10px] font-mono text-destructive">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            {t("payment.singleSend" as any)}
          </div>

          <p className="text-[10px] font-mono text-muted-foreground text-center">
            <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
            {t("payment.monitoring" as any)}
          </p>
        </>
      )}
    </div>
  );
}
