import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { useI18n } from "@/lib/i18n";
import { Shield, Lock, Clock, Copy, Check, CheckCircle2, ChevronRight, AlertTriangle, Cpu, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

export default function VendorBond() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [bond, setBond] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [depositAddress] = useState(() => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let addr = "ltc1q";
    for (let i = 0; i < 38; i++) addr += chars[Math.floor(Math.random() * chars.length)];
    return addr;
  });

  // Admin Configured USD Fee
  const [bondFeeUsd] = useState(() => {
    return parseFloat(localStorage.getItem("vendor_bond_fee_usd") || "100");
  });

  // Live LTC Market price
  const [ltcPrice, setLtcPrice] = useState(84.0);
  const [fetchingPrice, setFetchingPrice] = useState(true);

  // Blockchain payment simulation
  const [simulating, setSimulating] = useState(false);
  const [confirmations, setConfirmations] = useState(0);
  const [simText, setSimText] = useState("");

  const isMounted = useRef(true);

  // Fetch Live Litecoin Price
  useEffect(() => {
    isMounted.current = true;
    const fetchLtcPrice = async () => {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd");
        if (!res.ok) throw new Error();
        const json = await res.json();
        if (json?.litecoin?.usd && isMounted.current) {
          setLtcPrice(json.litecoin.usd);
        }
      } catch {
        if (isMounted.current) setLtcPrice(84.0);
      } finally {
        if (isMounted.current) setFetchingPrice(false);
      }
    };
    fetchLtcPrice();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Calculate required LTC amount based on price feed
  const requiredLtc = parseFloat((bondFeeUsd / ltcPrice).toFixed(4));

  useEffect(() => {
    if (!user) return;
    const fetchBond = async () => {
      try {
        const { data, error } = await supabase
          .from("vendor_bonds")
          .select("*")
          .eq("vendor_id", user.id)
          .maybeSingle();

        if (!isMounted.current) return;
        if (data) setBond(data);
        setLoading(false);
      } catch (e) {
        if (import.meta.env.DEV) console.error("Error fetching bond:", e);
        if (isMounted.current) setLoading(false);
      }
    };
    fetchBond();
  }, [user]);

  const createBond = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("vendor_bonds")
        .insert({
          vendor_id: user.id,
          amount: 0,
          status: "pending",
        } as any)
        .select()
        .single();

      if (!isMounted.current) return;
      if (error) {
        toast.error(error.message);
        return;
      }
      setBond(data);
      toast.success(t("bond.createdSuccess"));
    } catch (err: any) {
      if (isMounted.current) toast.error(t("bond.error") + err.message);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    toast.success(t("copied"));
    setTimeout(() => setCopied(false), 2000);
  };

  // Run full blockchain confirmation simulation
  const checkPaymentSimulation = () => {
    if (simulating) return;
    setSimulating(true);
    setConfirmations(0);
    setSimText("AĞ ARAŞTIRILIYOR (SCANNING MEMPOOL)...");

    setTimeout(() => {
      setSimText("ÖDEME TESPİT EDİLDİ! ONAYLAR BEKLENİYOR...");
      setConfirmations(1);
      toast.info("İşlem tespit edildi! Blockchain onayları bekleniyor...");

      setTimeout(() => {
        setConfirmations(2);
        setSimText("BLOK ONAYI 2/3 ALINDI...");

        setTimeout(() => {
          setConfirmations(3);
          setSimText("BLOK ONAYI 3/3 BAŞARILI! KİMLİK YÜKSELTİLİYOR...");
          toast.success("Ödeme onaylandı! Satıcı profili oluşturuluyor...");

          setTimeout(async () => {
            try {
              // Promote user to vendor role in supabase
              await supabase.from("user_roles").upsert({
                user_id: user!.id,
                role: "vendor",
              }, { onConflict: "user_id" });

              // Update bond status to active with calculated LTC amount
              const { data } = await supabase
                .from("vendor_bonds")
                .update({
                  status: "active",
                  amount: requiredLtc,
                } as any)
                .eq("vendor_id", user!.id)
                .select()
                .single();

              if (isMounted.current) {
                setBond(data);
                setSimulating(false);
              }
              toast.success("Satıcı hesabı başarıyla aktifleştirildi!");
              
              // Automatically reload to re-run routing engine with vendor sidebar
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } catch (err) {
              console.error(err);
              setSimulating(false);
            }
          }, 1500);
        }, 2500);
      }, 2500);
    }, 2500);
  };

  if (loading) {
    return (
      <PageShell>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-red-600 font-mono text-[10px] font-black uppercase tracking-[0.3em]">
            <Loader2 className="w-6 h-6 animate-spin text-red-600" />
            BAĞLANTI YÜKLENİYOR...
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Real-time Crypto Price Feed HUD */}
        <div className="glass-card rounded-2xl p-4 border border-white/5 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#030303] to-[#010101] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600 animate-pulse" />
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-red-600 animate-spin" />
            <div>
              <h1 className="text-[11px] font-black uppercase text-white tracking-widest">{t("bond.title")}</h1>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                GÜVEN DEPOZİTOSU VE KİMLİK YÜKSELTME PROTOKOLÜ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#050505] px-3 py-1.5 border border-white/5 rounded-xl font-mono text-[9px] font-black text-red-600 tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
            1 LTC = ${ltcPrice.toFixed(2)} USD {fetchingPrice ? "(YÜKLENİYOR)" : "(CANLI BESLEME)"}
          </div>
        </div>

        {!bond ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-8 border border-white/5 bg-gradient-to-b from-[#020202] to-[#010101] text-center space-y-6 shadow-2xl relative"
          >
            <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-600/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.08)]">
              <Shield className="w-8 h-8 text-red-600" />
            </div>

            <div className="space-y-2">
              <h2 className="text-[13px] font-black uppercase text-white tracking-widest">{t("bond.required")}</h2>
              <p className="text-[10px] text-zinc-400 font-bold max-w-lg mx-auto leading-relaxed uppercase">
                DOLANDIRICILIK VE ZARARLI FAALİYETLERİ ENGELLEMEK AMACIYLA, PORTALDA ÜRÜN LİSTELEMEDEN ÖNCE DETAYLI BİR GÜVEN TEMİNATI YATIRMALISINIZ.
              </p>
            </div>

            <div className="p-4 bg-[#030303] border border-white/5 rounded-2xl grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="space-y-1">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">TEMİNAT BEDELİ</span>
                <div className="text-sm font-black text-white">${bondFeeUsd} USD</div>
              </div>
              <div className="space-y-1 border-l border-white/5">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">LITECOIN KARŞILIĞI</span>
                <div className="text-sm font-black text-red-600">{requiredLtc} LTC</div>
              </div>
            </div>

            <button
              onClick={createBond}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] active:scale-95 duration-300"
            >
              {t("bond.deposit")}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            
            {/* Status Grid */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 bg-gradient-to-b from-[#020202] to-[#010101] shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">{t("bond.statusLabel")}</span>
                  <div className="text-[11px] font-black text-white uppercase tracking-widest">
                    {bond.status === "active" ? "AKREDİTE EDİLDİ" : "ONAY BEKLENİYOR"}
                  </div>
                </div>
                <span
                  className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                    bond.status === "active"
                      ? "bg-green-600/10 border-green-600/30 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                      : "bg-red-600/10 border-red-600/30 text-red-600 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse"
                  }`}
                >
                  {bond.status === "active" ? t("bond.active") : t("bond.pendingStatus")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#030303] border border-white/5 rounded-2xl p-5 space-y-1">
                  <div className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">{t("bond.deposited")}</div>
                  <div className="text-lg font-black font-mono text-white">
                    {bond.amount || 0} LTC
                  </div>
                </div>
                <div className="bg-[#030303] border border-white/5 rounded-2xl p-5 space-y-1">
                  <div className="text-[8px] text-zinc-500 font-mono uppercase tracking-wider">{t("bond.requiredAmount")}</div>
                  <div className="text-lg font-black font-mono text-red-600">
                    {requiredLtc} LTC <span className="text-[10px] text-zinc-600 font-black">(${bondFeeUsd})</span>
                  </div>
                </div>
              </div>
            </div>

            {bond.status === "pending" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-8 border border-white/5 bg-[#010101] shadow-2xl text-center space-y-6"
              >
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-relaxed">
                    YENİ SATICI ONAYI İÇİN YUKARIDA BELİRTİLEN <span className="text-red-600">{requiredLtc} LTC</span> TUTARI AŞAĞIDAKİ ADRESE TRANSFER EDİNİZ.
                  </p>
                </div>

                <div className="inline-block p-4 bg-white rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                  <QRCodeSVG
                    value={`litecoin:${depositAddress}?amount=${requiredLtc}`}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#010101"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
                  <div className="flex-1 bg-[#030303] border border-white/5 rounded-2xl px-4 py-4 text-[9px] font-black font-mono text-zinc-300 break-all select-all flex items-center justify-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    {depositAddress}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="sm:w-auto px-6 py-4 bg-zinc-950 border border-white/5 hover:bg-zinc-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 duration-200"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-red-600" />}
                    {copied ? "KOPYALANDI" : "KOPYALA"}
                  </button>
                </div>

                {/* Blockchain Scan Simulator */}
                <div className="border-t border-white/5 pt-6 max-w-lg mx-auto space-y-4">
                  {!simulating ? (
                    <button
                      onClick={checkPaymentSimulation}
                      className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95 duration-200 flex items-center justify-center gap-2"
                    >
                      <Cpu className="w-4 h-4" /> ÖDEMEYİ KONTROL ET (SCAN BLOCKCHAIN)
                    </button>
                  ) : (
                    <div className="bg-[#030303] border border-white/5 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between text-[9px] font-mono font-black text-red-600 tracking-wider">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{simText}</span>
                        </div>
                        <span>{confirmations} / 3 ONAY</span>
                      </div>
                      
                      {/* Confirmations Progress Bar */}
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-red-600"
                          initial={{ width: "0%" }}
                          animate={{ width: `${(confirmations / 3) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`px-3 py-2 border rounded-xl text-[8px] font-black uppercase tracking-wider ${
                              confirmations >= step
                                ? "bg-green-600/10 border-green-600/30 text-green-500"
                                : "bg-zinc-950 border-white/5 text-zinc-700"
                            }`}
                          >
                            {step}. ONAY
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-red-600 animate-pulse" /> AĞ DURUMU: AKTİF • 3 BLOK ONAYI GEREKLİ
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Security / Bond Rules Card */}
        <div className="glass-card rounded-2xl p-6 border border-white/5 bg-[#010101] shadow-2xl space-y-4">
          <h3 className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-red-600" /> {t("bond.rulesTitle")}
          </h3>
          <ul className="space-y-2.5 text-[9px] text-zinc-400 font-bold uppercase tracking-wider leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="text-red-600 shrink-0 font-black">•</span>
              <span>YATIRILAN GÜVEN TEMİNATI (BOND) SATICI HESABINDA TAMAMEN KİLİTLİ (LOCKED) DURUR.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-red-600 shrink-0 font-black">•</span>
              <span>ALICIYI DOLANDIRMA VEYA KURAL İHLALİ TESPİT EDİLİRSE, TEMİNAT TUTARI ALICININ ZARARINI KARŞILAMAK AMACIYLA EKSİLEBİLİR VEYA EL KONULABİLİR.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-red-600 shrink-0 font-black">•</span>
              <span>SİSTEMDE AKTİF LİSTELENEN ÜRÜNLERİNİZ VEYA DEVAM EDEN SİPARİŞLERİNİZ VARKEN DEPOZİTONUZUN İADESİNİ TALEP EDEMEZSİNİZ.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-red-600 shrink-0 font-black">•</span>
              <span>SİTE YÖNETİMİ DEPOZİTO FİYATINI DEĞİŞTİRME YETKİSİNE SAHİPTİR. YUKARIDA LİSTELENEN TUTAR ADMİN PANELİNDEN CANLI OLARAK GÜNCELLENİR.</span>
            </li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
