import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import {
  Shield,
  Lock,
  Fingerprint,
  Save,
  Eye,
  EyeOff,
  Smartphone,
  Check,
  X,
  Loader2,
  Copy,
  Skull,
  Power,
  Zap,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useI18n } from "@/lib/i18n";

export default function SecuritySettings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [antiPhishingCode, setAntiPhishingCode] = useState("");
  const [savedCode, setSavedCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [deadManEnabled, setDeadManEnabled] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data } = await supabase.from("anti_phishing_codes").select("code").eq("user_id", user.id).maybeSingle();
      if (data) setSavedCode(data.code);
      const { data: mfa } = await supabase.auth.mfa.listFactors();
      if (mfa) setMfaFactors(mfa.totp || []);
      setDeadManEnabled(localStorage.getItem("dead-man-mode") === "armed");
    };
    fetchData();
  }, [user]);

  return (
    <PageShell>
      <div className="max-w-[1100px] mx-auto py-8 space-y-12 font-mono">
        
        {/* Security Header HUD */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 border-b border-white/5 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[9px] text-red-600 font-black tracking-[0.4em] uppercase">
              <ShieldAlert className="w-4 h-4 shadow-[0_0_8px_hsla(var(--primary),1)]" /> 
              SEC_PROTOCOL_v9.4 // HARDENED_ENCLAVE
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
              GÜVENLİK<span className="text-red-600">.SEC</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 px-6 py-3 bg-red-600/5 border border-red-600/20 rounded-full">
             <Activity className="w-3.5 h-3.5 text-red-600" />
             <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">AĞ_STABİL_OK</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Main Controls */}
          <div className="lg:col-span-8 space-y-10">
             
             {/* Anti-Phishing Control */}
             <div className="obsidian-card p-10 rounded-[40px] border-2 border-white/5 space-y-6 relative overflow-hidden">
                <div className="flex items-center gap-3 text-white">
                   <Fingerprint className="w-6 h-6 text-red-600" />
                   <h2 className="text-xl font-black italic uppercase tracking-tight">Anti-Phishing_Kodu</h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                   <div className="flex-1 relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-900 group-focus-within:text-red-600 transition-colors" />
                      <input 
                        value={antiPhishingCode}
                        onChange={(e) => setAntiPhishingCode(e.target.value)}
                        className="w-full bg-[#050505] border-2 border-white/5 rounded-[24px] pl-12 pr-4 py-4 text-[11px] text-white focus:border-red-600/50 outline-none font-black uppercase" 
                        placeholder="YENİ_KOD_BELİRLE..." 
                      />
                   </div>
                   <button className="bg-red-600 text-white px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">GÜNCELLE</button>
                </div>
                {savedCode && (
                  <div className="pt-2 flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-zinc-900">
                     SİSTEM_KAYDI: <span className="text-red-600">{showCode ? savedCode : "••••••••"}</span>
                     <button onClick={() => setShowCode(!showCode)} className="hover:text-white transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                  </div>
                )}
             </div>

             {/* 2FA Implementation Area */}
             <div className="obsidian-card p-10 rounded-[40px] border-2 border-white/5 space-y-6">
                <div className="flex items-center gap-3 text-white">
                   <Shield className="w-6 h-6 text-red-600" />
                   <h2 className="text-xl font-black italic uppercase tracking-tight">2FA_Doğrulama</h2>
                </div>
                
                {mfaFactors.length > 0 ? (
                  <div className="bg-red-600/5 border border-red-600/10 rounded-[24px] p-6 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white"><Check className="w-5 h-5" /></div>
                        <div className="space-y-0.5">
                           <div className="text-sm font-black text-white uppercase tracking-tighter">TOTP_KORUMASI_AKTİF</div>
                           <div className="text-[8px] text-zinc-800 font-bold uppercase tracking-widest">YÜKSEK_GÜVENLİK_KİMLİĞİ</div>
                        </div>
                     </div>
                     <button className="p-2 rounded-xl bg-white/5 text-zinc-800 hover:text-red-600 transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <button className="w-full bg-red-600 text-white py-6 rounded-[32px] text-[10px] font-black uppercase tracking-[0.4em] hover:bg-red-700 transition-all">2FA_SİSTEMİNİ_BAŞLAT</button>
                )}
             </div>
          </div>

          {/* Side Info Panels */}
          <div className="lg:col-span-4 space-y-10">
             
             {/* Dead-Man Panel */}
             <div className="p-8 rounded-[40px] border-2 border-red-600/10 bg-red-600/[0.02] space-y-6 relative overflow-hidden group">
                <Skull className="absolute -bottom-6 -right-6 w-24 h-24 text-red-600 opacity-5 group-hover:scale-110 transition-transform duration-1000" />
                <div className="flex items-center gap-3 text-[9px] text-red-600 font-black uppercase tracking-[0.3em]">
                   <Skull className="w-4 h-4" /> DEAD_MAN_MODE
                </div>
                <div className="space-y-3">
                   <h3 className="text-xl font-black italic text-white uppercase tracking-tight leading-none">OTOMATİK_İMHA</h3>
                   <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest leading-relaxed">OTURUM_KAPANDIĞINDA_VERİLERİ_KALICI_OLARAK_SİLER.</p>
                </div>
                <button 
                  onClick={() => setDeadManEnabled(!deadManEnabled)}
                  className={`w-full py-5 rounded-[24px] text-[9px] font-black uppercase tracking-widest transition-all ${deadManEnabled ? "bg-red-600 text-white shadow-[0_10px_20px_hsla(var(--primary),0.2)]" : "bg-white/[0.02] text-zinc-800 border border-white/10 hover:border-red-600/40"}`}
                >
                   {deadManEnabled ? "SİSTEM_ARMED" : "SİSTEMİ_ARM_ET"}
                </button>
             </div>

             {/* Emergency Wipe */}
             <div className="obsidian-card p-8 rounded-[40px] border-2 border-white/5 space-y-4">
                <h4 className="text-[9px] text-zinc-800 font-black uppercase tracking-widest">ACİL_DURUM_TEMİZLİĞİ</h4>
                <button className="w-full bg-white/[0.02] border border-red-900/40 text-red-900 py-4 rounded-[24px] text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                   PANIC_WIPE
                </button>
             </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
