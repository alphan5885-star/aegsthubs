import { useState } from "react";
import PageShell from "@/components/PageShell";
import {
  Shield,
  CheckCircle,
  XCircle,
  Key,
  Lock,
  Copy,
  Trash2,
  Plus,
  Info,
  ArrowRight,
  FileText,
  Download,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  verifySignature,
  encryptForRecipient,
  generateKeyPair,
  parsePublicKey,
  formatFingerprint,
  PgpKeyInfo,
} from "@/lib/pgp";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export default function PgpTool() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<
    "verify" | "encrypt" | "generate" | "parse"
  >("verify");

  // Tab: Verify
  const [signedMsg, setSignedMsg] = useState("");
  const [pubKey, setPubKey] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    data: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Tab: Encrypt
  const [plaintext, setPlaintext] = useState("");
  const [encryptPubKey, setEncryptPubKey] = useState("");
  const [encryptedMsg, setEncryptedMsg] = useState("");
  const [encrypting, setEncrypting] = useState(false);

  // Tab: Generate
  const [genName, setGenName] = useState("");
  const [genEmail, setGenEmail] = useState("");
  const [genPassphrase, setGenPassphrase] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);

  // Tab: Parse
  const [parseKeyBlock, setParseKeyBlock] = useState("");
  const [parsedKeyInfo, setParsedKeyInfo] = useState<PgpKeyInfo | null>(null);
  const [parsing, setParsing] = useState(false);

  const handleVerify = async () => {
    if (!signedMsg || !pubKey) {
      toast.error(
        "Lütfen hem imzalı mesajı hem de göndericinin public anahtarını girin.",
      );
      return;
    }
    setVerifying(true);
    try {
      const result = await verifySignature(signedMsg, pubKey);
      setVerificationResult(result);
      if (result.verified) toast.success("İmza başarıyla doğrulandı! 🛡️");
      else
        toast.error(
          "Geçersiz imza! Veri değiştirilmiş veya yanlış anahtar kullanılmış.",
        );
    } catch (e: any) {
      toast.error("Doğrulama hatası: " + e.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleEncrypt = async () => {
    if (!plaintext || !encryptPubKey) {
      toast.error(
        "Lütfen şifrelenecek metni ve alıcının public anahtarını girin.",
      );
      return;
    }
    setEncrypting(true);
    try {
      const encrypted = await encryptForRecipient(plaintext, encryptPubKey);
      setEncryptedMsg(encrypted);
      toast.success("Mesaj alıcının PGP anahtarı ile şifrelendi! 🔒");
    } catch (e: any) {
      toast.error("Şifreleme hatası: " + e.message);
    } finally {
      setEncrypting(false);
    }
  };

  const handleGenerateKeys = async () => {
    if (!genName.trim() || !genEmail.trim()) {
      toast.error("İsim ve e-posta alanları zorunludur.");
      return;
    }
    setGenerating(true);
    try {
      const keys = await generateKeyPair(genName, genEmail, genPassphrase);
      setGeneratedKeys({
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
      });
      toast.success(
        "ECC (Curve 25519) PGP Anahtar Çifti Başarıyla Üretildi! 🗝️",
      );
    } catch (e: any) {
      toast.error("Anahtar üretimi sırasında hata oluştu: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleParseKey = async () => {
    if (!parseKeyBlock.trim()) {
      toast.error("Lütfen analiz edilecek Public Key bloğunu yapıştırın.");
      return;
    }
    setParsing(true);
    try {
      const parsed = await parsePublicKey(parseKeyBlock);
      setParsedKeyInfo(parsed);
      toast.success("Public Key başarıyla analiz edildi! 🧠");
    } catch (e: any) {
      toast.error("Anahtar analiz hatası: " + e.message);
    } finally {
      setParsing(false);
    }
  };

  const copy = (text: string, msg: string = "Panoya kopyalandı!") => {
    navigator.clipboard.writeText(text);
    toast.success(msg);
  };

  return (
    <PageShell>
      <div className="max-w-[1250px] mx-auto space-y-12 py-2 font-mono text-zinc-300 relative">
        {/* Ambient background glow */}
        <div className="absolute -top-40 right-1/3 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[160px] pointer-events-none" />

        {/* PGP Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-white/[0.04] pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-bold tracking-[0.3em] uppercase">
              <Shield className="w-4 h-4 text-primary animate-pulse" />
              CRYPTOGRAPHY_SUITE // PGP Core v1.2
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
              PGP <span className="text-primary">ARAÇLARI</span>
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-[#020202] p-1.5 border border-white/[0.04] rounded-2xl gap-1 text-[9px] font-black uppercase tracking-wider">
            {[
              { id: "verify", label: "🛡️ Doğrula" },
              { id: "encrypt", label: "🔒 Şifrele" },
              { id: "generate", label: "🗝️ Anahtar Üret" },
              { id: "parse", label: "🧠 Analiz Et" },
            ].map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                  }}
                  className={`px-5 py-3 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? "bg-red-600 text-white shadow-md shadow-red-600/10 scale-[1.02]"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === "verify" && (
            // ================= VERIFY SIGNATURE TAB =================
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Form Input Card */}
              <div className="lg:col-span-7 bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6">
                <div className="flex items-center gap-3 border-b border-white/[0.03] pb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-black italic text-white uppercase tracking-tight">
                    İmza Doğrulama Formu
                  </h2>
                </div>

                <div className="space-y-6 text-[10px]">
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      İMZALI MESAJ (CLEARTEXT MESSAGE)
                    </label>
                    <textarea
                      value={signedMsg}
                      onChange={(e) => setSignedMsg(e.target.value)}
                      className="w-full h-44 bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-white focus:outline-none focus:border-red-600/40 font-bold resize-none text-[11px]"
                      placeholder="-----BEGIN PGP SIGNED MESSAGE-----&#10;..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      GÖNDERİCİNİN PUBLIC KEY BLOĞU
                    </label>
                    <textarea
                      value={pubKey}
                      onChange={(e) => setPubKey(e.target.value)}
                      className="w-full h-44 bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-white focus:outline-none focus:border-red-600/40 font-bold resize-none text-[11px]"
                      placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;..."
                    />
                  </div>

                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-[10px] tracking-widest active:scale-[0.98]"
                  >
                    <Shield className="w-4 h-4" />
                    {verifying ? "DOĞRULANIYOR..." : "İMZAYI DOĞRULA (VERIFY)"}
                  </button>
                </div>
              </div>

              {/* Verification Result Card */}
              <div className="lg:col-span-5 bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-black italic text-white uppercase tracking-tight">
                        ANALİZ SONUCU
                      </h2>
                    </div>
                    {verificationResult && (
                      <button
                        onClick={() => setVerificationResult(null)}
                        className="text-zinc-500 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {verificationResult ? (
                    <div className="space-y-6 text-[10px]">
                      {/* Success / Failure Indicator */}
                      <div
                        className={`p-4 rounded-2xl border flex items-center gap-4 ${
                          verificationResult.verified
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : "bg-red-500/10 border-red-500/20 text-red-500"
                        }`}
                      >
                        {verificationResult.verified ? (
                          <CheckCircle className="w-10 h-10 shrink-0 text-green-500" />
                        ) : (
                          <XCircle className="w-10 h-10 shrink-0 text-red-500" />
                        )}
                        <div>
                          <div className="font-black text-xs uppercase tracking-wider">
                            {verificationResult.verified
                              ? "İmza Eşleşti / GEÇERLİ"
                              : "İMZA UYUMSUZ / GEÇERSİZ"}
                          </div>
                          <div className="text-[9px] opacity-80 uppercase tracking-tight leading-relaxed mt-1">
                            {verificationResult.verified
                              ? "Göndericinin kimliği ve mesaj bütünlüğü kriptografik olarak onaylandı. Veri manipüle edilmemiştir."
                              : "Gönderen doğrulanamadı! Mesaj değiştirilmiş veya yanlış bir anahtarla imzalanmış olabilir."}
                          </div>
                        </div>
                      </div>

                      {/* Original text readout */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-zinc-500 font-bold uppercase tracking-wider">
                            DOĞRULANAN MESAJ İÇERİĞİ
                          </label>
                          <button
                            onClick={() => copy(verificationResult.data)}
                            className="text-zinc-500 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="w-full bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-[11px] font-bold text-white whitespace-pre-wrap break-all max-h-[220px] overflow-auto">
                          {verificationResult.data}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-16 space-y-4">
                      <Shield className="w-12 h-12 text-zinc-500/20 animate-pulse" />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        DOĞRULANACAK İMZALI VERİ BEKLENİYOR
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl text-[8px] text-zinc-500 leading-relaxed uppercase tracking-wider">
                  ⚠️ PGP, alıcı ve satıcı arasındaki kimlik doğrulamasını
                  şifreli imza algoritmalarıyla tamamen bağımsız ve
                  merkeziyetsiz olarak sağlar.
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "encrypt" && (
            // ================= ENCRYPT MESSAGE TAB =================
            <motion.div
              key="encrypt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Form Input Card */}
              <div className="lg:col-span-7 bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6">
                <div className="flex items-center gap-3 border-b border-white/[0.03] pb-4">
                  <Lock className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-black italic text-white uppercase tracking-tight">
                    PGP ŞİFRELEME PANELİ
                  </h2>
                </div>

                <div className="space-y-6 text-[10px]">
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      ŞİFRELENECEK DÜZ METİN (PLAINTEXT)
                    </label>
                    <textarea
                      value={plaintext}
                      onChange={(e) => setPlaintext(e.target.value)}
                      className="w-full h-44 bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-white focus:outline-none focus:border-red-600/40 font-bold resize-none text-[11px]"
                      placeholder="Şifrelemek istediğiniz gizli mesajı girin..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      ALICININ PUBLIC KEY BLOĞU
                    </label>
                    <textarea
                      value={encryptPubKey}
                      onChange={(e) => setEncryptPubKey(e.target.value)}
                      className="w-full h-44 bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-white focus:outline-none focus:border-red-600/40 font-bold resize-none text-[11px]"
                      placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;..."
                    />
                  </div>

                  <button
                    onClick={handleEncrypt}
                    disabled={encrypting}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-[10px] tracking-widest active:scale-[0.98]"
                  >
                    <Lock className="w-4 h-4" />
                    {encrypting
                      ? "ŞİFRELENİYOR..."
                      : "MESAJI ŞİFRELE (ENCRYPT)"}
                  </button>
                </div>
              </div>

              {/* Encrypted Output Card */}
              <div className="lg:col-span-5 bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-black italic text-white uppercase tracking-tight">
                        ŞİFRELİ ÇIKTI (CIPHERTEXT)
                      </h2>
                    </div>
                    {encryptedMsg && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            copy(encryptedMsg, "Şifreli çıktı kopyalandı!")
                          }
                          className="text-zinc-500 hover:text-white cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEncryptedMsg("")}
                          className="text-zinc-500 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {encryptedMsg ? (
                    <div className="space-y-4">
                      <textarea
                        readOnly
                        value={encryptedMsg}
                        className="w-full h-[320px] bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-[10px] text-emerald-400 font-bold focus:outline-none resize-none break-all"
                      />
                      <p className="text-[8px] text-zinc-500 italic leading-relaxed uppercase tracking-wider">
                        🛡️ Bu mesajı sadece bu Public Key'e ait Özel Anahtara
                        (Private Key) ve şifresine sahip olan alıcı çözebilir
                        (Decrypt).
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-16 space-y-4">
                      <Lock className="w-12 h-12 text-zinc-500/20 animate-pulse" />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        ŞİFRELENECEK METİN BEKLENİYOR
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl text-[8px] text-zinc-500 leading-relaxed uppercase tracking-wider">
                  ⚠️ Pazar yerinde kimlik ve kargo bilgilerinizi gönderirken PGP
                  şifreleme kullanmanız güvenliğiniz için hayati önem taşır.
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "generate" && (
            // ================= KEY PAIR GENERATOR TAB =================
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Form Input Card */}
              <div className="lg:col-span-6 bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6">
                <div className="flex items-center gap-3 border-b border-white/[0.03] pb-4">
                  <Key className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-black italic text-white uppercase tracking-tight">
                    ANAHTAR ÇİFTİ ÜRETECİ
                  </h2>
                </div>

                <div className="space-y-5 text-[10px]">
                  <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 text-yellow-500/80 rounded-2xl flex gap-3">
                    <AlertTriangle className="w-6 h-6 shrink-0 text-yellow-500" />
                    <div className="space-y-0.5 leading-relaxed uppercase">
                      <div className="font-black text-[9px]">
                        GÜVENLİ VE TARAYICI TABANLI
                      </div>
                      <div>
                        Anahtarlarınız tamamen tarayıcınızda (Web Crypto API ile
                        lokal) üretilir. Sunucuya asla gitmez.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      İSİM / RUMUZ (IDENTITY NAME)
                    </label>
                    <input
                      value={genName}
                      onChange={(e) => setGenName(e.target.value)}
                      placeholder="Ör: Kizilyurek_Siberian"
                      className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-red-600/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      E-POSTA ADRESİ (ANONİM OLABİLİR)
                    </label>
                    <input
                      value={genEmail}
                      onChange={(e) => setGenEmail(e.target.value)}
                      placeholder="Ör: anon@kizilyurek.net"
                      className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-red-600/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      ANAHTAR ŞİFRESİ (PARAPHRASING - OPSIYONEL)
                    </label>
                    <input
                      value={genPassphrase}
                      type="password"
                      onChange={(e) => setGenPassphrase(e.target.value)}
                      placeholder="Özel anahtarı korumak için güçlü bir şifre..."
                      className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-red-600/40"
                    />
                  </div>

                  <div className="flex justify-between bg-white/[0.01] border border-white/[0.03] p-4 rounded-xl">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">
                      ALGORİTMA / PARAMETRELER
                    </span>
                    <span className="text-red-500 font-black tracking-widest text-[9px] uppercase">
                      ECC Curve25519 (Ed25519)
                    </span>
                  </div>

                  <button
                    onClick={handleGenerateKeys}
                    disabled={generating}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-[10px] tracking-widest active:scale-[0.98]"
                  >
                    <Key className="w-4 h-4 animate-spin-slow" />
                    {generating
                      ? "ANAHTARLAR HESAPLANIYOR..."
                      : "YENİ PGP ANAHTAR ÇİFTİ OLUŞTUR"}
                  </button>
                </div>
              </div>

              {/* Output Keys Cards */}
              <div className="lg:col-span-6 space-y-6">
                {generatedKeys ? (
                  <div className="space-y-6 text-[10px]">
                    {/* Public key */}
                    <div className="bg-[#040404]/55 backdrop-blur-xl p-6 rounded-[28px] border border-white/[0.04] space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.03] pb-3">
                        <span className="text-white font-black uppercase tracking-wider">
                          🟢 PUBLIC KEY (HERKESLE PAYLAŞIN)
                        </span>
                        <button
                          onClick={() =>
                            copy(
                              generatedKeys.publicKey,
                              "Public Key kopyalandı!",
                            )
                          }
                          className="text-zinc-500 hover:text-white cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={generatedKeys.publicKey}
                        className="w-full h-36 bg-[#020202] border border-white/[0.04] rounded-xl p-3 text-[9px] text-white font-bold focus:outline-none resize-none"
                      />
                    </div>

                    {/* Private key */}
                    <div className="bg-[#040404]/55 backdrop-blur-xl p-6 rounded-[28px] border border-white/[0.04] space-y-3">
                      <div className="flex items-center justify-between border-b border-white/[0.03] pb-3">
                        <span className="text-red-500 font-black uppercase tracking-wider">
                          🔴 PRIVATE KEY (KİMSEYLE PAYLAŞMAYIN!)
                        </span>
                        <button
                          onClick={() =>
                            copy(
                              generatedKeys.privateKey,
                              "Private Key kopyalandı! GİZLİ TUTUN!",
                            )
                          }
                          className="text-zinc-500 hover:text-red-500 cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={generatedKeys.privateKey}
                        className="w-full h-36 bg-[#020202] border border-white/[0.04] rounded-xl p-3 text-[9px] text-red-500/80 font-bold focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] h-full flex flex-col items-center justify-center text-center py-24 space-y-4">
                    <Key className="w-14 h-14 text-zinc-500/10 animate-pulse" />
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      ÜRETİLECEK YENİ ANAHTAR YÖNERGESİ BEKLENİYOR
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "parse" && (
            // ================= KEY PARSER TAB =================
            <motion.div
              key="parse"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Form Input Card */}
              <div className="lg:col-span-7 bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6">
                <div className="flex items-center gap-3 border-b border-white/[0.03] pb-4">
                  <Info className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-black italic text-white uppercase tracking-tight">
                    PUBLIC KEY AYRIŞTIRICI
                  </h2>
                </div>

                <div className="space-y-6 text-[10px]">
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      ANALİZ EDİLECEK PUBLIC KEY BLOĞU
                    </label>
                    <textarea
                      value={parseKeyBlock}
                      onChange={(e) => setParseKeyBlock(e.target.value)}
                      className="w-full h-64 bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-white focus:outline-none focus:border-red-600/40 font-bold resize-none text-[11px]"
                      placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;..."
                    />
                  </div>

                  <button
                    onClick={handleParseKey}
                    disabled={parsing}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-[10px] tracking-widest active:scale-[0.98]"
                  >
                    <Zap className="w-4 h-4" />
                    {parsing ? "ÇÖZÜMLENİYOR..." : "ANAHTAR YAPISINI ANALİZ ET"}
                  </button>
                </div>
              </div>

              {/* Parsed Metadata Card */}
              <div className="lg:col-span-5 bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-primary" />
                      <h2 className="text-lg font-black italic text-white uppercase tracking-tight">
                        ANAHTAR METADATASI
                      </h2>
                    </div>
                  </div>

                  {parsedKeyInfo ? (
                    <div className="space-y-4 text-[10px]">
                      {/* Identity name */}
                      <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-1">
                        <div className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">
                          SAHİPLİK BİLGİSİ (USER ID)
                        </div>
                        <div className="text-xs font-black text-white italic uppercase">
                          {parsedKeyInfo.userIds.join(", ") || "BELİRTİLMEMİŞ"}
                        </div>
                      </div>

                      {/* Fingerprint */}
                      <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-1">
                        <div className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">
                          FINGERPRINT (KİMLİK PARMAK İZİ)
                        </div>
                        <div className="text-[10px] font-black text-emerald-400 select-all font-bold">
                          {formatFingerprint(parsedKeyInfo.fingerprint)}
                        </div>
                      </div>

                      {/* Key ID */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-1">
                          <div className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">
                            KEY ID
                          </div>
                          <div className="text-xs font-black text-white italic select-all">
                            {parsedKeyInfo.keyId}
                          </div>
                        </div>

                        <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-1">
                          <div className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">
                            ALGORİTMA
                          </div>
                          <div className="text-xs font-black text-white italic">
                            {parsedKeyInfo.algorithm.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Bits & Date */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-1">
                          <div className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">
                            ANAHTAR BOYUTU
                          </div>
                          <div className="text-xs font-black text-white italic">
                            {parsedKeyInfo.bits > 0
                              ? `${parsedKeyInfo.bits} BITS`
                              : "ECC (Oto)"}
                          </div>
                        </div>

                        <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl space-y-1">
                          <div className="text-zinc-500 font-bold uppercase tracking-wider text-[8px]">
                            OLUŞTURULMA TARİHİ
                          </div>
                          <div className="text-xs font-black text-white italic">
                            {parsedKeyInfo.createdAt
                              ? new Date(
                                  parsedKeyInfo.createdAt,
                                ).toLocaleDateString("tr-TR")
                              : "BELİRSİZ"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-16 space-y-4">
                      <Info className="w-12 h-12 text-zinc-500/20 animate-pulse" />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        ANALİZ EDİLECEK PUBLIC KEY BEKLENİYOR
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl text-[8px] text-zinc-500 leading-relaxed uppercase tracking-wider">
                  ⚠️ Bir kullanıcının Public Key'ini analiz ederek parmak izinin
                  (fingerprint) o kişiye ait olduğunu teyit edebilirsiniz.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
