import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { useSessionTimer } from "@/lib/sessionTimerContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  ArrowRight,
  User,
  Database,
  Terminal,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MathCaptcha from "@/components/MathCaptcha";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type Mode = "login" | "signup";
type Role = "vendor" | "buyer";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("vendor");
  const [withdrawPin, setWithdrawPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);

  const { login, signup } = useAuth();
  const { startSession } = useSessionTimer();
  const { t } = useI18n();

  const toAuthEmail = (name: string) => {
    const username = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "-");
    return `${username || "user"}@local.aeigsthub`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaOk) return;
    setSubmitting(true);
    setError("");

    if (mode === "login") {
      const err = await login(email, password);
      if (err) {
        setError(err);
        setSubmitting(false);
      } else {
        startSession(60);
      }
    } else {
      // Force registration to always be "buyer" for absolute protection against scammers
      const err = await signup(
        toAuthEmail(displayName),
        password,
        displayName.trim(),
        "buyer",
        withdrawPin || undefined,
      );
      if (err) {
        setError(err);
        setSubmitting(false);
      } else {
        setSuccess(t("login.registerSuccess"));
        setMode("login");
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#010101] flex items-center justify-center p-6 font-mono selection:bg-red-600 selection:text-white relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-[0.03] pointer-events-none" />

      <div className="absolute top-8 right-8 z-50">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[420px] obsidian-card no-transition p-10 rounded-[48px] border-2 border-white/5 relative z-20"
        style={{ willChange: "opacity, transform, filter" }}
      >
        {/* Branding HUD */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 relative group cursor-pointer">
            <svg
              width="56"
              height="56"
              viewBox="0 0 100 100"
              className="animate-pulse drop-shadow-[0_0_20px_rgba(255,0,0,0.55)] group-hover:scale-110 transition-transform duration-300"
            >
              <rect x="10" y="15" width="12" height="70" fill="#FF0000" />
              <rect x="78" y="15" width="12" height="70" fill="#FF0000" />
              <path
                d="M22 50 L50 20 L78 50 L50 80 Z"
                stroke="#FF0000"
                strokeWidth="12"
                strokeLinejoin="miter"
                fill="none"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
            AEIGST<span className="text-red-600">HUB</span>
          </h1>
          <div className="mt-4 text-center max-w-[340px] space-y-1.5 cursor-default select-none">
            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
              "POLİSTE{" "}
              <span className="text-white drop-shadow-md">
                'BEN SADECE PAZAR YORUMU YAPIYORDUM HAKİM BEY'
              </span>{" "}
              DEMEK YOK KARDEŞ! 🤫"
            </p>
            <p
              className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"
              style={{ animationDuration: "3s" }}
            >
              AĞZINI SIKI TUT, 2FA KUR, RAHATINA BAK!
            </p>
          </div>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex gap-2 p-1.5 bg-white/[0.02] border border-white/5 mb-8 rounded-2xl">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl ${mode === "login" ? "bg-red-600 text-white shadow-[0_10px_20px_hsla(var(--primary),0.2)]" : "text-zinc-700 hover:text-white"}`}
          >
            {t("login.loginTab")}
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl ${mode === "signup" ? "bg-red-600 text-white shadow-[0_10px_20px_hsla(var(--primary),0.2)]" : "text-zinc-700 hover:text-white"}`}
          >
            {t("login.signupTab")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] text-zinc-900 font-black uppercase tracking-widest px-2">
                KİMLİK_KODU
              </label>
              <div className="relative group">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-600 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                <input
                  value={mode === "login" ? email : displayName}
                  onChange={(e) =>
                    mode === "login"
                      ? setEmail(e.target.value)
                      : setDisplayName(e.target.value)
                  }
                  className="w-full bg-[#050505] border-2 border-white/5 rounded-2xl pl-12 pr-4 py-4 text-[11px] text-white focus:outline-none focus:border-red-600/50 transition-all font-black uppercase"
                  placeholder={mode === "login" ? "EMAIL_OR_ID" : "USERNAME"}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] text-zinc-900 font-black uppercase tracking-widest px-2">
                ERİŞİM_ANAHTARI
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-600 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#050505] border-2 border-white/5 rounded-2xl pl-12 pr-12 py-4 text-[11px] text-white focus:outline-none focus:border-red-600/50 transition-all font-black tracking-widest"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-800 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4 pt-2 overflow-hidden"
              >
                {/* Info Text about registration */}
                <div className="p-3 bg-red-600/5 border border-red-600/10 rounded-xl text-[8px] text-zinc-400 font-bold leading-normal uppercase">
                  🛡️ GÜVENLİK UYARISI: TÜM YENİ HESAPLAR OTOMATİK OLARAK "ALICI"
                  (BUYER) OLARAK AÇILIR. SATICI OLMAK İÇİN DAHA SONRA KİMLİK
                  DOĞRULAMA VE SATICI TEMİNATI (BOND) BAŞVURUSU YAPILMALIDIR.
                </div>

                {/* Withdraw PIN Input */}
                <div className="space-y-1.5">
                  <label className="text-[9px] text-zinc-900 font-black uppercase tracking-widest px-2">
                    GÜVENLİK PIN KODU (6 HANE)
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-600 opacity-20 group-focus-within:opacity-100 transition-opacity" />
                    <input
                      type="password"
                      value={withdrawPin}
                      onChange={(e) =>
                        setWithdrawPin(
                          e.target.value.replace(/[^0-9]/g, "").slice(0, 6),
                        )
                      }
                      className="w-full bg-[#050505] border-2 border-white/5 rounded-2xl pl-12 pr-4 py-4 text-[11px] text-white focus:outline-none focus:border-red-600/50 transition-all font-black tracking-widest"
                      placeholder="E.G. 123456"
                      maxLength={6}
                      required={mode === "signup"}
                    />
                  </div>
                  <p className="text-[7px] text-zinc-800 font-bold uppercase tracking-wider px-2">
                    * PARA ÇEKME VE HASSAS İŞLEMLERDE KULLANILACAKTIR.
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="scale-90 origin-left">
            <MathCaptcha onValidChange={setCaptchaOk} label="SİSTEM_PUZZLE" />
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 bg-red-600/5 border border-red-600/20 text-red-600 text-[8px] font-black uppercase text-center flex items-center gap-2 justify-center rounded-xl"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> ERROR: {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={submitting || !captchaOk}
            className="w-full bg-red-600 text-white py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.4em] hover:bg-red-700 transition-all disabled:opacity-20 shadow-[0_15px_30px_hsla(var(--primary),0.2)] flex items-center justify-center gap-3 active:scale-95 duration-500"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            {mode === "login" ? t("login.loginBtn") : t("login.registerBtn")}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-white/5 flex justify-between text-[7px] text-zinc-900 font-black uppercase tracking-[0.5em]">
          <span>X_NODE_ENCRYPTED</span>
          <span>LATENCY: 12ms</span>
        </div>
      </motion.div>
    </div>
  );
}
