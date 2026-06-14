import {
  CheckCircle2,
  Circle,
  Clock,
  Truck,
  Package,
  Award,
  XCircle,
  ShieldAlert,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

const STEPS = ["pending", "paid", "shipped", "delivered", "completed"] as const;
type Status = (typeof STEPS)[number] | "cancelled" | "disputed";

const ICONS: Record<string, any> = {
  pending: Clock,
  paid: CheckCircle2,
  shipped: Truck,
  delivered: Package,
  completed: Award,
};

export default function OrderStatusTimeline({ status }: { status: string }) {
  const { t } = useI18n();
  const s = status as Status;

  if (s === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-[11px] font-mono text-red-400 bg-red-500/10 rounded p-2">
        <XCircle className="w-4 h-4" /> {t("status.cancelled" as any)}
      </div>
    );
  }

  if (s === "disputed") {
    return (
      <div className="flex items-center gap-2 text-[11px] font-mono text-red-500 bg-red-950/20 border border-red-500/10 rounded-xl p-3 uppercase font-bold tracking-wide">
        <ShieldAlert className="w-4 h-4 animate-pulse text-red-500" />{" "}
        {t("timeline.disputeActive" as any)}
      </div>
    );
  }

  const currentIdx = STEPS.indexOf(s as any);

  return (
    <div className="flex items-center justify-between w-full py-2">
      {STEPS.map((step, idx) => {
        const Icon = ICONS[step] || Circle;
        const done = idx <= currentIdx;
        const active = idx === currentIdx;
        return (
          <div
            key={step}
            className="flex flex-col items-center flex-1 relative"
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                done
                  ? active
                    ? "bg-primary border-primary text-primary-foreground animate-pulse"
                    : "bg-primary/20 border-primary text-primary"
                  : "bg-secondary border-border text-muted-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span
              className={`text-[9px] font-mono mt-1 ${
                done ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t(("status." + step) as any)}
            </span>
            {idx < STEPS.length - 1 && (
              <div
                className={`absolute top-3.5 left-[60%] w-[80%] h-0.5 ${
                  idx < currentIdx ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
