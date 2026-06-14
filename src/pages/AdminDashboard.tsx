import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/authContext";
import { getAdminStatsFn } from "@/lib/adminFns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  Users,
  ShoppingCart,
  Skull,
  Wallet,
  Shield,
  Zap,
  Activity,
  Send,
  FileText,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface Stats {
  totalVolume: { btc: number; ltc: number; xmr: number };
  activeDisputes: number;
  totalVendors: number;
  totalOrders: number;
  totalCommissions: { btc: number; ltc: number; xmr: number };
  heldEscrow: { btc: number; ltc: number; xmr: number };
  volume24h: { btc: number; ltc: number; xmr: number };
  pendingPayments: number;
  adminBalance: { btc: number; ltc: number; xmr: number };
}

interface AuditRow {
  id: string;
  action: string;
  target_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const isMounted = useRef(true);
  const [stats, setStats] = useState<Stats>({
    totalVolume: { btc: 0, ltc: 0, xmr: 0 },
    activeDisputes: 0,
    totalVendors: 0,
    totalOrders: 0,
    totalCommissions: { btc: 0, ltc: 0, xmr: 0 },
    heldEscrow: { btc: 0, ltc: 0, xmr: 0 },
    volume24h: { btc: 0, ltc: 0, xmr: 0 },
    pendingPayments: 0,
    adminBalance: { btc: 0, ltc: 0, xmr: 0 },
  });
  const [weekData, setWeekData] = useState<{ name: string; btc: number; ltc: number; xmr: number }[]>([]);
  const [escrows, setEscrows] = useState<any[]>([]);
  const [panicConfirm, setPanicConfirm] = useState(false);
  const [autoWithdraw, setAutoWithdraw] = useState<any>(null);
  const [coldWallet, setColdWallet] = useState("");
  const [minAmount, setMinAmount] = useState("1.0");
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCurrency, setWithdrawCurrency] = useState<"BTC" | "LTC" | "XMR">("LTC");
  const [withdrawing, setWithdrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bondFeeUsd, setBondFeeUsd] = useState(() => {
    return parseFloat(localStorage.getItem("vendor_bond_fee_usd") || "100");
  });

  const saveBondFee = () => {
    localStorage.setItem("vendor_bond_fee_usd", bondFeeUsd.toString());
    toast.success("Satıcı depozito bedeli güncellendi! 🛡️");
  };

  const loadAll = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const result = await getAdminStatsFn();
      if (!isMounted.current) return;

      if (result.success) {
        setStats(result.stats);
        setWeekData(result.weekData);
        setEscrows(result.escrows);
        setAuditLogs(result.auditLogs);
      } else {
        toast.error(result.error || "Failed to load admin stats");
      }
    } catch (e) {
      if (import.meta.env.DEV)
        console.error("Catch error in Admin loadAll:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    const loadData = async () => {
      if (!user) return;
      if (document.visibilityState !== "visible") return;
      await loadAll();
    };

    loadData();
    let interval: any = null;
    const tick = () => {
      if (document.visibilityState === "visible") void loadAll();
    };
    interval = setInterval(tick, 60000);
    return () => {
      isMounted.current = false;
      if (interval) clearInterval(interval);
    };
  }, [user]);

  const releaseEscrow = async (escrowId: string) => {
    toast.success(t("admin.escrowReleased"));
    setEscrows((prev) => prev.filter((e) => e.id !== escrowId));
  };

  const executePanic = async () => {
    toast.success(t("admin.destroySuccess"));
    setPanicConfirm(false);
  };

  const saveAutoWithdraw = async () => {
    if (!user || !coldWallet) return;
    toast.success(t("admin.autoWithdrawSaved"));
  };

  const executeWithdraw = async () => {
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      toast.error(t("admin.validAmount"));
      return;
    }
    setWithdrawing(true);
    toast.success(`${amt} ${withdrawCurrency} → LiTaNf78XeFcLiZ1HJ9HWtsUFBajnb99YT`);
    setWithdrawAmount("");
    setWithdrawing(false);
  };

  const statCards = [
    {
      label: t("admin.stats24h"),
      value: `${stats.volume24h.btc} BTC / ${stats.volume24h.ltc} LTC / ${stats.volume24h.xmr} XMR`,
      icon: Activity,
      color: "text-primary",
    },
    {
      label: t("admin.statsCommission"),
      value: `${stats.adminBalance.btc} BTC / ${stats.adminBalance.ltc} LTC / ${stats.adminBalance.xmr} XMR`,
      icon: Wallet,
      color: "text-green-500",
    },
    {
      label: t("admin.statsPending"),
      value: stats.pendingPayments,
      icon: Clock,
      color: "text-yellow-500",
    },
    {
      label: t("admin.statsTotalVol"),
      value: `${stats.totalVolume.btc} BTC / ${stats.totalVolume.ltc} LTC / ${stats.totalVolume.xmr} XMR`,
      icon: TrendingUp,
      color: "text-foreground",
    },
    {
      label: t("admin.statsEscrow"),
      value: `${stats.heldEscrow.btc} BTC / ${stats.heldEscrow.ltc} LTC / ${stats.heldEscrow.xmr} XMR`,
      icon: Shield,
      color: "text-yellow-500",
    },
    {
      label: t("admin.statsDisputes"),
      value: stats.activeDisputes,
      icon: AlertTriangle,
      color: "text-primary",
    },
    {
      label: t("admin.vendorCount"),
      value: stats.totalVendors,
      icon: Users,
      color: "text-foreground",
    },
    {
      label: t("admin.statsTotalOrders"),
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "text-foreground",
    },
  ];

  return (
    <PageShell>
      <h1 className="text-xl font-mono font-bold text-primary neon-text mb-6">
        The Overseer — Command Center
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-lg p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground font-mono">
                {s.label}
              </span>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-xl font-bold font-mono ${s.color}`}>
              {s.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-card rounded-lg p-4 mb-6">
        <h2 className="text-sm font-mono text-muted-foreground mb-4">
          {t("admin.weeklyVolume")}
        </h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weekData}>
            <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 10 }} />
            <YAxis tick={{ fill: "#888", fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #1a1a1a",
                color: "#d9d9d9",
                fontFamily: "JetBrains Mono",
                fontSize: 11,
              }}
            />
            <Bar
              dataKey="ltc"
              fill="hsl(349, 100%, 50%)"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="btc"
              fill="#f7931a"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="xmr"
              fill="#ff6600"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Escrow Management */}
        <div className="glass-card rounded-lg p-4">
          <h2 className="text-sm font-mono font-bold text-foreground mb-3">
            {t("admin.escrowPool")}
          </h2>
          {escrows.length === 0 ? (
            <div className="text-xs text-muted-foreground font-mono text-center py-4">
              {t("admin.noEscrow")}
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {escrows.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between bg-secondary rounded p-2.5"
                >
                  <div>
                    <div className={`text-xs font-mono text-foreground ${e.currency === "BTC" ? "text-orange-500" : e.currency === "LTC" ? "text-primary" : "text-green-500"}`}>
                      {Number(e.amount).toFixed(2)} {e.currency || "LTC"}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {t("admin.commissionLabel")}{" "}
                      {Number(e.commission).toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => releaseEscrow(e.id)}
                    className="px-2 py-1 bg-green-600/20 text-green-500 text-[10px] font-mono rounded hover:bg-green-600/30"
                  >
                    {t("admin.release")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-Withdraw */}
        <div className="glass-card rounded-lg p-4">
          <h2 className="text-sm font-mono font-bold text-foreground mb-3">
            {t("admin.autoWithdraw")}
          </h2>
          <div className="space-y-2">
            <input
              value={coldWallet}
              onChange={(e) => setColdWallet(e.target.value)}
              placeholder={t("admin.coldWalletPlaceholder")}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <input
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder={t("admin.minAmountPlaceholder")}
                type="number"
                step="0.1"
                className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={saveAutoWithdraw}
                className="px-3 py-2 bg-primary text-primary-foreground text-[10px] font-mono rounded neon-glow-btn"
              >
                {t("save")}
              </button>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              Haftalık • Min: {minAmount} LTC
            </div>
          </div>
        </div>
      </div>

      {/* Commission Withdraw + Audit Log */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="glass-card rounded-lg p-4">
          <h2 className="text-sm font-mono font-bold text-foreground mb-2 flex items-center gap-2">
            <Send className="w-4 h-4 text-green-500" />{" "}
            {t("admin.commissionWithdraw")}
          </h2>
          <div className="text-[10px] text-muted-foreground font-mono mb-3 break-all">
            Hedef:{" "}
            <span className="text-primary">
              LiTaNf78XeFcLiZ1HJ9HWtsUFBajnb99YT
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Miktar"
              type="number"
              step="0.0001"
              className="flex-1 bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={withdrawCurrency}
              onChange={(e) => setWithdrawCurrency(e.target.value as "BTC" | "LTC" | "XMR")}
              className="w-24 bg-secondary border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="BTC">BTC</option>
              <option value="LTC">LTC</option>
              <option value="XMR">XMR</option>
            </select>
            <button
              onClick={executeWithdraw}
              disabled={withdrawing}
              className="px-3 py-2 bg-green-600/20 text-green-500 text-[10px] font-mono rounded hover:bg-green-600/30 disabled:opacity-50"
            >
              {withdrawing ? "…" : t("admin.withdraw")}
            </button>
          </div>
          <div className="text-[9px] text-muted-foreground font-mono mt-2">
            Manuel transfer sonrası bakiye düşer ve audit log oluşur.
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-2">
            {t("admin.withdrawable")}{" "}
            <span className={`font-bold ${withdrawCurrency === "BTC" ? "text-orange-500" : withdrawCurrency === "LTC" ? "text-primary" : "text-green-500"}`}>
              {stats.adminBalance[withdrawCurrency.toLowerCase() as keyof typeof stats.adminBalance]} {withdrawCurrency}
            </span>
          </div>
        </div>

        <div className="glass-card rounded-lg p-4">
          <h2 className="text-sm font-mono font-bold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> {t("admin.auditLog")}
          </h2>
          {auditLogs.length === 0 ? (
            <div className="text-xs text-muted-foreground font-mono text-center py-4">
              {t("admin.noRecords")}
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="text-[10px] font-mono bg-secondary rounded p-2 flex justify-between items-center"
                >
                  <span className="text-foreground truncate">{log.action}</span>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {new Date(log.created_at).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vendor Bond Configuration */}
      <div className="glass-card rounded-lg p-4 mb-6 border border-white/5 bg-gradient-to-r from-red-950/10 via-[#010101] to-[#010101]">
        <h2 className="text-xs font-mono font-bold text-foreground mb-3 flex items-center gap-2 tracking-widest uppercase">
          <Shield className="w-4 h-4 text-red-600 animate-pulse" /> SATICI
          DEPOZİTO YAPILANDIRMASI (VENDOR BOND SETTINGS)
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1.5 w-full">
            <label className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider block">
              SATICI OLMAK İÇİN GEREKLİ TEMİNAT (USD)
            </label>
            <input
              type="number"
              value={bondFeeUsd}
              onChange={(e) => setBondFeeUsd(parseFloat(e.target.value) || 0)}
              placeholder="E.g. 100"
              className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-red-600/50 transition-colors"
            />
          </div>
          <button
            onClick={saveBondFee}
            className="w-full sm:w-auto px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 duration-200"
          >
            TEMİNATI GÜNCELLE
          </button>
        </div>
        <p className="text-[8px] text-zinc-600 font-mono mt-3 uppercase leading-relaxed tracking-wider">
          * BU BEDEL YENİ SATICILARDAN TALEP EDİLECEK GÜVEN TEMİNATIDIR.
          ALICILAR SAYFASINDA BU TUTARIN LITECOIN KARŞILIĞINI ANLIK OLARAK
          GÖRECEKLERDİR.
        </p>
      </div>

      <div className="glass-card rounded-lg p-4 border border-destructive/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skull className="w-6 h-6 text-destructive" />
            <div>
              <div className="text-sm font-mono font-bold text-destructive">
                {t("admin.paniTitle")}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {t("admin.panicDesc")}
              </div>
            </div>
          </div>
          {!panicConfirm ? (
            <button
              onClick={() => setPanicConfirm(true)}
              className="px-4 py-2 bg-destructive/20 text-destructive text-xs font-mono rounded hover:bg-destructive/30 transition-colors"
            >
              <Zap className="w-3 h-3 inline mr-1" /> {t("admin.activate")}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-destructive font-mono animate-pulse">
                {t("admin.areSure")}
              </span>
              <button
                onClick={executePanic}
                className="px-3 py-1.5 bg-destructive text-destructive-foreground text-xs font-mono rounded font-bold animate-pulse"
              >
                {t("admin.destroy")}
              </button>
              <button
                onClick={() => setPanicConfirm(false)}
                className="px-3 py-1.5 bg-secondary text-muted-foreground text-xs font-mono rounded"
              >
                {t("cancel")}
              </button>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
