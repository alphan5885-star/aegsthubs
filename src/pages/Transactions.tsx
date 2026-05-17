import { useEffect, useState, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { useI18n } from "@/lib/i18n";
import { ArrowUpRight, ArrowDownLeft, Clock, Zap, Activity, Coins } from "lucide-react";
import { motion } from "framer-motion";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
  currency?: string;
}

export default function Transactions() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTransactions = async () => {
      const query = supabase
        .from("transactions")
        .select("*")
        .or(`buyer_id.eq.${user.id},vendor_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50);
      const { data } = await query;
      if (data) setTxs(data as Transaction[]);
      setLoading(false);
    };
    fetchTransactions();
  }, [user]);

  return (
    <PageShell>
      <div className="max-w-[1100px] mx-auto py-8 space-y-12 font-mono">
        
        {/* Ledger Header HUD */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 border-b border-white/5 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[9px] text-red-600 font-black tracking-[0.4em] uppercase">
              <Activity className="w-4 h-4 shadow-[0_0_8px_hsla(var(--primary),1)]" /> 
              LEDGER_v4.2 // FINANCIAL_TRACE
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
              İŞLEMLER<span className="text-red-600">.LOG</span>
            </h1>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right">
                <div className="text-[8px] text-zinc-800 font-black uppercase tracking-widest">KAYIT_ADEDİ</div>
                <div className="text-2xl font-black text-white italic">{txs.length}</div>
             </div>
             <div className="w-[1px] h-8 bg-white/5" />
             <div className="text-red-600"><Coins className="w-6 h-6" /></div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-[9px] text-zinc-800 font-black tracking-[0.4em] uppercase animate-pulse">SYNCHRONIZING_LEDGER...</div>
        ) : txs.length === 0 ? (
          <div className="obsidian-card p-12 rounded-[32px] border border-white/5 text-center space-y-3">
             <div className="text-xl font-black text-white uppercase tracking-tighter opacity-10">VERİ_YOK</div>
             <p className="text-[9px] text-zinc-800 font-bold uppercase tracking-widest leading-relaxed">SİSTEMDE_FİNANSAL_KAYIT_BULUNAMADI.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {txs.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="obsidian-card p-6 rounded-[24px] border border-white/5 hover:border-red-600/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
              >
                <div className="flex items-center gap-5">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${tx.amount >= 0 ? "border-white/5 bg-white/5 text-white" : "border-red-600/20 bg-red-600/5 text-red-600"}`}>
                      {tx.amount >= 0 ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                   </div>
                   <div className="space-y-0.5">
                      <div className="text-lg font-black text-white uppercase tracking-tighter group-hover:text-red-600 transition-colors">{tx.type.toUpperCase()}</div>
                      <div className="text-[8px] text-zinc-800 font-bold uppercase tracking-widest leading-none">{tx.description || "NO_DESC"} // ID: {tx.id.slice(0,8)}</div>
                   </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-10">
                   <div className="text-right">
                      <div className="text-[8px] text-zinc-900 font-black uppercase tracking-widest">VALUE</div>
                      <div className={`text-2xl font-black italic tracking-tighter ${tx.amount >= 0 ? "text-white" : "text-red-600"}`}>
                         {tx.amount >= 0 ? "+" : ""}{tx.amount.toFixed(4)} <span className="text-[10px] not-italic">LTC</span>
                      </div>
                   </div>
                   <div className="text-right hidden sm:block">
                      <div className="text-[8px] text-zinc-900 font-black uppercase tracking-widest">TIMESTAMP</div>
                      <div className="text-[10px] font-black text-zinc-700 uppercase flex items-center gap-1.5 justify-end">
                         <Clock className="w-3 h-3" /> {new Date(tx.created_at).toLocaleDateString()}
                      </div>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Trace Footer */}
        <div className="flex justify-between items-center text-[7px] text-zinc-900 font-black uppercase tracking-[1em] pt-8 border-t border-white/5">
           <span>X_LEDGER_ENCRYPTED</span>
           <span>SYNC_STATUS: OPTIMAL</span>
        </div>

      </div>
    </PageShell>
  );
}
