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
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MathCaptcha from "@/components/MathCaptcha";
import { useI18n } from "@/lib/i18n";

type Mode = "login" | "signup";
type Role = "vendor" | "buyer";

const SESSION_OPTIONS: { label: string; min: number }[] = [
  { label: "30 dk", min: 30 },
  { label: "1 sa", min: 60 },
  { label: "2 sa", min: 120 },
];

const toAuthEmail = (name: string) => {
  const username = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return `${username || "user"}@local.aeigsthub`;
};

function ParticleField() {
  const [particles, setParticles] = useState<
    { x: number; y1: number; y2: number; dur: number }[]
  >([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: 8 }, () => ({
        x: Math.random() * 1200,
        y1: Math.random() * 900,
        y2: Math.random() * 900,
        dur: 5 + Math.random() * 5,
      })),
    );
  }, []);
  if (particles.length === 0) return null;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          initial={{ x: p.x, y: p.y1, opacity: 0 }}
          animate={{ y: [p.y1, p.y2], opacity: [0, 0.5, 0] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: i * 0.6 }}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("buyer");
  const [withdrawPin, setWithdrawPin] = useState("");
  const [pgpKey, setPgpKey] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [antiPhishingCode, setAntiPhishingCode] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [captchaOk, setCaptchaOk] = useState(false);
  const [sessionMin, setSessionMin] = useState<number>(() => {
    if (typeof window === "undefined") return 60;
    const v = window.localStorage.getItem("session_duration_min");
    return v ? Number(v) : 60;
  });
