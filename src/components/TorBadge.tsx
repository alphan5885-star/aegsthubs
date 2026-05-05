import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

/**
 * Tarayıcı .onion üzerindeyse "TOR" rozeti gösterir.
 * Clearnet'te ise küçük gri "CLEARNET" yazısı.
 */
export default function TorBadge({ collapsed }: { collapsed?: boolean }) {
  const [isOnion, setIsOnion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnion(window.location.hostname.endsWith(".onion"));
  }, []);

  if (collapsed) {
    return (
      <div
        title={isOnion ? "Tor üzerinden bağlısın" : "Clearweb — anonim mod aktif"}
        className={`flex items-center justify-center py-1.5 rounded text-[9px] font-mono ${
          isOnion ? "bg-primary/10 text-primary border border-primary/40" : "text-muted-foreground animate-pulse"
        }`}
      >
        {isOnion ? "🧅" : "🕵️"}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between px-2 py-1.5 rounded text-[10px] font-mono ${
        isOnion
          ? "bg-primary/10 text-primary border border-primary/40"
          : "bg-secondary/30 text-muted-foreground border border-border"
      }`}
    >
      <span className="flex items-center gap-1.5">
        {isOnion ? <span>🧅</span> : <span className="animate-pulse">🕵️</span>}
        <span>{isOnion ? "TOR" : "ANONIM"}</span>
      </span>
      <span className="text-[9px] opacity-60">{isOnion ? "onion" : "clearweb"}</span>
    </div>
  );
}
