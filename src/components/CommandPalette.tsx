import { useEffect, useState, useRef } from "react";
import { useNavigate } from "@/lib/router-shim";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Package,
  Store,
  Wallet,
  ShoppingCart,
  Lock,
  Palette,
  MessageSquare,
  ArrowRightLeft,
  User,
  LayoutDashboard,
  Bot,
  Terminal,
  Activity,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Item = {
  id: string;
  label: string;
  sub?: string;
  icon: any;
  action: () => void;
  group: string;
};

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<{ id: string; name: string; price: number }[]>([]);
  const [vendors, setVendors] = useState<{ user_id: string; display_name: string }[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    const toggle = () => setOpen((v) => !v);
    window.addEventListener("keydown", handler);
    window.addEventListener("palette:toggle", toggle);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("palette:toggle", toggle);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return;
    }
    const fetchData = async () => {
      setAnalyzing(true);
      const [{ data: p }, { data: v }] = await Promise.all([
        supabase.from("products").select("id, name, price").gt("stock", 0).limit(20),
        supabase.from("profiles").select("user_id, display_name").limit(20),
      ]);
      setProducts((p as any) || []);
      setVendors((v as any) || []);
      setTimeout(() => setAnalyzing(false), 500);
    };
    fetchData();
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const pages: Item[] = [
    { id: "p1", label: "MARKET_HUB", icon: ShoppingCart, action: () => go("/market"), group: "SİSTEM_DİZİNİ" },
    { id: "p2", label: "SİPARİŞ_LOGLARI", icon: Package, action: () => go("/orders"), group: "SİSTEM_DİZİNİ" },
    { id: "p3", label: "HAZİNE_CÜZDANI", icon: Wallet, action: () => go("/wallet"), group: "SİSTEM_DİZİNİ" },
    { id: "p4", label: "İŞLEM_GEÇMİŞİ", icon: ArrowRightLeft, action: () => go("/transactions"), group: "SİSTEM_DİZİNİ" },
    { id: "p5", label: "TOPLULUK_FORUMU", icon: MessageSquare, action: () => go("/forum"), group: "SİSTEM_DİZİNİ" },
    { id: "p6", label: "GÜVENLİK_MERKEZİ", icon: Lock, action: () => go("/security-settings"), group: "SİSTEM_DİZİNİ" },
    { id: "p7", label: "KİMLİK_PROFİLİ", icon: User, action: () => go("/profile"), group: "SİSTEM_DİZİNİ" },
    { id: "p9", label: "OPERASYON_PANELİ", icon: Store, action: () => go("/vendor-dashboard"), group: "SİSTEM_DİZİNİ" },
  ];

  const actions: Item[] = [
    {
      id: "a1",
      label: "KIZILYÜREK_AI_AKTİVE_ET",
      icon: Bot,
      action: () => {
        setOpen(false);
        window.dispatchEvent(new CustomEvent("kizilyurek:toggle"));
      },
      group: "EYLEMLER",
    },
  ];

  const productItems: Item[] = products.map((p) => ({
    id: `prod-${p.id}`,
    label: p.name.toUpperCase(),
    sub: `${p.price.toFixed(4)} LTC // ASSET_ID: ${p.id.slice(0,8)}`,
    icon: Zap,
    action: () => go(`/product/${p.id}`),
    group: "BULUNAN_VARLIKLAR",
  }));

  const all = [...pages, ...actions, ...productItems];
  const q = query.toLowerCase().trim();
  const filtered = q
    ? all.filter((i) => i.label.toLowerCase().includes(q) || i.sub?.toLowerCase().includes(q))
    : all;

  const grouped: Record<string, Item[]> = {};
  filtered.forEach((i) => { (grouped[i.group] ||= []).push(i); });

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      filtered[activeIndex]?.action();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-2xl flex items-start justify-center pt-[10vh] p-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            className="w-full max-w-2xl bg-[#010101] border-2 border-white/5 rounded-[32px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search HUD Header */}
            <div className="flex items-center gap-6 px-10 py-8 border-b border-white/5 bg-white/[0.02]">
              <Search className={`w-6 h-6 ${analyzing ? "text-red-600 animate-pulse" : "text-zinc-700"}`} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="SİSTEMDE_ARAMA_YAPIN..."
                className="flex-1 bg-transparent outline-none text-xl font-black text-white placeholder:text-zinc-900 tracking-tight"
              />
              <div className="flex items-center gap-3">
                 <div className="text-[10px] text-zinc-800 font-black uppercase tracking-widest hidden md:block">RESOLVER_v4.2</div>
                 <div className="w-[1px] h-4 bg-white/5 hidden md:block" />
                 <kbd className="text-[10px] font-black text-zinc-700 border border-white/5 px-2 py-1 rounded-lg uppercase">ESC</kbd>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto no-scrollbar py-6">
              {Object.entries(grouped).map(([group, items]) => (
                <div key={group} className="space-y-2 mb-8">
                  <div className="px-10 flex items-center gap-4">
                     <div className="text-[9px] font-black text-red-900 uppercase tracking-[0.4em]">[{group}]</div>
                     <div className="h-[1px] flex-1 bg-white/5" />
                  </div>
                  {items.map((item) => {
                    const idx = filtered.indexOf(item);
                    const active = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={item.action}
                        className={`w-full flex items-center gap-6 px-10 py-4 text-left transition-all relative group ${active ? "bg-white/[0.03]" : "hover:bg-white/[0.01]"}`}
                      >
                        {active && <div className="absolute left-0 w-1.5 h-full bg-red-600 shadow-[0_0_15px_#ff0000]" />}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${active ? "bg-red-600 border-red-600 text-white shadow-[0_0_15px_rgba(255,0,0,0.3)]" : "bg-white/5 border-white/5 text-zinc-700 group-hover:text-white"}`}>
                           <item.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className={`text-sm font-black uppercase tracking-widest ${active ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`}>{item.label}</div>
                           {item.sub && <div className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest mt-1">{item.sub}</div>}
                        </div>
                        {active && <Activity className="w-4 h-4 text-red-900 animate-pulse" />}
                      </button>
                    );
                  })}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="px-10 py-20 text-center space-y-4">
                  <Terminal className="w-12 h-12 text-zinc-900 mx-auto" />
                  <div className="text-xl font-black text-zinc-900 uppercase tracking-tighter">VERİ_BULUNAMADI</div>
                </div>
              )}
            </div>

            <div className="px-10 py-4 border-t border-white/5 flex items-center justify-between bg-black/40">
               <div className="flex items-center gap-6 text-[8px] font-black text-zinc-800 uppercase tracking-widest">
                  <span>↑↓ NAVİGASYON</span>
                  <span>↵ SEÇİM</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-900 animate-pulse" />
                  <span className="text-[8px] font-black text-zinc-800 uppercase tracking-widest">SYSTEM_IDLE</span>
               </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
