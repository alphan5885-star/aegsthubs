import { useState, useEffect } from "react";
import { useSecurity } from "@/lib/securityContext";
import { ShieldCheck, X, Wifi, Terminal, EyeOff, ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Redesigned Top HUD Bar: Replaces the flat yellow banner with an ultra-premium 
 * cyber security glassmorphic status monitor.
 */
export default function TorWarningBanner() {
  const { isTor } = useSecurity();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [latency, setLatency] = useState(42);

  useEffect(() => {
    setIsMounted(true);
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 15) + 30);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!isMounted || dismissed) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-[#020202]/85 backdrop-blur-xl border-b border-white/[0.04] shadow-[0_4px_30px_rgba(0,0,0,0.5)] animate-fade-in font-mono text-[9px] select-none">
      <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4 text-zinc-400">
        
        {/* Left Side: Connection Status HUD */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-500 font-black tracking-widest uppercase text-[8px]">
              {t("tor.signalOk" as any)}
            </span>
          </div>

          <span className="hidden md:inline-block text-zinc-800">|</span>

          <div className="hidden sm:flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-red-500" />
            <span>{t("tor.network" as any)} <strong className="text-white">{t("tor.networkValue" as any)}</strong></span>
          </div>

          <span className="hidden sm:inline-block text-zinc-800">|</span>

          <div className="flex items-center gap-1.5">
            <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-400">
              {t("tor.traceProtection" as any)} <strong className="text-zinc-200">{t("tor.traceValue" as any)}</strong>
            </span>
          </div>
        </div>

        {/* Center Banner: Interactive Cyber Advice */}
        <div className="hidden lg:flex items-center gap-2 text-zinc-500 truncate max-w-[500px]">
          <Terminal className="w-3 h-3 text-red-500 shrink-0" />
          <span className="truncate">
            <span className="text-zinc-400">{t("tor.advice" as any).split(":")[0]}:</span> {t("tor.advice" as any).split(":").slice(1).join(":").trim()}
          </span>
        </div>

        {/* Right Side: Latency + Dismiss */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Latency Indicator */}
          <div className="flex items-center gap-1 text-[8px] text-zinc-500">
            <span>{t("tor.ping" as any)}</span>
            <span className="text-emerald-500 font-bold">{latency}ms</span>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md bg-white/[0.02] border border-white/5 hover:border-red-500/20 text-zinc-500 hover:text-white transition-colors cursor-pointer"
            aria-label={t("tor.close" as any)}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
