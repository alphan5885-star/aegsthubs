import { useEffect, useState, useRef } from "react";
import PageShell from "@/components/PageShell";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

type Balance = { available: number; pending: number; total: number };

// Fallback rates — overridden by live CoinGecko fetch
const DEFAULT_RATES = {
  BTC: 96500,
  LTC: 84,
  XMR: 180,
};

const FALLBACK_LTC_ADDRESS = "MQVJg8Rqy31LHQpy1rdHFgawh4dcErZEaR";
const FALLBACK_BTC_ADDRESS = "bc1qxy2kg3zhyp573f2wg3tzzwtw2fsae3tzzwtw2f";
const FALLBACK_XMR_ADDRESS = "49VZg8Rqy31LHQpy1rdHFgawh4dcErZEaREXSrqEqivJaPLxGE6Srk8cXoxdWdfSm9c4uduESinA55PCd3reZoov8SSvTXD";

export default function Wallet() {
  const { t } = useI18n();
  const [activeNetwork, setActiveNetwork] = useState<"BTC" | "LTC" | "XMR">("LTC");
  const [ltcAddress, setLtcAddress] = useState<string>("");
  const [balance, setBalance] = useState<Balance>({ available: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Live exchange rates from CoinGecko
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Withdrawal Form States
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [pinHash, setPinHash] = useState<string | null>(null);

  const isMounted = useRef(true);

  // Fetch live rates from CoinGecko
  const fetchLiveRates = async () => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,litecoin,monero&vs_currencies=usd"
      );
      if (!res.ok) throw new Error("rate fetch failed");
      const json = await res.json();
      if (isMounted.current) {
        setRates({
          BTC: json?.bitcoin?.usd ?? DEFAULT_RATES.BTC,
          LTC: json?.litecoin?.usd ?? DEFAULT_RATES.LTC,
          XMR: json?.monero?.usd ?? DEFAULT_RATES.XMR,
        });
      }
    } catch {
      // keep DEFAULT_RATES
    } finally {
      if (isMounted.current) setRatesLoading(false);
    }
  };

  // Helper to convert LTC balance to BTC or XMR using live rates
  const convertPriceFromLTC = (ltcAmount: number, to: "LTC" | "BTC" | "XMR"): number => {
    if (to === "LTC") return ltcAmount;
    const amountInUSD = ltcAmount * rates.LTC;
    return amountInUSD / rates[to];
  };

  const ensureDepositAddress = async () => {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("user_deposit_addresses")
        .select("address")
        .eq("network", "LTC")
        .maybeSingle();

      if (!fetchError && existing?.address) {
        setLtcAddress(existing.address);
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-deposit-address", { body: {} });
      if (!error && data?.address) {
        setLtcAddress(data.address);
        return;
      }
      setLtcAddress(FALLBACK_LTC_ADDRESS);
    } catch {
      setLtcAddress(FALLBACK_LTC_ADDRESS);
    }
  };

  const refreshBalance = async () => {
    try {
      // Önce sync-deposits edge function'ı dene
      const { data, error } = await supabase.functions.invoke("sync-deposits", { body: {} });
      if (!error && data?.balance) {
        setBalance({
          available: Number(data.balance.available || 0),
          pending: Number(data.balance.pending || 0),
          total: Number(data.balance.total || 0),
        });
        return;
      }
    } catch {
      // edge function çalışmıyor, DB'den direkt oku
    }

    // Fallback: user_balances tablosundan direkt çek
    try {
      const { data: balData } = await supabase
        .from("user_balances")
        .select("available, pending, total")
        .maybeSingle();
      if (balData) {
        setBalance({
          available: Number(balData.available || 0),
          pending: Number(balData.pending || 0),
          total: Number(balData.total || 0),
        });
      }
    } catch {
      // DB de çalışmıyorsa 0 göster — hardcoded değil
      setBalance({ available: 0, pending: 0, total: 0 });
    }
  };

  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
      try {
        await Promise.all([
          ensureDepositAddress(),
          refreshBalance(),
          fetchLiveRates(),
        ]);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("withdraw_pin_hash")
          .maybeSingle();
        if (profileData?.withdraw_pin_hash) {
          setPinHash(profileData.withdraw_pin_hash);
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error(e);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };
    init();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleWithdraw = async () => {
    if (!withdrawAddr || !withdrawAmount) {
      toast.error(`Lütfen ${activeNetwork} çekim adresi ve miktar alanlarını doldur.`);
      return;
    }
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Geçersiz miktar girdin.");
      return;
    }

    if (amt > activeBalance) {
      toast.error("Yetersiz bakiye.");
      return;
    }

    if (pinCode.length !== 6 || isNaN(Number(pinCode))) {
      toast.error("Lütfen 6 haneli güvenlik PIN kodunu gir.");
      return;
    }

    setWithdrawing(true);
    try {
      // PIN'i hash'le ve RPC'ye gönder
      const buf = new TextEncoder().encode(pinCode);
      const hashBuf = await crypto.subtle.digest("SHA-256", buf);
      const computedPinHash = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const ltcAmount = activeNetwork === "LTC" ? amt : convertPriceFromLTC(amt, "LTC");

      const { data, error } = await supabase.rpc("user_withdraw_ltc", {
        _address: withdrawAddr,
        _amount: ltcAmount,
        _pin_hash: computedPinHash,
      });

      if (error) {
        toast.error(error.message || "Çekim talebi oluşturulamadı.");
        return;
      }

      const result = data as any;
      if (!result?.success) {
        toast.error(result?.error || "Çekim talebi reddedildi.");
        return;
      }

      toast.success(`${amt} ${activeNetwork} çekim talebi başarıyla oluşturuldu.`);
      setWithdrawAddr("");
      setWithdrawAmount("");
      setPinCode("");
      // Bakiyeyi güncelle
      if (activeNetwork === "LTC") {
        setBalance((prev) => ({
          available: Math.max(0, prev.available - ltcAmount),
          pending: prev.pending,
          total: Math.max(0, prev.total - ltcAmount),
        }));
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error("Withdraw error:", e);
      toast.error("Çekim işlemi sırasında bir hata oluştu.");
    } finally {
      setWithdrawing(false);
    }
  };

  const setPercentAmount = (percent: number) => {
    const calculated = activeBalance * (percent / 100);
    setWithdrawAmount(calculated.toFixed(6));
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Adres panoya kopyalandı");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <PageShell>
        <div className="min-h-[70vh] flex items-center justify-center flex-col gap-4 font-mono">
          <div className="w-10 h-10 border-4 border-t-red-600 border-white/5 rounded-full animate-spin" />
          <div className="text-[10px] text-zinc-500 font-black tracking-widest uppercase animate-pulse">
            SECURE_VAULT_LOADING
          </div>
        </div>
      </PageShell>
    );
  }

  // Tüm bakiyeler LTC cinsinden tutulur, diğer coinler dönüştürülür
  const ltcBalance = balance.available;
  const btcBalance = convertPriceFromLTC(ltcBalance, "BTC");
  const xmrBalance = convertPriceFromLTC(ltcBalance, "XMR");

  const btcUSD = btcBalance * rates.BTC;
  const ltcUSD = ltcBalance * rates.LTC;
  const xmrUSD = xmrBalance * rates.XMR;

  // Active Network Derived Values
  const activeBalance = activeNetwork === "LTC" ? ltcBalance : (activeNetwork === "BTC" ? btcBalance : xmrBalance);
  const activeAddress = activeNetwork === "LTC" ? (ltcAddress || FALLBACK_LTC_ADDRESS) : (activeNetwork === "BTC" ? FALLBACK_BTC_ADDRESS : FALLBACK_XMR_ADDRESS);
  const activeNetworkLabel = activeNetwork === "LTC" ? "LITECOIN (NATIVE)" : (activeNetwork === "BTC" ? "BITCOIN (NATIVE)" : "MONERO (SECURE)");

  // Color config based on active selection
  const colorMap = {
    BTC: {
      border: "border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.25)]",
      activeText: "text-amber-500",
      accentBg: "bg-amber-500",
      glowBg: "bg-amber-950/20",
      activeBorder: "border-amber-500/40",
      hoverBorder: "hover:border-amber-500/30",
      focusRing: "focus:ring-amber-500/30 focus:border-amber-500/40",
      btnHover: "hover:bg-amber-950/20 hover:border-amber-500/30 hover:text-amber-400",
      textAccent: "text-amber-500",
    },
    LTC: {
      border: "border-red-600/90 shadow-[0_0_30px_rgba(220,38,38,0.3)]",
      activeText: "text-red-500",
      accentBg: "bg-red-600",
      glowBg: "bg-red-950/20",
      activeBorder: "border-red-600/40",
      hoverBorder: "hover:border-red-600/30",
      focusRing: "focus:ring-red-600/30 focus:border-red-600/40",
      btnHover: "hover:bg-red-950/20 hover:border-red-600/30 hover:text-red-400",
      textAccent: "text-red-500",
    },
    XMR: {
      border: "border-teal-500/80 shadow-[0_0_30px_rgba(20,184,166,0.25)]",
      activeText: "text-teal-400",
      accentBg: "bg-teal-500",
      glowBg: "bg-teal-950/20",
      activeBorder: "border-teal-500/40",
      hoverBorder: "hover:border-teal-500/30",
      focusRing: "focus:ring-teal-500/30 focus:border-teal-500/40",
      btnHover: "hover:bg-teal-950/20 hover:border-teal-500/30 hover:text-teal-400",
      textAccent: "text-teal-400",
    }
  };

  const activeColors = colorMap[activeNetwork];

  return (
    <PageShell>
      <div className="max-w-[1300px] mx-auto space-y-10 py-6 font-mono text-zinc-300 relative select-none">

        {/* Page Header matching other pages */}
        <div className="flex items-center gap-3 border-b border-white/[0.04] pb-4">
          <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="12" y1="4" x2="12" y2="20" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <h1 className="text-2xl font-mono font-bold text-white neon-text">{t("wallet") || "Cüzdan"}</h1>
          <span className="ml-auto text-[9px] font-mono text-zinc-500 font-black uppercase tracking-widest border border-white/[0.04] px-2.5 py-1 rounded">
            SECURE_VAULT_ONLINE
          </span>
        </div>

        {/* Top 3 Cryptocurrency Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1: Bitcoin */}
          <div
            onClick={() => {
              setActiveNetwork("BTC");
              setWithdrawAmount("");
            }}
            className={`cursor-pointer rounded-3xl p-6 flex flex-col justify-between h-[180px] relative transition-all duration-500 ease-out transform ${activeNetwork === "BTC"
                ? `${colorMap.BTC.border} scale-[1.03] -translate-y-1.5 bg-[#050505]`
                : "bg-[#050505]/40 border border-white/[0.03] hover:border-amber-500/20 hover:scale-[1.01] hover:-translate-y-0.5"
              }`}
          >
            <div>
              <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">COIN_NETWORK</div>
              <h3 className="text-xl font-bold italic tracking-tighter text-white mt-1 uppercase">BITCOIN</h3>
            </div>

            {/* Active Indicator or Brand Icon */}
            <div className="absolute top-6 right-6 flex items-center gap-2">
              {activeNetwork === "BTC" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
              <div className="w-9 h-9 bg-white/[0.01] border border-white/[0.03] rounded-full flex items-center justify-center">
                <svg className={`w-5 h-5 transition-colors duration-500 ${activeNetwork === "BTC" ? "text-amber-500" : "text-zinc-600"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="8" cy="12" r="2" />
                  <circle cx="16" cy="12" r="2" />
                  <circle cx="12" cy="12" r="5" strokeDasharray="1,1" />
                </svg>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">KULLANILABİLİR_BAKİYE</div>
              <div className="text-2xl font-black italic tracking-tighter text-white flex items-baseline gap-1">
                {btcBalance.toFixed(5)}
                <span className="text-[10px] not-italic text-amber-500 font-bold">BTC</span>
              </div>
              <div className="text-[9px] text-zinc-500 font-bold">&gt; ${btcUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</div>
            </div>
          </div>

          {/* Card 2: Litecoin */}
          <div
            onClick={() => {
              setActiveNetwork("LTC");
              setWithdrawAmount("");
            }}
            className={`cursor-pointer rounded-3xl p-6 flex flex-col justify-between h-[180px] relative transition-all duration-500 ease-out transform ${activeNetwork === "LTC"
                ? `${colorMap.LTC.border} scale-[1.03] -translate-y-1.5 bg-[#050505]`
                : "bg-[#050505]/40 border border-white/[0.03] hover:border-red-600/20 hover:scale-[1.01] hover:-translate-y-0.5"
              }`}
          >
            <div>
              <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">COIN_NETWORK</div>
              <h3 className="text-xl font-bold italic tracking-tighter text-white mt-1 uppercase">LITECOIN</h3>
            </div>

            {/* Active Indicator or Brand Icon */}
            <div className="absolute top-6 right-6 flex items-center gap-2">
              {activeNetwork === "LTC" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
              <div className="w-9 h-9 bg-white/[0.01] border border-white/[0.03] rounded-full flex items-center justify-center">
                <span className={`text-xs transition-colors duration-500 ${activeNetwork === "LTC" ? "text-red-500 font-bold scale-110" : "text-zinc-600"}`}>⚡</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">KULLANILABİLİR_BAKİYE</div>
              <div className="text-2xl font-black italic tracking-tighter text-white flex items-baseline gap-1">
                {ltcBalance.toFixed(4)}
                <span className="text-[10px] not-italic text-red-500 font-bold">LTC</span>
              </div>
              <div className="text-[9px] text-zinc-500 font-bold">&gt; ${ltcUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</div>
            </div>
          </div>

          {/* Card 3: Monero */}
          <div
            onClick={() => {
              setActiveNetwork("XMR");
              setWithdrawAmount("");
            }}
            className={`cursor-pointer rounded-3xl p-6 flex flex-col justify-between h-[180px] relative transition-all duration-500 ease-out transform ${activeNetwork === "XMR"
                ? `${colorMap.XMR.border} scale-[1.03] -translate-y-1.5 bg-[#050505]`
                : "bg-[#050505]/40 border border-white/[0.03] hover:border-teal-500/20 hover:scale-[1.01] hover:-translate-y-0.5"
              }`}
          >
            <div>
              <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">COIN_NETWORK</div>
              <h3 className="text-xl font-bold italic tracking-tighter text-white mt-1 uppercase">MONERO</h3>
            </div>

            {/* Active Indicator or Brand Icon */}
            <div className="absolute top-6 right-6 flex items-center gap-2">
              {activeNetwork === "XMR" && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
              )}
              <div className="w-9 h-9 bg-white/[0.01] border border-white/[0.03] rounded-full flex items-center justify-center">
                <span className={`text-xs transition-colors duration-500 ${activeNetwork === "XMR" ? "text-teal-400 font-bold scale-110" : "text-zinc-600"}`}>🛡️</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">KULLANILABİLİR_BAKİYE</div>
              <div className="text-2xl font-black italic tracking-tighter text-white flex items-baseline gap-1">
                {xmrBalance.toFixed(4)}
                <span className="text-[10px] not-italic text-teal-400 font-bold">XMR</span>
              </div>
              <div className="text-[9px] text-zinc-500 font-bold">&gt; ${xmrUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</div>
            </div>
          </div>

        </div>

        {/* Dual Main Content Columns - Dynamic Transition wrapped by key */}
        <div key={activeNetwork} className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-[fadeIn_0.5s_ease-out] transform">

          {/* Left Column: PARA_YATIR */}
          <div className="bg-[#050505]/60 backdrop-blur-xl border border-white/[0.03] rounded-[36px] p-8 space-y-6 flex flex-col justify-between hover:border-white/[0.06] transition-all duration-500">
            <div className="space-y-6">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                <div className="flex items-center gap-2">
                  <span className={`${activeColors.activeText} text-lg font-bold transition-colors duration-500`}>↙</span>
                  <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">PARA_YATIR</h2>
                </div>
                <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider border border-white/[0.04] px-2.5 py-1 rounded">
                  SECURED_INGRESS
                </span>
              </div>

              <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">
                AĞ: {activeNetworkLabel}
              </div>

              {/* QR and Details Side-by-Side */}
              <div className="flex flex-col sm:flex-row items-stretch gap-6 pt-2">

                {/* Clean white background QR Code box */}
                <div className="bg-white p-4 rounded-[28px] shadow-lg shrink-0 flex items-center justify-center h-[180px] w-[180px] transform hover:scale-[1.02] transition-transform duration-300">
                  <QRCodeCanvas value={activeAddress} size={148} />
                </div>

                {/* Right of QR Panel: Address and Security Warning */}
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <label className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">KİŞİSEL_CÜZDAN_ADRESİ // {activeNetwork}</label>
                    <div className="flex items-center bg-[#020202] border border-white/[0.04] rounded-2xl px-4 py-3 hover:border-white/[0.08] transition-colors duration-300">
                      <code className="flex-1 text-[9px] font-bold tracking-tight text-white select-all break-all pr-2 font-mono">
                        {activeAddress}
                      </code>
                      <button
                        onClick={() => copy(activeAddress)}
                        className={`p-1 transition-all duration-300 cursor-pointer shrink-0 ${copied ? "text-emerald-500 scale-110 rotate-12" : "text-zinc-500 hover:text-white"}`}
                      >
                        {copied ? (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Alert Banner based on network */}
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-950/5 border border-red-900/10 text-[8px] leading-relaxed">
                    <span className="text-red-500 text-sm leading-none shrink-0 mt-0.5">🛡️</span>
                    <div className="space-y-1">
                      <h4 className="text-red-500 font-black tracking-wider uppercase text-[8px]">GÜVENLİK UYARISI</h4>
                      <p className="text-zinc-500">
                        Bu adrese sadece <strong className="text-white font-bold">{activeNetwork}</strong> gönderin. Diğer coinler kurtarılamaz şekilde kaybolacaktır. Yatırma işlemleri minimum 1 blok onayından sonra hesaba geçer.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: PARA_ÇEK */}
          <div className="bg-[#050505]/60 backdrop-blur-xl border border-white/[0.03] rounded-[36px] p-8 space-y-5 flex flex-col justify-between hover:border-white/[0.06] transition-all duration-500">
            <div className="space-y-5">

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                <div className="flex items-center gap-2">
                  <span className={`${activeColors.activeText} text-lg font-bold transition-colors duration-500`}>↗</span>
                  <h2 className="text-xl font-black italic text-white uppercase tracking-tighter">PARA_ÇEK</h2>
                </div>
                <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider border border-white/[0.04] px-2.5 py-1 rounded">
                  SECURED_EGRESS
                </span>
              </div>

              <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider">
                AĞ: {activeNetworkLabel}
              </div>

              {/* Form Controls */}
              <div className="space-y-4 text-[9px]">

                {/* Destination Address Input */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 font-bold uppercase tracking-wider">ALICI_CÜZDAN_ADRESİ (DESTINATION)</label>
                  <input
                    value={withdrawAddr}
                    onChange={(e) => setWithdrawAddr(e.target.value)}
                    placeholder={`${activeNetwork} ADRESİ GİRİN...`}
                    disabled={withdrawing}
                    className={`w-full bg-[#020202] border border-white/[0.04] rounded-2xl px-4 py-3.5 text-white focus:outline-none font-bold transition-all duration-300 focus:ring-1 ${activeColors.focusRing}`}
                  />
                </div>

                {/* Amount Input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[8px]">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">TRANSFER_TUTARI (AMOUNT)</label>
                    <span className="text-zinc-600 font-bold">Kullanılabilir: {activeBalance.toFixed(6)} {activeNetwork}</span>
                  </div>
                  <div className="relative">
                    <input
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.0000"
                      type="number"
                      step="0.00000001"
                      min="0"
                      max={activeBalance}
                      disabled={withdrawing}
                      className={`w-full bg-[#eef2ff] border border-white/[0.04] rounded-2xl pl-4 pr-16 py-3.5 text-zinc-950 placeholder-zinc-400 focus:outline-none font-black transition-all duration-300 focus:ring-1 ${activeColors.focusRing}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-500 text-[10px] tracking-wider">{activeNetwork}</span>
                  </div>
                </div>

                {/* Quick Percent Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setPercentAmount(pct)}
                      className={`py-2.5 bg-[#020202]/60 border border-white/[0.03] text-zinc-500 rounded-xl font-bold tracking-tighter text-[9px] transition-all cursor-pointer uppercase hover:-translate-y-0.5 hover:shadow-md ${activeNetwork === "BTC"
                          ? "hover:text-amber-500 hover:border-amber-500/20"
                          : activeNetwork === "LTC"
                            ? "hover:text-red-500 hover:border-red-600/20"
                            : "hover:text-teal-400 hover:border-teal-500/20"
                        }`}
                    >
                      {pct === 100 ? "MAX" : `%${pct}`}
                    </button>
                  ))}
                </div>

                {/* Pin Code Input Box */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 font-bold uppercase tracking-wider">GÜVENLİK PİN KODU (6-HANELİ)</label>
                  <input
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.slice(0, 6))}
                    placeholder="* * * * * *"
                    type="password"
                    maxLength={6}
                    disabled={withdrawing}
                    className={`w-full bg-[#eef2ff] border border-white/[0.04] rounded-2xl px-4 py-3.5 text-center text-zinc-950 placeholder-zinc-400 focus:outline-none font-bold text-sm tracking-[0.5em] focus:ring-1 transition-all duration-300 ${activeColors.focusRing}`}
                  />
                </div>

              </div>
            </div>

            {/* Execute Button - Dynamic theme color based on selected network */}
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || activeBalance <= 0}
              className={`w-full bg-[#0d0d0d] text-zinc-400 border border-white/[0.05] hover:border-white/[0.1] font-black uppercase py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[10px] tracking-[0.2em] active:scale-[0.98] mt-6 shadow-[0_0_0_transparent] hover:shadow-lg ${activeColors.btnHover}`}
            >
              {withdrawing ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-t-white border-white/10 rounded-full animate-spin" />
                  <span>İŞLEM YAPILIYOR...</span>
                </div>
              ) : (
                <span>ÇEKİM_İŞLEMİNİ_BAŞLAT</span>
              )}
            </button>

          </div>

        </div>

      </div>
    </PageShell>
  );
}
