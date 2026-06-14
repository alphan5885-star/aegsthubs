import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { X, ShieldAlert, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface CreateDisputeDialogProps {
  orderId: string;
  vendorId: string;
  productName: string;
  amount: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateDisputeDialog({
  orderId,
  vendorId,
  productName,
  amount,
  onClose,
  onCreated,
}: CreateDisputeDialogProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [reason, setReason] = useState("item_not_received");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(t("dispute.loginRequired" as any));
      return;
    }
    if (!details.trim()) {
      toast.error(t("dispute.detailRequired" as any));
      return;
    }

    setSubmitting(true);

    try {
      // Reason display map for user friendly string in product_name or details
      const reasonLabel =
        reason === "item_not_received"
          ? t("dispute.reason1" as any)
          : reason === "wrong_item"
            ? t("dispute.reason2" as any)
            : t("dispute.reason3" as any);

      const { error } = await supabase.from("disputes").insert({
        buyer_id: user.id,
        seller_id: vendorId,
        order_id: orderId,
        product_name: productName,
        amount: amount,
        reason: `${reasonLabel} - Detay: ${details.trim()}`,
        status: "open",
      });

      if (error) {
        toast.error(t("dispute.createError" as any));
        console.error("Dispute error:", error);
        setSubmitting(false);
        return;
      }

      toast.success(t("dispute.createSuccess" as any));
      onCreated();
      onClose();
    } catch (err) {
      toast.error(t("dispute.systemError" as any));
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono select-none">
      <div className="relative w-full max-w-[550px] bg-[#020202]/95 border-2 border-red-600/30 rounded-[32px] p-6 shadow-[0_0_50px_rgba(255,0,0,0.15)] space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/[0.02] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header HUD */}
        <div className="flex items-center gap-3 border-b border-white/[0.04] pb-4">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[6px] text-red-500 font-black tracking-[0.3em] uppercase">
              ESCROW_ARBITRATION
            </span>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              {t("dispute.title" as any)}
            </h2>
          </div>
        </div>

        {/* Order specs HUD */}
        <div className="grid grid-cols-2 gap-4 bg-white/[0.01] border border-white/[0.03] p-4 rounded-2xl text-[9px] uppercase font-bold text-zinc-400">
          <div>
            <span className="text-zinc-600 block text-[7px] tracking-wider">
              SIPARIS_ID
            </span>
            <span className="text-white truncate block">
              {orderId.slice(0, 18)}...
            </span>
          </div>
          <div>
            <span className="text-zinc-600 block text-[7px] tracking-wider">
              URUN / DEGER
            </span>
            <span className="text-white block truncate">
              {productName} ({amount} LTC)
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-[10px]">
          {/* Dispute Reason Selection */}
          <div className="space-y-2">
            <label className="text-zinc-500 font-black uppercase tracking-wider block">
              {t("dispute.reasonLabel" as any)}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: "item_not_received", label: t("dispute.reason1" as any) },
                { id: "wrong_item", label: t("dispute.reason2" as any) },
                {
                  id: "seller_unresponsive",
                  label: t("dispute.reason3" as any),
                },
              ].map((r) => (
                <label
                  key={r.id}
                  className={`flex items-center gap-3 p-3.5 bg-black/40 border rounded-[18px] cursor-pointer transition-all ${
                    reason === r.id
                      ? "border-red-600/40 text-white bg-red-600/[0.02]"
                      : "border-white/[0.04] text-zinc-500 hover:border-white/[0.08]"
                  }`}
                >
                  <input
                    type="radio"
                    name="dispute_reason"
                    checked={reason === r.id}
                    onChange={() => setReason(r.id)}
                    className="accent-red-600"
                  />
                  <span className="font-bold uppercase">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description input */}
          <div className="space-y-2">
            <label className="text-zinc-500 font-black uppercase tracking-wider block">
              {t("dispute.detailsLabel" as any)}
            </label>
            <textarea
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t("dispute.detailsPlaceholder" as any)}
              rows={4}
              className="w-full bg-[#050505] border border-white/5 rounded-[18px] p-4 text-white focus:border-red-600/50 focus:outline-none font-bold resize-none"
            />
          </div>

          <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-[8px] text-yellow-500/80 font-bold uppercase tracking-wide leading-relaxed">
              {t("dispute.warningText" as any)}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red-600 text-white py-4 rounded-[20px] text-[9.5px] font-black uppercase tracking-[0.3em] hover:bg-red-700 transition-all active:scale-95 duration-300 disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? t("dispute.submitting" as any)
              : t("dispute.submitBtn" as any)}
          </button>
        </form>
      </div>
    </div>
  );
}
