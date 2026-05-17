import { useSessionTimer } from "@/lib/sessionTimerContext";
import { Clock } from "lucide-react";

function fmt(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((t % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function SessionTimerBadge() {
  const { remainingMs, expiresAt } = useSessionTimer();
  if (!expiresAt) return null;

  const critical = remainingMs > 0 && remainingMs <= 5 * 60_000;

  return (
    <div
      className={`flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-wider ${
        critical
          ? "text-red-500 animate-pulse"
          : "text-zinc-400 hover:text-white transition-colors"
      }`}
      title="Kalan Oturum Süresi"
    >
      <Clock className="w-3 h-3 text-red-600 shrink-0" />
      <span>{fmt(remainingMs)}</span>
    </div>
  );
}