const { login, signup, mfaChallenge, verifyMfa, user } = useAuth();
  const { startSession } = useSessionTimer();
  const { t } = useI18n();

  // Fetch anti-phishing code from database on mount
  useEffect(() => {
    if (!user) return;
    const fetchPhishingCode = async () => {
      try {
        const { data, error } = await supabase
          .from("anti_phishing_codes")
          .select("code")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data?.code) {
          setAntiPhishingCode(data.code);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchPhishingCode();
  }, [user]);

  const passwordRules = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    number: /\d/.test(password),
    match: password.length > 0 && password === passwordConfirm,
  };
  const passwordReady =
    passwordRules.length && passwordRules.letter && passwordRules.number && passwordRules.match;

  useEffect(() => {
    if (mode !== "login" || !email || !email.includes("@")) {
      setAntiPhishingCode(null);
      return;
    }
    const timer = setTimeout(() => setAntiPhishingCode(null), 500);
    return () => clearTimeout(timer);
  }, [email, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!captchaOk) {
      setError(t("login.captchaRequired"));
      return;
    }
    setSubmitting(true);

    if (mode === "login") {
      const err = await login(email, password);
      if (err === "MFA_REQUIRED") {
        setSubmitting(false);
        return;
      }
      if (err) {
        setError(err);
        setSubmitting(false);
      } else {
        startSession(sessionMin);
      }
    } else {
      if (displayName.trim().length < 3) {
        setError(t("login.usernameMin"));
        setSubmitting(false);
        return;
      }
      if (!passwordReady) {
        setError(t("login.passwordSteps"));
        setSubmitting(false);
        return;
      }
      if (withdrawPin && !/^\d{6}$/.test(withdrawPin)) {
        setError(t("login.pinFormat"));
        setSubmitting(false);
        return;
      }
      const err = await signup(
        toAuthEmail(displayName),
        password,
        displayName.trim(),
        role,
        withdrawPin || undefined,
        pgpKey || undefined,
      );
      if (err) {
        setError(err);
        setSubmitting(false);
      } else {
        setSuccess(t("login.registerSuccess"));
        setMode("login");
        setEmail(displayName.trim());
        setPassword("");
        setPasswordConfirm("");
        setWithdrawPin("");
        setPgpKey("");
        setSubmitting(false);
      }
    }
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length !== 6) return;
    setSubmitting(true);
    setError("");
    const err = await verifyMfa(mfaCode);
    if (err) {
      setError(err);
      setMfaCode("");
    } else {
      startSession(sessionMin);
    }
    setSubmitting(false);
  };

  if (mfaChallenge) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,51,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,51,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center mb-8">
            <Lock className="w-14 h-14 text-primary mx-auto mb-3 animate-pulse" />
            <h1 className="text-2xl font-mono font-bold text-primary neon-text">{t("login.twoFaTitle")}</h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {t("login.twoFaSubtitle")}
            </p>
          </div>
          <div className="glass-card rounded-lg p-6 space-y-4 neon-border">
            <div>
              <label className="text-xs text-muted-foreground font-mono mb-2 block">
                {t("login.verifyCode")}
              </label>
              <input
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full bg-secondary border border-border rounded px-3 py-4 text-center text-2xl font-mono text-foreground tracking-[0.8em] focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleMfaVerify()}
              />
            </div>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-destructive text-xs font-mono bg-destructive/10 rounded px-3 py-2"
                >
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={handleMfaVerify}
              disabled={mfaCode.length !== 6 || submitting}
              className="w-full bg-primary text-primary-foreground py-3 rounded font-mono text-sm font-bold neon-glow-btn disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {t("login.verify")}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <ParticleField />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,51,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,51,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            <Shield className="w-14 h-14 text-primary mx-auto mb-3 animate-pulse" />
          </motion.div>
          <h1 className="text-3xl font-mono font-bold text-primary neon-text tracking-wider">
            aeigsthub
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            anonim 1ll3g4l marketplace :)
          </p>
        </div>

        {antiPhishingCode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-3 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <Fingerprint className="w-4 h-4 text-green-500" />
            <div>
              <div className="text-[10px] text-green-500 font-mono">Anti-Phishing {t("confirm")}:</div>
              <div className="text-sm font-mono font-bold text-green-400">{antiPhishingCode}</div>
            </div>
          </motion.div>
        )}

        <div className="flex gap-1 p-1 bg-secondary rounded-lg mb-4 relative">
          {(["login", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError("");
                setSuccess("");
                setPassword("");
                setPasswordConfirm("");
              }}
              className={`flex-1 py-2 text-xs font-mono rounded-md transition-all relative z-10 ${mode === m ? "bg-primary text-primary-foreground neon-glow-btn font-bold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m === "login" ? t("login.loginTab") : t("login.signupTab")}
            </button>
          ))}
        </div>

        <div className="mb-4 glass-card rounded-lg p-3 neon-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {t("login.sessionDuration")}
            </span>
          </div>
          <div className="flex gap-1">
            {SESSION_OPTIONS.map((opt) => (
              <button
                key={opt.min}
                type="button"
                onClick={() => setSessionMin(opt.min)}
                className={`flex-1 py-1.5 text-[11px] font-mono rounded transition-all ${
                  sessionMin === opt.min
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-lg p-6 space-y-4 neon-border">
          <AnimatePresence mode="wait">
            {mode === "signup" && (
              <motion.div
                key="signup-fields"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 overflow-hidden"
              >
                <div>
                  <label className="text-xs text-muted-foreground font-mono mb-1 block">
                    {t("login.displayNameLabel")}
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required={mode === "signup"}
                    minLength={3}
                    autoComplete="username"
                    placeholder={t("login.usernamePlaceholder")}
                  />
                </div>
                <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                  {(["buyer", "vendor"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`flex-1 py-2 text-xs font-mono rounded-md transition-all ${role === r ? "bg-primary text-primary-foreground neon-glow-btn font-bold" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {r === "buyer" ? t("login.buyerRole") : t("login.vendorRole")}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {mode === "login" && (
            <div>
              <label className="text-xs text-muted-foreground font-mono mb-1 block">
                {t("login.usernameLabel")}
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t("login.usernamePlaceholder2")}
                required
                autoComplete="username"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground font-mono mb-1 block">{t("login.passwordLabel")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2.5 pr-10 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
                minLength={mode === "signup" ? 8 : 6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div className="space-y-3 rounded border border-border bg-secondary/30 p-3">
              <div>
                <label className="text-xs text-muted-foreground font-mono mb-1 block">
                  {t("login.passwordRepeat")}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <span className={passwordRules.length ? "text-green-500" : "text-muted-foreground"}>
                  1. {t("login.passRule1")}
                </span>
                <span className={passwordRules.letter ? "text-green-500" : "text-muted-foreground"}>
                  2. {t("login.passRule2")}
                </span>
                <span className={passwordRules.number ? "text-green-500" : "text-muted-foreground"}>
                  3. {t("login.passRule3")}
                </span>
                <span className={passwordRules.match ? "text-green-500" : "text-muted-foreground"}>
                  4. {t("login.passRule4")}
                </span>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {mode === "signup" && (
              <motion.div
                key="security-fields"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 overflow-hidden"
              >
                <div>
                  <label className="text-xs text-muted-foreground font-mono mb-1 block">
                    {t("login.withdrawPinLabel")}
                  </label>
                  <input
                    inputMode="numeric"
                    value={withdrawPin}
                    onChange={(e) => setWithdrawPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-sm text-foreground font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                    maxLength={6}
                  />
                  <p className="text-[9px] font-mono text-muted-foreground mt-1">
                    Çıkış işlemlerinde sorulur. Hash'lenerek saklanır.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-mono mb-1 block">
                    {t("login.pgpLabel")}
                  </label>
                  <textarea
                    value={pgpKey}
                    onChange={(e) => setPgpKey(e.target.value)}
                    placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;...&#10;-----END PGP PUBLIC KEY BLOCK-----"
                    rows={3}
                    className="w-full bg-secondary border border-border rounded px-3 py-2.5 text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <MathCaptcha onValidChange={setCaptchaOk} />

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-destructive text-xs font-mono bg-destructive/10 rounded px-3 py-2"
              >
                <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-green-500 text-xs font-mono bg-green-500/10 rounded px-3 py-2"
              >
                ✓ {success}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={submitting || !captchaOk || (mode === "signup" && !passwordReady)}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-primary text-primary-foreground py-3 rounded font-mono text-sm font-bold hover:opacity-90 transition-all neon-glow-btn disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> {t("login.processing")}
              </>
            ) : mode === "login" ? (
              t("login.loginBtn")
            ) : (
              t("login.registerBtn")
            )}
          </motion.button>
        </form>

        <div className="mt-6 glass-card rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[10px] font-mono text-muted-foreground mb-1">{t("login.encryption")}</div>
              <div className="text-xs font-mono text-foreground">AES-256</div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted-foreground mb-1">{t("login.payment")}</div>
              <div className="text-xs font-mono">
                <span className="text-orange-400">XMR</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span className="text-blue-400">LTC</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-muted-foreground mb-1">{t("login.escrow")}</div>
              <div className="text-xs font-mono text-green-500">{t("login.active")}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
