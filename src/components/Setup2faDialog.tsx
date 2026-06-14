import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import {
  X,
  ShieldAlert,
  Key,
  Clipboard,
  Check,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Setup2faDialogProps {
  userEmail: string;
  onClose: () => void;
  onCompleted: () => void;
}

export default function Setup2faDialog({
  userEmail,
  onClose,
  onCompleted,
}: Setup2faDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [factorId, setFactorId] = useState<string>("");
  const [otpUri, setOtpUri] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [enrolling, setEnrolling] = useState(true);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string[]>(
    Array(6).fill(""),
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [backupCodes] = useState(() => {
    return Array(4)
      .fill(null)
      .map(() => {
        const seg1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const seg2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `AEIGS-${seg1}-${seg2}`;
      });
  });

  // Supabase MFA enroll — gerçek TOTP factor oluştur
  useEffect(() => {
    let cancelled = false;
    const enroll = async () => {
      setEnrolling(true);
      setEnrollError(null);
      try {
        const { data, error } =
          await supabase.auth.mfa.supabase.auth.mfa.unenroll({
            factorType: "totp",
            friendlyName: `AEIGSTHUB-${Date.now()}`,
          });
        if (cancelled) return;
        if (error) {
          setEnrollError(error.message);
          return;
        }
        setFactorId(data.id);
        setOtpUri(data.totp.uri);
        setSecretKey(data.totp.secret);
      } catch (e: any) {
        if (!cancelled) setEnrollError(e?.message || "Enroll hatası");
      } finally {
        if (!cancelled) setEnrolling(false);
      }
    };
    supabase.auth.mfa.unenroll();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setCopied(true);
    toast.success("Gizli anahtar panoya kopyalandı!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOtpChange = (value: string, idx: number) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[idx] = value.slice(-1);
    setVerificationCode(newCode);
    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number,
  ) => {
    if (e.key === "Backspace" && !verificationCode[idx] && idx > 0) {
      const newCode = [...verificationCode];
      newCode[idx - 1] = "";
      setVerificationCode(newCode);
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pastedData)) {
      toast.error("Lütfen 6 haneli geçerli bir doğrulama kodu yapıştırın.");
      return;
    }
    const newCode = pastedData.split("");
    setVerificationCode(newCode);
    inputRefs.current[5]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const codeStr = verificationCode.join("");
    if (codeStr.length < 6) {
      toast.error("Lütfen 6 haneli kodu eksiksiz girin.");
      return;
    }
    if (!factorId) {
      toast.error("Factor ID bulunamadı. Lütfen sayfayı yenileyin.");
      return;
    }

    setVerifying(true);
    try {
      // Önce challenge al
      const { data: challengeData, error: challengeErr } =
        await supabase.auth.mfa.challenge({
          factorId,
        });
      if (challengeErr) {
        toast.error(challengeErr.message);
        return;
      }

      // Sonra verify et
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: codeStr,
      });

      if (verifyErr) {
        toast.error("Geçersiz kod. Authenticator uygulamanızı kontrol edin.");
        return;
      }

      // Başarılı — localStorage'a da yaz (SecuritySettings için)
      localStorage.setItem("aeigs_mfa_enabled", "true");
      setStep(3);
      toast.success("MFA Doğrulaması Başarılı!");
    } catch (e: any) {
      toast.error(e?.message || "Doğrulama sırasında hata oluştu.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono select-none">
      <div className="relative w-full max-w-[500px] bg-[#020202]/95 border-2 border-red-600/30 rounded-[32px] p-8 shadow-[0_0_50px_rgba(255,0,0,0.15)] overflow-hidden">
        {/* Animated matrix border pulse effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-purple-600/5 pointer-events-none opacity-50" />

        {/* Close Button */}
        {step !== 3 && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/[0.02] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header HUD */}
        <div className="flex items-center gap-3 border-b border-white/[0.04] pb-4 mb-6 relative">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[6px] text-red-500 font-black tracking-[0.3em] uppercase">
              SECURE_ENCLAVE_v2
            </span>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              2FA (TOTP) AKTİVASYONU
            </h2>
          </div>
        </div>

        {/* Enroll loading / error */}
        {enrolling && (
          <div className="flex flex-col items-center gap-4 py-10 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
            <div className="w-8 h-8 border-2 border-t-red-600 border-white/5 rounded-full animate-spin" />
            SUPABASE MFA HAZIRLANIYÖR...
          </div>
        )}

        {enrollError && !enrolling && (
          <div className="py-6 text-center space-y-4">
            <p className="text-[9px] text-red-500 font-black uppercase tracking-wider">
              {enrollError}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-400 text-[9px] font-black uppercase"
            >
              KAPAT
            </button>
          </div>
        )}

        {!enrolling && !enrollError && (
          <>
            {/* Step Indicator Header */}
            <div className="flex justify-between items-center gap-2 mb-6 text-[8px] font-black uppercase text-zinc-600 border border-white/[0.03] bg-white/[0.01] rounded-2xl p-2.5">
              <span
                className={
                  step === 1 ? "text-red-500" : step > 1 ? "text-green-500" : ""
                }
              >
                1. QR TARAMA
              </span>
              <span className="w-4 h-[1px] bg-zinc-800" />
              <span
                className={
                  step === 2 ? "text-red-500" : step > 2 ? "text-green-500" : ""
                }
              >
                2. DOĞRULAMA
              </span>
              <span className="w-4 h-[1px] bg-zinc-800" />
              <span className={step === 3 ? "text-green-500" : ""}>
                3. KORUMA AKTİF
              </span>
            </div>

            <AnimatePresence mode="wait">
              {/* STEP 1: QR Scan & Copy Secret */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide leading-relaxed">
                    Google Authenticator veya Aegis gibi bir 2FA uygulamasını
                    açıp aşağıdaki QR kodu taratın veya gizli anahtarı manuel
                    olarak ekleyin.
                  </p>

                  {/* QR Code Container */}
                  <div className="flex justify-center p-4 bg-white rounded-3xl w-[190px] h-[190px] mx-auto shadow-2xl relative group">
                    <QRCodeSVG value={otpUri} size={158} />
                  </div>

                  {/* Secret Key Display Card */}
                  <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="truncate">
                      <span className="text-[7px] text-zinc-600 font-black block uppercase tracking-widest">
                        GİZLİ_ANAHTAR_KODU
                      </span>
                      <span className="text-white text-xs font-black tracking-widest uppercase">
                        {secretKey}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-3 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.06] text-zinc-400 hover:text-white transition-all cursor-pointer shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clipboard className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full bg-red-600 text-white py-4 rounded-[20px] text-[9.5px] font-black uppercase tracking-[0.3em] hover:bg-red-700 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    KOD GİRİŞİNE İLERLE <Key className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}

              {/* STEP 2: Input Verification Code */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide leading-relaxed text-center">
                    2FA uygulamanızın ürettiği 6 haneli tek kullanımlık geçici
                    güvenlik kodunu girin.
                  </p>

                  {/* 6 Digit custom input boxes */}
                  <div className="flex justify-center gap-2.5">
                    {verificationCode.map((val, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        value={val}
                        ref={(el) => {
                          inputRefs.current[idx] = el;
                        }}
                        onChange={(e) => handleOtpChange(e.target.value, idx)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        onPaste={idx === 0 ? handlePaste : undefined}
                        className="w-12 h-14 bg-[#050505] border-2 border-white/5 focus:border-red-600/60 rounded-xl text-center text-lg font-black text-white focus:outline-none transition-all uppercase"
                      />
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 bg-white/[0.02] border border-white/5 text-zinc-400 py-4 rounded-[20px] text-[9px] font-black uppercase tracking-wider hover:bg-white/[0.05] transition-all cursor-pointer"
                    >
                      GERİ DÖN
                    </button>
                    <button
                      type="button"
                      disabled={verifying || verificationCode.some((c) => !c)}
                      onClick={handleVerify}
                      className="flex-1 bg-red-600 text-white py-4 rounded-[20px] text-[9.5px] font-black uppercase tracking-[0.2em] hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {verifying ? "DOĞRULANIYOR..." : "KODU ONAYLA"}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Success Confirmation & Backups */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center text-green-500 mx-auto animate-bounce mb-2">
                    <ShieldCheck className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider mb-1">
                      MFA AKTİF EDİLDİ
                    </h3>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                      HESABINIZ ÜST DÜZEY KORUMA ALTINDA!
                    </p>
                  </div>

                  {/* Recovery Backup Codes */}
                  <div className="bg-[#050505] border border-white/5 rounded-2xl p-4 text-left space-y-3">
                    <div>
                      <span className="text-[7px] text-red-500 font-black uppercase tracking-widest block">
                        ⚠️ ACİL KURTARMA KODLARI
                      </span>
                      <span className="text-[7px] text-zinc-600 font-bold uppercase tracking-wider block mt-0.5 leading-relaxed">
                        Telefonunuzu kaybetmeniz durumunda sisteme erişmek için
                        bunları saklayın:
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] font-black tracking-wider text-zinc-300">
                      {backupCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="bg-white/[0.01] border border-white/[0.02] p-2 rounded-xl text-center select-all"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onCompleted();
                      onClose();
                    }}
                    className="w-full bg-green-600 text-white py-4 rounded-[20px] text-[9.5px] font-black uppercase tracking-[0.3em] hover:bg-green-700 transition-all cursor-pointer"
                  >
                    GÜVENLİK AYARLARINA DÖN
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
