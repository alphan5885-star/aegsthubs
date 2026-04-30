import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Award, ShieldCheck } from "lucide-react";

type Rep = { avg_rating: number; total_ratings: number; completed_orders: number };

export default function VendorReputationBadge({ vendorId }: { vendorId: string }) {
  const [rep, setRep] = useState<Rep | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("vendor_reputation")
        .select("avg_rating,total_ratings,completed_orders")
        .eq("vendor_id", vendorId)
        .maybeSingle();
      if (data) setRep(data as Rep);
    })();
  }, [vendorId]);

  if (!rep) return null;

  const tier =
    rep.completed_orders >= 100 && rep.avg_rating >= 4.5
      ? { label: "DIAMOND", color: "text-cyan-400 border-cyan-400/40 bg-cyan-400/10" }
      : rep.completed_orders >= 25 && rep.avg_rating >= 4
        ? { label: "GOLD", color: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10" }
        : rep.completed_orders >= 5
          ? { label: "SILVER", color: "text-slate-300 border-slate-300/40 bg-slate-300/10" }
          : { label: "ROOKIE", color: "text-muted-foreground border-border bg-secondary/30" };

  return (
    <div className="flex items-center gap-2 text-[10px] font-mono">
      <span className={`px-1.5 py-0.5 rounded border ${tier.color} flex items-center gap-1`}>
        <Award className="w-2.5 h-2.5" /> {tier.label}
      </span>
      <span className="flex items-center gap-0.5 text-yellow-400">
        <Star className="w-2.5 h-2.5 fill-current" />
        {Number(rep.avg_rating).toFixed(2)} ({rep.total_ratings})
      </span>
      <span className="flex items-center gap-0.5 text-green-500">
        <ShieldCheck className="w-2.5 h-2.5" />
        {rep.completed_orders}
      </span>
    </div>
  );
}
