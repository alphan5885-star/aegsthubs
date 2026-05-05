import { useState, useEffect } from "react";
import { useSecurity } from "@/lib/securityContext";
import { ShieldAlert, X } from "lucide-react";

/**
 * Clearnet üzerindeyken üstte "anonim mod" uyarısı gösterir.
 * Artık .onion'a yönlendirme yapmaz — clearweb odaklı, dalgacı bir ton kullanır.
 */
export default function TorWarningBanner() {
  const { isTor } = useSecurity();
  const [dismissed, setDismissed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isTor || dismissed) return null;
  if (typeof window === "undefined") return null;
  if (window.location.hostname.endsWith(".onion")) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-gradient-to-r from-primary/10 via-yellow-500/10 to-primary/10 border-b border-yellow-500/40 backdrop-blur-md animate-fade-in">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2 text-[11px] font-mono text-yellow-500">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 animate-pulse" />
        <span className="flex-1 flex items-center gap-1.5 flex-wrap">
          <span className="inline-block animate-bounce" style={{ animationDuration: "1.6s" }}>
            😈
          </span>
          <strong>ANONIM MOD</strong>
          <span className="opacity-90">
            — clearweb'desin ama izini sürmek o kadar da kolay değil. VPN + temiz tarayıcı + ağzını
            sıkı tut, gerisini biz hallederiz.
          </span>
          <span className="inline-block animate-pulse">🕵️</span>
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-500/70 hover:text-yellow-500 transition-colors"
          aria-label="Kapat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
