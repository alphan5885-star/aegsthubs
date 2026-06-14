import { useState, useEffect } from "react";
import { useSecurity } from "@/lib/securityContext";
import { useStealth } from "@/lib/stealthContext";
import { checkConnectionStatus } from "@/lib/canvasNoise";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
  EyeOff,
  Wifi,
  WifiOff,
  Signal,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function SecurityHud() {
  const { threatLevel, events, blocked, unblock } = useSecurity();
  const { isStealth } = useStealth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [connection, setConnection] = useState({
    online: true,
    type: "unknown",
    downlink: 0,
    rtt: 0,
  });

  useEffect(() => {
    setConnection(checkConnectionStatus());
    const interval = setInterval(
      () => setConnection(checkConnectionStatus()),
      5000,
    );
    return () => clearInterval(interval);
  }, []);

  const Icon =
    threatLevel === "danger"
      ? ShieldAlert
      : threatLevel === "warn"
        ? Shield
        : ShieldCheck;
  const color =
    threatLevel === "danger"
      ? "text-destructive border-destructive/50"
      : threatLevel === "warn"
        ? "text-yellow-500 border-yellow-500/50"
        : "text-primary border-primary/30";

  return (
    <>
      {blocked && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur z-[100] flex items-center justify-center p-4">
          <div className="glass-card neon-border rounded-lg p-6 max-w-sm text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="font-mono font-bold text-destructive">
              {t("hud.suspiciousActivity" as any)}
            </h2>
            <p className="text-xs font-mono text-muted-foreground">
              {t("hud.botDetected" as any)}
            </p>
            <button
              onClick={unblock}
              className="px-4 py-2 bg-primary text-primary-foreground rounded font-mono text-xs hover:opacity-90"
            >
              {t("hud.imHuman" as any)}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        title={`${t("hud.statusTitle" as any)}: ${threatLevel}`}
        className={`fixed bottom-4 left-4 z-40 w-10 h-10 rounded-full bg-card border ${color} flex items-center justify-center hover:scale-110 transition-transform`}
      >
        <Icon className="w-5 h-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-background/80 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass-card neon-border rounded-lg p-5 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Connection Status */}
            <div className="flex items-center justify-between gap-2 mb-3 p-2 rounded bg-secondary/30 border border-border">
              <div className="flex items-center gap-1.5">
                {connection.online ? (
                  <Wifi className="w-3 h-3 text-green-500" />
                ) : (
                  <WifiOff className="w-3 h-3 text-destructive" />
                )}
                <span className="text-[10px] font-mono">
                  {connection.online
                    ? `${connection.type.toUpperCase()}`
                    : "OFFLINE"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Signal className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {connection.downlink > 0 ? `${connection.downlink}Mbps` : "-"}
                </span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                {connection.rtt > 0 ? `${connection.rtt}ms` : ""}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono font-bold text-primary flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t("hud.securityEvents" as any)}
              </h3>
              {isStealth && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono text-blue-500 uppercase">
                  <EyeOff className="w-3 h-3" />
                  {t("hud.stealthActive" as any)}
                </div>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {events.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground text-center py-4">
                {t("hud.noEvents" as any)}
              </p>
            ) : (
              <div className="space-y-1">
                {events.map((e) => (
                  <div
                    key={e.id}
                    className={`text-[11px] font-mono p-2 rounded border ${
                      e.level === "danger"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : e.level === "warn"
                          ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
                          : "border-border bg-secondary/30 text-muted-foreground"
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="font-bold">{e.type}</span>
                      <span>{new Date(e.at).toLocaleTimeString("tr-TR")}</span>
                    </div>
                    {e.detail && <div className="opacity-80">{e.detail}</div>}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] font-mono text-muted-foreground mt-3 pt-3 border-t border-border">
              {t("hud.frontendNote" as any)}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
