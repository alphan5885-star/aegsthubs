import { useState } from "react";
import { Flame, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { useNavigate } from "@/lib/router-shim";
import { useI18n } from "@/lib/i18n";

export default function PanicButton() {
  const [armed, setArmed] = useState(false);
  const [wiping, setWiping] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  const execute = async () => {
    setWiping(true);
    try {
      const { data, error } = await supabase.rpc("panic_wipe_user" as any);
      if (error) throw error;
      const res = data as {
        success: boolean;
        rooms_destroyed?: number;
        orders_cancelled?: number;
        error?: string;
      };
      if (!res?.success) throw new Error(res?.error || "Panic failed");

      toast.success(
        `🔥 ${t("panic.success" as any).replace("{rooms}", String(res.rooms_destroyed ?? 0)).replace("{orders}", String(res.orders_cancelled ?? 0))}`,
      );

      // Nuke client-side state
      try {
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
          const name = c.split("=")[0].trim();
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        });
      } catch {
        void 0;
      }

      await logout();
      navigate("/", { replace: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("panic.unknownError" as any);
      toast.error(`${t("panic.failed" as any)}: ${msg}`);
      setWiping(false);
      setArmed(false);
    }
  };

  return (
    <div className="glass-card rounded-lg p-4 border border-destructive/40 bg-destructive/5">
      <div className="flex items-start gap-3 mb-3">
        <Flame className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-mono font-bold text-destructive">{t("panic.title" as any)}</div>
          <div className="text-[11px] text-muted-foreground font-mono leading-relaxed mt-1">
            {t("panic.desc" as any)} <span className="text-destructive">{t("panic.irreversible" as any)}</span>
          </div>
        </div>
      </div>

      {!armed ? (
        <button
          onClick={() => setArmed(true)}
          className="w-full px-3 py-2 bg-destructive/15 text-destructive text-xs font-mono rounded hover:bg-destructive/25 transition-colors flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-3.5 h-3.5" /> {t("panic.armBtn" as any)}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={execute}
            disabled={wiping}
            className="flex-1 px-3 py-2 bg-destructive text-destructive-foreground text-xs font-mono font-bold rounded animate-pulse disabled:opacity-50"
          >
            {wiping ? t("panic.wiping" as any) : t("panic.confirmBtn" as any)}
          </button>
          <button
            onClick={() => setArmed(false)}
            disabled={wiping}
            className="px-3 py-2 bg-secondary text-muted-foreground text-xs font-mono rounded"
          >
            {t("cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
