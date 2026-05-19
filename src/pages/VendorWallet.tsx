import { useEffect, useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { 
  Clock, 
  CheckCircle, 
  Percent, 
  TrendingUp, 
  Package, 
  Activity, 
  Coins, 
  ArrowRight,
  SendHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface WalletData {
  pending: number;
  available: number;
  commission: number;
  total: number;
}

interface OrderSummary {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalCommission: number;
}

const RATES = {
  BTC: 96500,  // BTC/USD
  LTC: 84,     // LTC/USD
  XMR: 180,    // XMR/USD
};

export default function VendorWalletPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData>({
    pending: 0,
    available: 0,
    commission: 0,
    total: 0,
  });
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalCommission: 0,
  });
  const [selectedCoin, setSelectedCoin] = useState<"BTC" | "LTC" | "XMR">("LTC");
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const isMounted = useRef(true);

  const convertPriceFromLTC = (ltcAmount: number, to: "LTC" | "BTC" | "XMR"): number => {
    if (to === "LTC") return ltcAmount;
    const amountInUSD = ltcAmount * RATES.LTC;
    return amountInUSD / RATES[to];
  };

  useEffect(() => {
    if (!user) return;
    isMounted.current = true;
    const fetchAll = async () => {
      try {
        // Wallet data
        const { data: walletData, error: walletError } = await supabase
          .from("vendor_wallets")
          .select("*")
          .eq("vendor_id", user.id)
          .maybeSingle();

        if (!isMounted.current) return;

        if (walletError) {
          if (import.meta.env.DEV) console.error("Error fetching vendor wallet:", walletError);
        } else if (walletData) {
          setWallet({
            pending: Number(walletData.pending),
            available: Number(walletData.available),
            commission: Number(walletData.commission),
            total: Number(walletData.total),
          });
        }

        // Orders summary
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("id, amount, status, service_fee, created_at, product_id")
          .eq("vendor_id", user.id)
          .order("created_at", { ascending: false });

        if (!isMounted.current) return;

        if (ordersError) {
          if (import.meta.env.DEV)
            console.error("Error fetching vendor orders summary:", ordersError);
          return;
        }

        if (orders) {
          const completed = orders.filter(
            (o) => o.status === "completed" || o.status === "delivered",
          );
          const pending = orders.filter((o) => o.status === "paid" || o.status === "pending");
          const totalRev = completed.reduce((s, o) => s + Number(o.amount), 0);
          const totalComm = orders.reduce((s, o) => s + Number((o as any).service_fee || 0), 0);
          setOrderSummary({
            totalOrders: orders.length,
            completedOrders: completed.length,
            pendingOrders: pending.length,
            totalRevenue: totalRev,
            totalCommission: totalComm,
          });
          setRecentOrders(orders.slice(0, 10));
        }
      } catch (e) {
        if (import.meta.env.DEV) console.error("Catch error in VendorWallet fetchAll:", e);
      }
    };
    fetchAll();
    return () => {
      isMounted.current = false;
    };
  }, [user]);

  const handleWithdraw = async () => {
    if (!withdrawAddr || !withdrawAmount) {
      toast.error(t("vendorWallet.fillAllFields"));
      return;
    }
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) { toast.error(t("vendorWallet.invalidAmount")); return; }

    // Convert requested coin amount to LTC to check against available balance
    const ltcAmountToCheck = selectedCoin === "LTC" 
      ? amt 
      : amt * (RATES[selectedCoin] / RATES.LTC);

    if (ltcAmountToCheck > wallet.available) {
      toast.error(t("vendorWallet.insufficientBalance"));
      return;
    }

    setWithdrawing(true);
    try {
      let success = false;
      let errorMsg = "";

      if (selectedCoin === "LTC") {
        const { data, error } = await supabase.rpc("vendor_withdraw_ltc", {
          _address: withdrawAddr,
          _amount: amt,
        });
        if (error || !(data as any)?.success) {
          errorMsg = (data as any)?.error || "RPC_ERROR";
        } else {
          success = true;
        }
      } else if (selectedCoin === "XMR") {
        const { data, error } = await supabase.rpc("vendor_withdraw_xmr", {
          _address: withdrawAddr,
          _amount: amt,
        });
        if (error || !(data as any)?.success) {
          errorMsg = (data as any)?.error || "RPC_ERROR";
        } else {
          success = true;
        }
      } else if (selectedCoin === "BTC") {
        // BTC uses internal LTC conversions for available ledger balance subtraction
        const { data, error } = await supabase.rpc("vendor_withdraw_ltc", {
          _address: withdrawAddr,
          _amount: ltcAmountToCheck,
        });
        if (error || !(data as any)?.success) {
          errorMsg = (data as any)?.error || "RPC_ERROR";
        } else {
          success = true;
        }
      }

      if (!success) {
        toast.error(
          errorMsg === "insufficient_balance" ? t("vendorWallet.insufficientBalance") :
          errorMsg === "invalid_address" ? `${t("vendorWallet.invalidAddress")} ${selectedCoin}` : `${t("vendorWallet.withdrawFailed")} (${errorMsg})`,
        );
        return;
      }

      toast.success(`${amt} ${selectedCoin} ${t("vendorWallet.withdrawSuccess")}`);
      setWithdrawAddr("");
      setWithdrawAmount("");
      if (isMounted.current) {
        setWallet((prev) => ({ ...prev, available: prev.available - ltcAmountToCheck }));
      }
    } catch (e) {
      toast.error(t("vendorWallet.unexpectedError"));
    } finally {
      setWithdrawing(false);
    }
  };

  const maxWithdrawable = convertPriceFromLTC(wallet.available, selectedCoin);

  return (
    <PageShell>
      <div className="max-w-[1300px] mx-auto space-y-12 py-2 font-mono text-zinc-300 relative">
        
        {/* Ambient background glow */}
        <div className="absolute -top-40 right-1/3 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[160px] pointer-events-none" />

        {/* Vendor Wallet Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-white/[0.04] pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-bold tracking-[0.3em] uppercase">
              <Coins className="w-4 h-4 text-primary animate-pulse" /> 
              SECURE_LEDGER // Escrow & Payments System
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
              {t("vendorWallet.title")} <span className="text-primary">{t("vendorWallet.titleCore")}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#080808]/80 border border-white/[0.04] rounded-xl text-[9px] text-zinc-500 font-bold">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            {t("vendorWallet.connectionActive")} // ESCROW_READY
          </div>
        </div>

        {/* High-Fidelity Glassmorphic Stats Grid: BTC, LTC, XMR on EXACT same plane */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: t("vendorWallet.pendingEscrow"),
              value: wallet.pending,
              icon: Clock,
            },
            {
              label: t("vendorWallet.availableNet"),
              value: wallet.available,
              icon: CheckCircle,
            },
            {
              label: t("vendorWallet.commissionSystem"),
              value: wallet.commission,
              icon: Percent,
            },
            {
              label: t("vendorWallet.totalRevenueBrut"),
              value: orderSummary.totalRevenue,
              icon: TrendingUp,
            }
          ].map((item, i) => {
            const btcVal = convertPriceFromLTC(item.value, "BTC");
            const ltcVal = item.value;
            const xmrVal = convertPriceFromLTC(item.value, "XMR");

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#040404]/55 backdrop-blur-xl p-6 rounded-3xl border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 flex flex-col justify-between space-y-4 group"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.03] pb-3">
                  <span className="text-[9px] text-zinc-400 font-black uppercase tracking-widest leading-none">
                    {item.label}
                  </span>
                  <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.03]">
                    <item.icon className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </div>

                {/* Values on the EXACT same plane */}
                <div className="space-y-2">
                  
                  {/* BTC Item */}
                  <div className="flex items-center justify-between py-2 bg-white/[0.01] hover:bg-white/[0.02] px-3 rounded-xl border border-white/[0.02] transition-all">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-amber-500 font-bold">₿</span>
                      <span className="text-[9px] text-zinc-500 font-bold tracking-wider">BTC:</span>
                    </div>
                    <span className="text-sm font-black italic tracking-tight text-amber-500">
                      {btcVal.toFixed(6)} <span className="text-[8px] not-italic text-zinc-500 font-bold">BTC</span>
                    </span>
                  </div>

                  {/* LTC Item */}
                  <div className="flex items-center justify-between py-2 bg-white/[0.01] hover:bg-white/[0.02] px-3 rounded-xl border border-white/[0.02] transition-all">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-emerald-500 font-bold">Ł</span>
                      <span className="text-[9px] text-zinc-500 font-bold tracking-wider">LTC:</span>
                    </div>
                    <span className="text-sm font-black italic tracking-tight text-emerald-500">
                      {ltcVal.toFixed(4)} <span className="text-[8px] not-italic text-zinc-500 font-bold">LTC</span>
                    </span>
                  </div>

                  {/* XMR Item */}
                  <div className="flex items-center justify-between py-2 bg-white/[0.01] hover:bg-white/[0.02] px-3 rounded-xl border border-white/[0.02] transition-all">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-red-500 font-bold">ɱ</span>
                      <span className="text-[9px] text-zinc-500 font-bold tracking-wider">XMR:</span>
                    </div>
                    <span className="text-sm font-black italic tracking-tight text-red-400">
                      {xmrVal.toFixed(4)} <span className="text-[8px] not-italic text-zinc-500 font-bold">XMR</span>
                    </span>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Withdrawal Section & General Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Block: Withdrawal form */}
          <div className="lg:col-span-7 bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6">
            <div className="flex items-center gap-3 border-b border-white/[0.03] pb-4">
              <SendHorizontal className="w-5 h-5 text-primary animate-pulse" />
              <h2 className="text-lg font-black italic text-white uppercase tracking-tight">{t("vendorWallet.withdrawTitle")} // WITHDRAWAL</h2>
            </div>

            <div className="space-y-6 text-[10px]">
              
              {/* Premium Coin Selector Tab */}
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-bold uppercase tracking-wider">{t("vendorWallet.withdrawCurrency")}</label>
                <div className="grid grid-cols-3 gap-2 bg-[#020202] p-1.5 border border-white/[0.04] rounded-2xl">
                  {(["BTC", "LTC", "XMR"] as const).map((coin) => {
                    const isSelected = selectedCoin === coin;
                    return (
                      <button
                        key={coin}
                        onClick={() => {
                          setSelectedCoin(coin);
                          setWithdrawAmount("");
                        }}
                        className={`py-3 rounded-xl font-black text-[10px] tracking-widest transition-all cursor-pointer ${
                          isSelected
                            ? "bg-red-600 text-white shadow-md shadow-red-600/10 scale-[1.02]"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {coin === "BTC" ? "₿ BTC" : coin === "LTC" ? "Ł LTC" : "ɱ XMR"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Limit Box */}
              <div className="flex items-center justify-between bg-white/[0.01] border border-white/[0.03] p-4 rounded-2xl">
                <span className="text-zinc-500 font-bold uppercase tracking-wider">{t("vendorWallet.maxAvailable")}</span>
                <span className="text-emerald-500 font-black text-xs uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg">
                  {maxWithdrawable.toFixed(selectedCoin === "BTC" ? 6 : 4)} {selectedCoin}
                </span>
              </div>

              {/* Address input */}
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-bold uppercase tracking-wider">{selectedCoin} {t("vendorWallet.recipientAddress")}</label>
                <input
                  value={withdrawAddr}
                  onChange={(e) => setWithdrawAddr(e.target.value)}
                  placeholder={`${selectedCoin} ${t("vendorWallet.addressPlaceholder")}`}
                  disabled={withdrawing}
                  className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-red-600/40 font-bold focus:ring-1 focus:ring-red-600/20"
                />
              </div>

              {/* Amount input */}
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-bold uppercase tracking-wider">{t("vendorWallet.amountToWithdraw")} ({selectedCoin})</label>
                <div className="relative">
                  <input
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    type="number"
                    step="0.00000001"
                    min="0"
                    max={maxWithdrawable}
                    disabled={withdrawing}
                    className="w-full bg-[#020202] border border-white/[0.04] rounded-xl pl-4 pr-16 py-3.5 text-white focus:outline-none focus:border-red-600/40 font-bold focus:ring-1 focus:ring-red-600/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-primary text-[9px] uppercase tracking-wider">{selectedCoin}</span>
                </div>
              </div>

              {/* Dynamic conversion preview for input withdraw amount */}
              {withdrawAmount && !isNaN(parseFloat(withdrawAmount)) && (
                <div className="p-4 bg-[#020202]/80 border border-white/[0.03] rounded-2xl text-[8px] text-zinc-500 space-y-1">
                  <div className="text-zinc-400 font-bold uppercase tracking-widest border-b border-white/[0.03] pb-1.5 mb-1.5">
                    {t("vendorWallet.analysisValues")}
                  </div>
                  {selectedCoin !== "BTC" && (
                    <div className="flex justify-between">
                      <span>{t("vendorWallet.btcEquivalent")}</span>
                      <span className="text-white font-bold">
                        {selectedCoin === "LTC" 
                          ? convertPriceFromLTC(parseFloat(withdrawAmount), "BTC").toFixed(6)
                          : (parseFloat(withdrawAmount) * RATES.XMR / RATES.BTC).toFixed(6)
                        } BTC
                      </span>
                    </div>
                  )}
                  {selectedCoin !== "LTC" && (
                    <div className="flex justify-between">
                      <span>{t("vendorWallet.ltcEquivalent")}</span>
                      <span className="text-white font-bold">
                        {selectedCoin === "BTC"
                          ? (parseFloat(withdrawAmount) * RATES.BTC / RATES.LTC).toFixed(4)
                          : (parseFloat(withdrawAmount) * RATES.XMR / RATES.LTC).toFixed(4)
                        } LTC
                      </span>
                    </div>
                  )}
                  {selectedCoin !== "XMR" && (
                    <div className="flex justify-between">
                      <span>{t("vendorWallet.xmrEquivalent")}</span>
                      <span className="text-white font-bold">
                        {selectedCoin === "LTC"
                          ? convertPriceFromLTC(parseFloat(withdrawAmount), "XMR").toFixed(4)
                          : (parseFloat(withdrawAmount) * RATES.BTC / RATES.XMR).toFixed(4)
                        } XMR
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleWithdraw}
                disabled={withdrawing || wallet.available <= 0}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[10px] tracking-widest shadow-[0_10px_20px_rgba(255,0,0,0.1)] active:scale-[0.98]"
              >
                <ArrowRight className="w-4 h-4" />
                {withdrawing ? t("vendorWallet.processing") : `${t("vendorWallet.withdrawSubmitBtn")} (${selectedCoin})`}
              </button>

            </div>
          </div>

          {/* Right Block: General order summary counts */}
          <div className="lg:col-span-5 bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-white/[0.03] pb-4">
                <Package className="w-5 h-5 text-primary animate-pulse" />
                <h2 className="text-lg font-black italic text-white uppercase tracking-tight">{t("vendorWallet.metricsTitle")} // METRICS</h2>
              </div>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                {t("vendorWallet.escrowRuleInfo")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t("vendorWallet.totalOrders"), value: orderSummary.totalOrders },
                { label: t("vendorWallet.completed"), value: orderSummary.completedOrders },
                { label: t("vendorWallet.pending"), value: orderSummary.pendingOrders }
              ].map((item, i) => (
                <div key={i} className="bg-[#020202] border border-white/[0.03] p-4 rounded-2xl text-center space-y-1 hover:border-white/[0.06] transition-all">
                  <div className="text-xl font-black italic tracking-tighter text-white">
                    {item.value}
                  </div>
                  <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider leading-none">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Recent escrow transfers ledger */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <div className="h-[1px] flex-1 bg-white/[0.04]" />
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.3em]">
              {t("vendorWallet.ledgerTitle")} // LEDGER
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {recentOrders.map((order) => {
              const btcEquivalent = convertPriceFromLTC(Number(order.amount), "BTC");
              const xmrEquivalent = convertPriceFromLTC(Number(order.amount), "XMR");

              return (
                <div
                  key={order.id}
                  className="bg-[#040404]/55 backdrop-blur-xl p-5 rounded-3xl border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-white italic tracking-widest uppercase group-hover:text-primary transition-colors">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          order.status === "completed" || order.status === "delivered"
                            ? "bg-green-500/10 text-green-500"
                            : order.status === "paid"
                              ? "bg-blue-500/10 text-blue-400"
                              : order.status === "pending"
                                ? "bg-yellow-500/10 text-yellow-500"
                                : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {order.status === "completed"
                          ? t("vendorWallet.completedState")
                          : order.status === "delivered"
                            ? t("vendorWallet.deliveredState")
                            : order.status === "paid"
                              ? t("vendorWallet.paidState")
                              : order.status === "pending"
                                ? t("vendorWallet.pendingState")
                                : order.status}
                      </span>
                    </div>
                    <div className="text-[7px] text-zinc-600 font-bold uppercase tracking-wider">
                      {t("vendorWallet.txDate")}: {new Date(order.created_at).toLocaleDateString()} {t("vendorWallet.at")} {new Date(order.created_at).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Ledger currencies on the exact same line as well */}
                  <div className="text-right space-y-1">
                    <div className="text-sm font-black italic tracking-tighter space-x-2">
                      <span className="text-amber-500">{btcEquivalent.toFixed(5)} <span className="text-[8px] not-italic font-bold text-zinc-600">BTC</span></span>
                      <span className="text-zinc-700">/</span>
                      <span className="text-emerald-500">{Number(order.amount).toFixed(4)} <span className="text-[8px] not-italic font-bold text-zinc-600">LTC</span></span>
                      <span className="text-zinc-700">/</span>
                      <span className="text-red-400">{xmrEquivalent.toFixed(4)} <span className="text-[8px] not-italic font-bold text-zinc-600">XMR</span></span>
                    </div>
                  </div>

                </div>
              );
            })}

            {recentOrders.length === 0 && (
              <div className="bg-[#040404]/55 border border-white/[0.04] p-10 rounded-[28px] text-center text-zinc-500 font-bold tracking-wider uppercase text-sm">
                {t("vendorWallet.noLedgerRecords")}
              </div>
            )}
          </div>
        </div>

      </div>
    </PageShell>
  );
}
