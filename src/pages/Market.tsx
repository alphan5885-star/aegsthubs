import { useEffect, useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import {
  // Category & UI Standard Icons
  Terminal, Shield, ShieldAlert, ShieldCheck, Lock, Unlock, Key, KeyRound, FileCode, Binary,
  Cpu, HardDrive, Server, Database, Network, Globe, Activity, Eye, EyeOff, FlaskConical,
  Droplet, Flame, Sparkles, Zap, Dna, HeartPulse, Microscope, Atom, Syringe, Radio,
  Tv, Wifi, WifiOff, Satellite, Antenna, Cable, Smartphone, Tablet, Laptop, Monitor,
  Component, Layers, Settings, Wrench, Hammer, Scissors, Lightbulb, Truck, Package,
  Box, MapPin, Compass, Navigation, Map, Anchor, Plane, Ship, ShoppingBag, Tag,
  QrCode, Barcode, Coins, DollarSign, Euro, CreditCard, Wallet, Briefcase, Scale,
  FileText, Layers3, UserCheck, Users, Share2, ExternalLink, LockKeyhole, Ghost, Skull,
  Bug, Search, HelpCircle, Info, AlertTriangle, Command, Fingerprint, MousePointer, Radar,
  TrendingUp, LineChart, GitBranch, ArrowRight, ChevronRight, Grid, List, FolderOpen,
  Power, MessageSquare, History, Disc, Volume2, Heart, LockKeyholeOpen, Folder, Play,
  Sliders, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/lib/router-shim";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { useAuth } from "@/lib/authContext";
import { Star } from "lucide-react";
import { getProductAverageRating } from "@/lib/productReviews";

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  image_emoji: string | null;
  image_url: string | null;
  stock: number;
  category: string | null;
  subcategory?: string | null;
  subsubcategory?: string | null;
}

// 100+ Icon Registry for Dynamic Customization Mapping
const ICON_MAP: Record<string, any> = {
  Terminal, Shield, ShieldAlert, ShieldCheck, Lock, Unlock, Key, KeyRound, FileCode, Binary,
  Cpu, HardDrive, Server, Database, Network, Globe, Activity, Eye, EyeOff, FlaskConical,
  Droplet, Flame, Sparkles, Zap, Dna, HeartPulse, Microscope, Atom, Syringe, Radio,
  Tv, Wifi, WifiOff, Satellite, Antenna, Cable, Smartphone, Tablet, Laptop, Monitor,
  Component, Layers, Settings, Wrench, Hammer, Scissors, Lightbulb, Truck, Package,
  Box, MapPin, Compass, Navigation, Map, Anchor, Plane, Ship, ShoppingBag, Tag,
  QrCode, Barcode, Coins, DollarSign, Euro, CreditCard, Wallet, Briefcase, Scale,
  FileText, Layers3, UserCheck, Users, Share2, ExternalLink, LockKeyhole, Ghost, Skull,
  Bug, Search, HelpCircle, Info, AlertTriangle, Command, Fingerprint, MousePointer, Radar,
  TrendingUp, LineChart, GitBranch, ArrowRight, ChevronRight, Grid, List, FolderOpen,
  Power, MessageSquare, History, Disc, Volume2, Heart, LockKeyholeOpen, Folder, Play,
  Sliders
};

// Types for customizable nodes
interface CategoryNode {
  id: string;
  label: string;
  iconName?: string;
  items?: CategoryNode[];
}

const DEFAULT_CATEGORY_TREE: CategoryNode[] = [
  {
    id: "DIGITAL",
    label: "DİJİTAL VARLIKLAR // DIGITAL",
    iconName: "FileCode",
    items: [
      {
        id: "CYBER_SECURITY",
        label: "Siber Güvenlik & Kod",
        iconName: "Terminal",
        items: [
          { id: "EXPLOIT_PAYLOADS", label: "Exploit & Güvenlik Yamaları", iconName: "Bug" },
          { id: "PENETRATION_KITS", label: "Sızma Test Yazılım Paketleri", iconName: "KeyRound" },
          { id: "ZERO_DAY_REPORTS", label: "Güvenlik Açığı Raporları", iconName: "ShieldAlert" }
        ]
      },
      {
        id: "DATA_LEAKS",
        label: "İstihbarat & Veritabanları",
        iconName: "Database",
        items: [
          { id: "OSINT_COLLECTIONS", label: "OSINT Kamu Dizinleri", iconName: "Search" },
          { id: "FINANCIAL_LOGS", label: "Teknik Sistem Log Dökümleri", iconName: "FileText" },
          { id: "GOVERNMENT_ARCHIVES", label: "Kurumsal Kamu Veri Setleri", iconName: "Globe" }
        ]
      },
      {
        id: "NETWORKING_CRYPT",
        label: "Ağ & Şifreleme Çözümleri",
        iconName: "Network",
        items: [
          { id: "SOCKS5_PROXIES", label: "Socks5 Proxy & Tünelleme", iconName: "Shield" },
          { id: "VPN_ROUTING", label: "Özel Kriptolu VPN Hatları", iconName: "Lock" },
          { id: "PGP_CRYPTO", label: "PGP Anahtar Yönetimi & Yazılım", iconName: "Key" }
        ]
      }
    ]
  },
  {
    id: "PHYSICAL",
    label: "FİZİKSEL DONANIM // PHYSICAL",
    iconName: "HardDrive",
    items: [
      {
        id: "HARDWARE_HACKING",
        label: "Donanım Müdahale Cihazları",
        iconName: "Cpu",
        items: [
          { id: "SDR_RF_TRANSCEIVERS", label: "RF & SDR Alıcı-Verici Telsizler", iconName: "Radio" },
          { id: "USB_INJECTORS", label: "USB Protokol Enjektörleri", iconName: "Binary" },
          { id: "PROTO_ANALYSERS", label: "Bus Pirate & Protokol Analizör", iconName: "Component" }
        ]
      },
      {
        id: "COMMUNICATION_GEAR",
        label: "Güvenli Haberleşme Donanımları",
        iconName: "Radio",
        items: [
          { id: "EMF_SHIELDS", label: "Faraday Kafesi Sinyal Torbaları", iconName: "Zap" },
          { id: "MODDED_ANON_ROUTERS", label: "Modlu OpenWRT/Tor Routerlar", iconName: "Wifi" }
        ]
      },
      {
        id: "PHYSICAL_BYPASS",
        label: "Fiziksel Güvenlik Aşımı",
        iconName: "KeyRound",
        items: [
          { id: "LOCKPICK_TOOLS", label: "Profesyonel Maymuncuk Setleri", iconName: "Wrench" },
          { id: "RFID_CLONERS", label: "RFID/NFC Klonlayıcı (Proxmark3)", iconName: "Fingerprint" },
          { id: "KEY_IMPRINTING", label: "Fiziksel Anahtar Döküm Kitleri", iconName: "Hammer" }
        ]
      }
    ]
  },
  {
    id: "STEALTH_LOGISTICS",
    label: "GİZLİLİK & LOJİSTİK // LOGISTICS",
    iconName: "Truck",
    items: [
      {
        id: "DEAD_DROP_LOCS",
        label: "Güvenli Dead-Drop Noktaları",
        iconName: "Globe",
        items: [
          { id: "GPS_DROP_COORDS", label: "Şifreli GPS Drop Lokasyonları", iconName: "MapPin" },
          { id: "DEAD_DROP_BOXES", label: "Kamufle Fiziksel Kilitli Kutular", iconName: "Box" }
        ]
      },
      {
        id: "STEALTH_PACKAGING",
        label: "Yanıltıcı Gizli Paketleme",
        iconName: "Package",
        items: [
          { id: "EMF_SHIELD_POUCH", label: "GPS Engelleyici Alüminyum Torba", iconName: "Radar" },
          { id: "DECOY_CONTAINERS", label: "Stealth Decoy Taşıma Kapları", iconName: "Anchor" }
        ]
      }
    ]
  },
  {
    id: "LAB_REAGENTS",
    label: "KİMYASALLAR & LABORATUVAR // LABS",
    iconName: "FlaskConical",
    items: [
      {
        id: "REAGENT_TESTS",
        label: "Kimyasal Reaktif Test Kitleri",
        iconName: "ShieldCheck",
        items: [
          { id: "REAGENT_TEST_KITS", label: "Saha Saflık Reaktif Test Kitleri", iconName: "FlaskConical" },
          { id: "ANALYTICAL_SCALES", label: "Mikrogram Analitik Hassas Terazi", iconName: "Scale" }
        ]
      },
      {
        id: "ORGANIC_SOLVENTS",
        label: "Ekstraksiyon & Sentez Çözücüleri",
        iconName: "FlaskConical",
        items: [
          { id: "INDUSTRIAL_ACETONE", label: "Susuz Aseton %99.8 (Anhydrous)", iconName: "Droplet" },
          { id: "ETHYL_ETHER", label: "Diyetil Eter (Stabilized)", iconName: "Flame" },
          { id: "DCM_SOLVENT", label: "Diklorometan (DCM) %99.9", iconName: "FlaskConical" }
        ]
      },
      {
        id: "LAB_GLASSWARE",
        label: "Laboratuvar Cam & Distilasyon",
        iconName: "Layers",
        items: [
          { id: "DISTILLATION_COLUMNS", label: "Fraksiyonel Distilasyon Kolonları", iconName: "Layers" },
          { id: "BOROSILICATE_FLASKS", label: "Borosilikat Dibi Yuvarlak Balonlar", iconName: "Disc" },
          { id: "VACUUM_PUMPS", label: "Diyaframlı Vakum Pompaları", iconName: "Power" }
        ]
      }
    ]
  },
  {
    id: "INFRASTRUCTURE",
    label: "ALTYAPI & SUNUCU // SERVERS",
    iconName: "Server",
    items: [
      {
        id: "BULLETPROOF_HOST",
        label: "Kurşun Geçirmez Barındırma",
        iconName: "Lock",
        items: [
          { id: "OFFSHORE_VPS", label: "Offshore Güvenli Sanal Sunucular", iconName: "Server" },
          { id: "BULLETPROOF_DEDICATED", label: "DMCA Korumalı Fiziksel Sunucu", iconName: "LockKeyhole" }
        ]
      },
      {
        id: "DECENTRALIZED_VPS",
        label: "Merkeziyetsiz Sunucu Ağları",
        iconName: "Network",
        items: [
          { id: "PEER_HOSTING", label: "Eşler Arası Güvenli Web Hosting", iconName: "Globe" },
          { id: "ANON_NODE_MGMT", label: "Yönetilen Tor & I2P Röle Node'ları", iconName: "Activity" }
        ]
      }
    ]
  }
];

// Map category node IDs to i18n keys for dynamic translation
const CAT_ID_TO_KEY: Record<string, string> = {
  DIGITAL: "cat.digital", CYBER_SECURITY: "cat.cyber", EXPLOIT_PAYLOADS: "cat.exploits",
  PENETRATION_KITS: "cat.pents", ZERO_DAY_REPORTS: "cat.vulns", DATA_LEAKS: "cat.intel",
  OSINT_COLLECTIONS: "cat.osint", FINANCIAL_LOGS: "cat.logs", GOVERNMENT_ARCHIVES: "cat.sets",
  NETWORKING_CRYPT: "cat.crypt", SOCKS5_PROXIES: "cat.socks", VPN_ROUTING: "cat.vpn",
  PGP_CRYPTO: "cat.pgp", PHYSICAL: "cat.physical", HARDWARE_HACKING: "cat.hw_hack",
  SDR_RF_TRANSCEIVERS: "cat.rf", USB_INJECTORS: "cat.usb", PROTO_ANALYSERS: "cat.bus",
  COMMUNICATION_GEAR: "cat.secure_comm", EMF_SHIELDS: "cat.faraday",
  MODDED_ANON_ROUTERS: "cat.routers", PHYSICAL_BYPASS: "cat.bypass",
  LOCKPICK_TOOLS: "cat.lockpick", RFID_CLONERS: "cat.rfid", KEY_IMPRINTING: "cat.keys",
  STEALTH_LOGISTICS: "cat.logistics", DEAD_DROP_LOCS: "cat.drops",
  GPS_DROP_COORDS: "cat.gps", DEAD_DROP_BOXES: "cat.boxes",
  STEALTH_PACKAGING: "cat.packaging", EMF_SHIELD_POUCH: "cat.pouches",
  DECOY_CONTAINERS: "cat.containers", LAB_REAGENTS: "cat.labs",
  REAGENT_TESTS: "cat.reagents", REAGENT_TEST_KITS: "cat.purity",
  ANALYTICAL_SCALES: "cat.scales", ORGANIC_SOLVENTS: "cat.solvents",
  INDUSTRIAL_ACETONE: "cat.acetone", ETHYL_ETHER: "cat.ether",
  DCM_SOLVENT: "cat.dcm", LAB_GLASSWARE: "cat.glass",
  DISTILLATION_COLUMNS: "cat.columns", BOROSILICATE_FLASKS: "cat.flasks",
  VACUUM_PUMPS: "cat.pumps", INFRASTRUCTURE: "cat.servers",
  BULLETPROOF_HOST: "cat.bulletproof", OFFSHORE_VPS: "cat.vps",
  BULLETPROOF_DEDICATED: "cat.dedicated", DECENTRALIZED_VPS: "cat.decentralized",
  PEER_HOSTING: "cat.hosting", ANON_NODE_MGMT: "cat.nodes",
};

export default function Market() {
  const { role } = useAuth();
  const { t } = useI18n();

  // Translate a category node label using its ID key mapping
  const getCatLabel = useCallback((id: string, fallback: string): string => {
    const key = CAT_ID_TO_KEY[id];
    if (!key) return fallback;
    const translated = t(key as any);
    // If t() just echoed the key back, fall back to original label
    return translated === key ? fallback : translated;
  }, [t]);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");
  
  // Customizable categoryTree state initialized from localstorage or default
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>(() => {
    const saved = localStorage.getItem("aeigs_category_tree");
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORY_TREE;
  });

  // Admin Customizer Panel states
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [selectedNodeToEdit, setSelectedNodeToEdit] = useState<{ id: string; label: string; iconName?: string } | null>(null);
  const [iconSearch, setIconSearch] = useState("");

  // Navigation states for our deeply nested hierarchy
  const [activeRoot, setActiveRoot] = useState<string>("ALL");
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [activeSubSub, setActiveSubSub] = useState<string | null>(null);

  // Accordion expanded tracking
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    DIGITAL: true,
    PHYSICAL: true,
    STEALTH_LOGISTICS: true,
    LAB_REAGENTS: true,
    INFRASTRUCTURE: true
  });

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Fetch the global category tree from the database on initial mount
  useEffect(() => {
    const fetchGlobalTree = async () => {
      try {
        const { data, error } = await supabase
          .from("system_announcements")
          .select("content")
          .eq("id", "00000000-0000-0000-0000-000000000000")
          .maybeSingle();
        
        if (data?.content) {
          const parsed = JSON.parse(data.content);
          setCategoryTree(parsed);
          localStorage.setItem("aeigs_category_tree", JSON.stringify(parsed));
        }
      } catch (err) {
        console.error("Error loading global category tree:", err);
      }
    };
    fetchGlobalTree();
  }, []);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .gt("stock", 0)
        .order("created_at", { ascending: false });
      if (data) {
        // Safe helper to resolve a category ID back to its Root, Sub, and Sub-sub nodes
        const resolveCategoryHierarchy = (categoryValue: string | null, tree: CategoryNode[]) => {
          if (!categoryValue) return null;
          for (const root of tree) {
            if (root.id === categoryValue) {
              return { root: root.id, sub: null, subsub: null };
            }
            for (const sub of (root.items || [])) {
              if (sub.id === categoryValue) {
                return { root: root.id, sub: sub.id, subsub: null };
              }
              for (const subsub of (sub.items || [])) {
                if (subsub.id === categoryValue) {
                  return { root: root.id, sub: sub.id, subsub: subsub.id };
                }
              }
            }
          }
          return null;
        };

        // Enforce systematic deep-nested categorization for robust simulation coverage
        const flatSubSub = categoryTree.flatMap(root => 
          (root.items || []).flatMap(sub => 
            (sub.items || []).map(subsub => ({
              root: root.id,
              sub: sub.id,
              subsub: subsub.id
            }))
          )
        );

        if (flatSubSub.length > 0) {
          const enriched = (data as ProductRow[]).map((p, i) => {
            const resolved = resolveCategoryHierarchy(p.category, categoryTree);
            if (resolved) {
              return {
                ...p,
                category: resolved.root,
                subcategory: resolved.sub,
                subsubcategory: resolved.subsub
              };
            }
            // Fallback round-robin for simulation mapping
            const catMap = flatSubSub[i % flatSubSub.length];
            return {
              ...p,
              category: catMap.root,
              subcategory: catMap.sub,
              subsubcategory: catMap.subsub
            };
          });
          setProducts(enriched);
        } else {
          setProducts(data as ProductRow[]);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [categoryTree]);

  // Complex multi-tiered filtering evaluation
  const filtered = products.filter((p) => {
    const matchesSearch = search 
      ? p.name.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()) 
      : true;
      
    let matchesCategory = true;
    if (activeRoot !== "ALL") {
      matchesCategory = p.category === activeRoot;
      if (activeSub) {
        matchesCategory = matchesCategory && p.subcategory === activeSub;
        if (activeSubSub) {
          matchesCategory = matchesCategory && p.subsubcategory === activeSubSub;
        }
      }
    }

    return matchesSearch && matchesCategory;
  });

  const selectNode = (rootId: string, subId: string | null = null, subSubId: string | null = null) => {
    setActiveRoot(rootId);
    setActiveSub(subId);
    setActiveSubSub(subSubId);
  };

  // Safe recursive function to update a category node label or icon inside categoryTree state
  const updateNodeInTree = (
    nodes: CategoryNode[],
    id: string,
    newLabel: string,
    newIcon?: string
  ): CategoryNode[] => {
    return nodes.map(node => {
      if (node.id === id) {
        return {
          ...node,
          label: newLabel,
          iconName: newIcon ?? node.iconName
        };
      }
      if (node.items) {
        return {
          ...node,
          items: updateNodeInTree(node.items, id, newLabel, newIcon)
        };
      }
      return node;
    });
  };

  const handleSaveNodeChanges = async (id: string, label: string, iconName?: string) => {
    const updatedTree = updateNodeInTree(categoryTree, id, label, iconName);
    setCategoryTree(updatedTree);
    localStorage.setItem("aeigs_category_tree", JSON.stringify(updatedTree));
    setSelectedNodeToEdit(null);

    // Persist globally in Supabase system_announcements for all users
    try {
      const { data: existing } = await supabase
        .from("system_announcements")
        .select("id")
        .eq("id", "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("system_announcements")
          .update({ content: JSON.stringify(updatedTree) })
          .eq("id", "00000000-0000-0000-0000-000000000000");
      } else {
        await supabase
          .from("system_announcements")
          .insert({
            id: "00000000-0000-0000-0000-000000000000",
            content: JSON.stringify(updatedTree),
            is_active: false
          });
      }
    } catch (err) {
      console.error("Error persisting global tree:", err);
    }
  };

  const handleResetToDefault = async () => {
    if (confirm(t("market.confirmReset"))) {
      setCategoryTree(DEFAULT_CATEGORY_TREE);
      localStorage.removeItem("aeigs_category_tree");
      setSelectedNodeToEdit(null);

      // Reset globally in Supabase
      try {
        await supabase
          .from("system_announcements")
          .delete()
          .eq("id", "00000000-0000-0000-0000-000000000000");
      } catch (err) {
        console.error("Error resetting global tree:", err);
      }
    }
  };

  return (
    <PageShell>
      <div className="max-w-[1340px] mx-auto space-y-8 py-2 font-mono relative text-zinc-300">
        
        {/* Floating Cyber ambient lights */}
        <div className="absolute -top-40 left-1/4 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[200px] h-[200px] bg-primary/3 rounded-full blur-[100px] pointer-events-none" />

        {/* Technical Directory Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-white/[0.04] pb-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-bold tracking-[0.3em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {t("market.hudLabel")}
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
              PAZAR<span className="text-primary opacity-90">.OS</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Dev-Only Admin Customizer Button */}
             {role === "admin" && (
               <button
                 onClick={() => setIsAdminPanelOpen(true)}
                 className="flex items-center gap-2 bg-primary/[0.08] hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_15px_rgba(255,0,0,0.05)] cursor-pointer animate-pulse"
               >
                  <Sliders className="w-3.5 h-3.5" />
                  [{t("market.dirEditor")}]
               </button>
             )}

             <div className="flex items-center gap-6 bg-[#050505]/40 backdrop-blur-xl border border-white/[0.03] px-6 py-2.5 rounded-2xl">
                <div className="space-y-0.5">
                   <div className="text-[6px] text-zinc-600 font-bold uppercase tracking-widest">{t("market.activeDir")}</div>
                   <div className="text-sm font-black text-white">{products.length} {t("market.dataBlock")}</div>
                </div>
                <div className="w-[1px] h-6 bg-white/[0.05]" />
                <div className="space-y-0.5">
                   <div className="text-[6px] text-zinc-600 font-bold uppercase tracking-widest">{t("market.encLayer")}</div>
                   <div className="flex items-center gap-1.5 text-primary">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black tracking-widest">ECDH_AES256</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Search & Controller Panel */}
        <div className="space-y-4 bg-[#030303]/30 border border-white/[0.03] p-4 rounded-[20px] backdrop-blur-xl relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Elegant Search bar */}
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-primary transition-colors duration-300" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("market.searchPlaceholder")}
                className="w-full bg-[#050505]/40 border border-white/[0.04] rounded-xl pl-11 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50 transition-all duration-300 font-bold placeholder:text-zinc-700 tracking-wider uppercase"
              />
            </div>

            {/* Layout switch controls */}
            <div className="flex items-center gap-1.5 self-end md:self-auto">
               <button
                 onClick={() => setViewMode("grid")}
                 className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${viewMode === "grid" ? "bg-primary/[0.08] text-primary border border-primary/20" : "bg-transparent border border-transparent text-zinc-600 hover:text-white"}`}
                 title={t("market.gridView")}
               >
                 <Grid className="w-4 h-4" />
               </button>
               <button
                 onClick={() => setViewMode("list")}
                 className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center ${viewMode === "list" ? "bg-primary/[0.08] text-primary border border-primary/20" : "bg-transparent border border-transparent text-zinc-600 hover:text-white"}`}
                 title={t("market.listView")}
               >
                 <List className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>

        {/* Main Grid: Collapsible Hierarchical Sidebar + Products Space */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
           
           {/* LEFT SIDEBAR: Collapsible multi-tiered darknet category tree */}
           <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar pr-2 select-none">
              
              {/* Reset to All Category Button */}
              <button
                onClick={() => selectNode("ALL")}
                className={`w-full text-left px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all duration-300 flex items-center justify-between ${
                  activeRoot === "ALL" 
                    ? "bg-primary/[0.08] border-primary/30 text-primary" 
                    : "bg-[#030303]/30 border-white/[0.03] text-zinc-400 hover:text-white hover:border-white/[0.08]"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FolderOpen className="w-4 h-4 shrink-0" />
                  {t("market.allAssets")}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeRoot === "ALL" ? "rotate-90 text-primary" : "text-zinc-600"}`} />
              </button>

              {/* Nested Collapsible Tree Directory */}
              <div className="space-y-4">
                 {categoryTree.map((rootNode) => {
                    const RootIcon = ICON_MAP[rootNode.iconName || "Layers"] || Layers;
                    const isRootExpanded = expandedGroups[rootNode.id];
                    const isRootActive = activeRoot === rootNode.id && !activeSub;
                    
                    return (
                      <div key={rootNode.id} className="bg-[#030303]/25 border border-white/[0.02] rounded-[20px] p-3.5 space-y-2">
                         
                         {/* ROOT ACCORDION HEADER */}
                         <div className="flex items-center justify-between">
                            <button
                              onClick={() => selectNode(rootNode.id)}
                              className={`flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                                isRootActive ? "text-primary" : "text-white hover:text-primary"
                              }`}
                            >
                               <RootIcon className="w-4 h-4 shrink-0" />
                               <span>{getCatLabel(rootNode.id, rootNode.label.split(" // ")[0])}</span>
                            </button>
                            
                            <button 
                              onClick={() => toggleGroup(rootNode.id)}
                              className="p-1.5 text-zinc-700 hover:text-white transition-colors"
                            >
                               <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isRootExpanded ? "rotate-90" : ""}`} />
                            </button>
                         </div>

                         {/* ROOT CHILDREN (1st Sub-Tier Accordion) */}
                         <AnimatePresence initial={false}>
                            {isRootExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-2 pt-2 border-t border-white/[0.03] overflow-hidden"
                              >
                                 {(rootNode.items || []).map((subNode) => {
                                    const SubIcon = ICON_MAP[subNode.iconName || "FileCode"] || FileCode;
                                    const isSubActive = activeSub === subNode.id && !activeSubSub;
                                    const isSubParent = activeSub === subNode.id;
                                    const hasDeepItems = !!subNode.items?.length;

                                    return (
                                      <div key={subNode.id} className="space-y-1.5 pl-2">
                                         
                                         {/* SUBACCORDION (Tier 1) ROW */}
                                         <button
                                           onClick={() => selectNode(rootNode.id, subNode.id)}
                                           className={`w-full text-left px-3 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wider flex items-center justify-between transition-all duration-300 ${
                                             isSubActive 
                                               ? "bg-primary/10 text-primary border-l border-primary" 
                                               : isSubParent 
                                                 ? "text-white font-black"
                                                 : "text-zinc-500 hover:text-zinc-200"
                                           }`}
                                         >
                                            <span className="flex items-center gap-2 truncate">
                                               <SubIcon className="w-3.5 h-3.5 shrink-0 text-zinc-600" />
                                               {getCatLabel(subNode.id, subNode.label)}
                                            </span>
                                            {hasDeepItems && (
                                              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSubParent ? "rotate-90 text-primary" : "text-zinc-700"}`} />
                                            )}
                                         </button>

                                         {/* SUB-SUB CHILDREN Accordion (Tier 2 - Deepest Level) */}
                                         <AnimatePresence initial={false}>
                                            {isSubParent && hasDeepItems && (
                                              <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-1 pl-4 overflow-hidden border-l border-white/[0.03] ml-3.5 pt-1 pb-2"
                                              >
                                                 {(subNode.items || []).map((deepNode) => {
                                                    const isDeepActive = activeSubSub === deepNode.id;
                                                    const count = products.filter(p => p.subsubcategory === deepNode.id).length;

                                                    return (
                                                      <button
                                                        key={deepNode.id}
                                                        onClick={() => selectNode(rootNode.id, subNode.id, deepNode.id)}
                                                        className={`w-full text-left px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-between ${
                                                          isDeepActive 
                                                            ? "bg-primary/5 text-primary border-l border-primary pl-4" 
                                                            : "text-zinc-600 hover:text-zinc-300"
                                                        }`}
                                                      >
                                                         <span className="truncate">{getCatLabel(deepNode.id, deepNode.label)}</span>
                                                         <span className={`text-[7px] px-1.5 py-0.2 rounded shrink-0 ${isDeepActive ? "bg-primary/20 text-primary" : "bg-black/50 text-zinc-800"}`}>
                                                            {count}
                                                         </span>
                                                      </button>
                                                    );
                                                 })}
                                              </motion.div>
                                            )}
                                         </AnimatePresence>

                                      </div>
                                    );
                                 })}
                              </motion.div>
                            )}
                         </AnimatePresence>

                      </div>
                    );
                 })}
              </div>
           </div>

           {/* CENTRAL PRODUCTS DISPLAY ZONE */}
           <div className="lg:col-span-8 space-y-6">
              
              {/* Premium Breadcrumb Path HUD */}
              <div className="flex flex-wrap items-center gap-2 bg-[#030303]/10 border border-white/[0.02] p-4 rounded-2xl text-[9px] font-bold tracking-wider uppercase">
                 <span className="text-zinc-600">{t("market")}</span>
                 <ChevronRight className="w-3 h-3 text-zinc-800" />
                 
                 <span className={activeRoot === "ALL" ? "text-white font-black" : "text-zinc-500"}>{t("market.allAssets")}</span>
                 
                 {activeRoot !== "ALL" && (
                   <>
                     <ChevronRight className="w-3 h-3 text-zinc-800" />
                     <span className={!activeSub ? "text-white font-black" : "text-zinc-500"}>{activeRoot}</span>
                   </>
                 )}
                 
                 {activeSub && (
                   <>
                     <ChevronRight className="w-3 h-3 text-zinc-800" />
                     <span className={!activeSubSub ? "text-white font-black" : "text-zinc-500"}>
                        {getCatLabel(activeSub, categoryTree.flatMap(root => root.items || []).find(sub => sub.id === activeSub)?.label || "").toUpperCase()}
                     </span>
                   </>
                 )}

                 {activeSubSub && (
                   <>
                     <ChevronRight className="w-3 h-3 text-zinc-800" />
                     <span className="text-primary font-black">
                        {getCatLabel(activeSubSub, categoryTree.flatMap(root => root.items || []).flatMap(sub => sub.items || []).find(deep => deep.id === activeSubSub)?.label || "").toUpperCase()}
                     </span>
                   </>
                 )}
                 
                 <div className="h-[1px] flex-1 bg-white/[0.02] min-w-[20px]" />
                 <span className="text-[7px] text-zinc-600 font-bold shrink-0">{filtered.length} {t("market.activeRecords")}</span>
              </div>

              <AnimatePresence mode="wait">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array(4).fill(0).map((_, i) => (
                      <div key={i} className="h-60 bg-white/[0.01] rounded-[20px] border border-white/[0.03] animate-pulse" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-[#030303]/30 p-16 rounded-[20px] border border-white/[0.03] text-center space-y-3"
                  >
                     <div className="text-sm font-black text-zinc-600 uppercase tracking-widest">{t("market.noProducts")}</div>
                     <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">{t("market.noProductsDesc")}</p>
                  </motion.div>
                ) : viewMode === "grid" ? (
                  
                  /* ================= GRID VIEW ================= */
                  <motion.div 
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  >
                    {filtered.map((p, i) => {
                      const matchedItem = categoryTree.flatMap(root => root.items || []).flatMap(sub => sub.items || []).find(item => item.id === p.subsubcategory);
                      return (
                        <Link key={p.id} to={`/product/${p.id}`}>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.01 }}
                            className="group relative bg-[#020202]/40 backdrop-blur-xl border border-white/[0.03] rounded-[24px] p-4.5 hover:border-primary/20 transition-all duration-500 flex flex-col justify-between h-[390px] hover:shadow-[0_0_35px_rgba(255,0,0,0.03)]"
                          >
                            {/* Upper Details */}
                            <div className="space-y-3 flex-1 flex flex-col">
                               <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 bg-black/40 border border-white/[0.04] rounded text-[6px] font-bold text-zinc-500 uppercase tracking-widest max-w-[140px] truncate">
                                     {matchedItem ? getCatLabel(matchedItem.id, matchedItem.label) : p.subsubcategory || "UNCLASSIFIED"}
                                  </span>
                                  
                                  <div className="flex items-center gap-1.5">
                                     {i % 3 === 0 && (
                                       <span className="text-primary text-[6px] font-black uppercase tracking-widest flex items-center gap-0.5">
                                          <Sparkles className="w-2 h-2 animate-pulse" /> SPARK
                                       </span>
                                     )}
                                     <span className="text-[7px] text-green-500 font-black flex items-center gap-0.5">
                                        <TrendingUp className="w-2.5 h-2.5" /> +{(Math.random() * 5 + 1).toFixed(1)}%
                                     </span>
                                  </div>
                               </div>

                               {/* Beautiful Premium Image block at the top */}
                               <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-black/40 border border-white/[0.04] flex items-center justify-center shrink-0">
                                  {p.image_url ? (
                                    <img 
                                      src={p.image_url} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" 
                                      alt={p.name}
                                    />
                                  ) : (
                                    <span className="text-4xl group-hover:scale-110 transition-all duration-700">{p.image_emoji || "📦"}</span>
                                  )}
                                  
                                  {/* Type Badge absolute inside image */}
                                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/85 border border-white/[0.05] rounded text-[6px] font-black text-primary uppercase tracking-widest">
                                     {p.type.toUpperCase()}
                                  </span>
                               </div>

                               <div className="space-y-0.5 min-w-0 pt-1">
                                  <h3 className="text-xs font-black text-white uppercase tracking-wider truncate group-hover:text-primary transition-colors duration-300">
                                     {p.name}
                                  </h3>
                                  <div className="flex items-center gap-2 text-[7px] text-zinc-600 font-bold uppercase tracking-wider">
                                     <span>{t("market.stockLabel")}: {p.stock} {t("market.units")}</span>
                                     <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                                     <span className="text-zinc-500">SECURE_ESCROW</span>
                                  </div>
                                  
                                  {/* 5-Star Rating display */}
                                  {(() => {
                                     const { avg, count } = getProductAverageRating(p.id);
                                     return (
                                        <div className="flex items-center gap-1.5 pt-1">
                                           <div className="flex items-center gap-0.5">
                                              {[1, 2, 3, 4, 5].map((s) => (
                                                 <Star 
                                                    key={s} 
                                                    className={`w-2.5 h-2.5 ${s <= Math.round(avg) ? "text-yellow-500 fill-yellow-500" : "text-zinc-800"}`} 
                                                 />
                                              ))}
                                           </div>
                                           <span className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest">
                                              ({count > 0 ? avg : "PUAN_YOK"})
                                           </span>
                                        </div>
                                     );
                                  })()}
                               </div>

                               <p className="text-[9.5px] text-zinc-500 font-medium uppercase tracking-wide leading-relaxed line-clamp-2 pt-1 flex-1">
                                  {p.description || "NO_PRODUCT_SPECIFICATIONS_FOUND_IN_LOGS"}
                                </p>
                            </div>

                            {/* Lower Pricing Info */}
                            <div className="border-t border-white/[0.03] pt-3 flex items-center justify-between mt-auto shrink-0">
                               <div className="space-y-0.5">
                                  <span className="text-[6px] text-zinc-600 font-black uppercase tracking-widest">{t("market.transferFee")}</span>
                                  <div className="text-base font-black text-white italic tracking-tighter">
                                     {p.price.toFixed(4)} <span className="text-[9px] text-primary not-italic font-bold">LTC</span>
                                  </div>
                               </div>
                               
                               <div className="w-8 h-8 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-zinc-500 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300 shadow-xl shrink-0">
                                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </motion.div>
                ) : (
                  
                  /* ================= LIST VIEW ================= */
                  <motion.div 
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {filtered.map((p, i) => {
                      const matchedItem = categoryTree.flatMap(root => root.items || []).flatMap(sub => sub.items || []).find(item => item.id === p.subsubcategory);
                      return (
                        <Link key={p.id} to={`/product/${p.id}`}>
                          <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.01 }}
                            className="group relative bg-[#020202]/30 backdrop-blur-xl border border-white/[0.03] rounded-2xl p-4 hover:border-primary/20 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                             {/* Details */}
                             <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="w-14 h-14 rounded-xl bg-black border border-white/[0.05] flex items-center justify-center overflow-hidden shrink-0">
                                   {p.image_url ? (
                                     <img 
                                       src={p.image_url} 
                                       className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" 
                                       alt={p.name}
                                     />
                                   ) : (
                                     <span className="text-2xl">{p.image_emoji || "📦"}</span>
                                   )}
                                </div>
                                <div className="min-w-0 flex-1">
                                   <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="text-xs font-black text-white uppercase tracking-wider truncate group-hover:text-primary transition-colors">
                                         {p.name}
                                      </h3>
                                      <span className="px-1.5 py-0.2 bg-black/40 border border-white/[0.04] rounded text-[6px] font-bold text-zinc-500 uppercase tracking-widest max-w-[150px] truncate">
                                         {matchedItem ? getCatLabel(matchedItem.id, matchedItem.label) : p.subsubcategory || "UNCLASSIFIED"}
                                      </span>
                                      
                                      {/* 5-Star Rating display */}
                                      {(() => {
                                         const { avg, count } = getProductAverageRating(p.id);
                                         return (
                                            <div className="flex items-center gap-1 bg-black/40 border border-white/[0.04] rounded-md px-1.5 py-0.5 shrink-0">
                                               {[1, 2, 3, 4, 5].map((s) => (
                                                  <Star 
                                                     key={s} 
                                                     className={`w-2 h-2 ${s <= Math.round(avg) ? "text-yellow-500 fill-yellow-500" : "text-zinc-800"}`} 
                                                  />
                                               ))}
                                               <span className="text-[6.5px] font-black text-zinc-500 uppercase ml-0.5">
                                                  {count > 0 ? avg : "PUAN_YOK"}
                                               </span>
                                            </div>
                                         );
                                      })()}
                                   </div>
                                   <p className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider leading-relaxed truncate max-w-lg mt-1">
                                      {p.description || "NO_PRODUCT_SPECIFICATIONS_FOUND_IN_LOGS"}
                                   </p>
                                </div>
                             </div>

                             {/* Pricing & Stocks */}
                             <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 border-white/[0.03] pt-2 md:pt-0">
                                <div className="text-left md:text-right">
                                   <span className="text-[6px] text-zinc-600 font-black uppercase tracking-widest block">{t("market.stockLabel")}</span>
                                   <span className="text-[9px] font-bold text-zinc-400">{p.stock} {t("market.units")}</span>
                                </div>

                                <div className="text-right">
                                   <span className="text-[6px] text-zinc-600 font-black uppercase tracking-widest block">{t("market.transferFee")}</span>
                                   <span className="text-xs font-black text-white italic tracking-tighter">
                                      {p.price.toFixed(4)} <span className="text-[8px] text-primary not-italic font-bold">LTC</span>
                                   </span>
                                </div>

                                <div className="w-8 h-8 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-zinc-600 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                   <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                             </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
           </div>

        </div>

        {/* Global HUD Footer */}
        <div className="flex justify-between items-center text-[7px] text-zinc-600 font-bold uppercase tracking-[0.8em] pt-8 border-t border-white/[0.04]">
           <span>ENCRYPTED_TRADING_FLOOR</span>
           <span>{t("market.systemStatus")}: ENCRYPTED_OK</span>
        </div>

      </div>

      {/* ========================================================
          HIGH-END OBSIDIAN ADMIN PANEL & 100+ ICON PICKER HUD
          ======================================================== */}
      <AnimatePresence>
         {role === "admin" && isAdminPanelOpen && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex justify-end select-none font-mono text-xs"
           >
              {/* Back close click */}
              <div className="absolute inset-0 cursor-pointer" onClick={() => setIsAdminPanelOpen(false)} />

              {/* Main Panel Content */}
              <motion.div
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full max-w-[500px] h-full bg-[#020202]/90 border-l border-white/[0.05] p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col justify-between z-10 overflow-y-auto no-scrollbar"
              >
                 <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                       <div className="space-y-0.5">
                          <span className="text-[6px] text-primary font-black uppercase tracking-[0.3em]">DEVELOPER_TOOLS</span>
                          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                             <Sliders className="w-4 h-4 text-primary" /> {t("market.dirEditor")}.HUD
                          </h2>
                       </div>
                       <button
                         onClick={() => setIsAdminPanelOpen(false)}
                         className="p-2 bg-white/[0.02] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
                       >
                          <X className="w-4 h-4" />
                       </button>
                    </div>

                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-relaxed">
                       {t("market.adminPanelDesc")}
                    </p>

                    {/* Node Selection List */}
                    <div className="space-y-3">
                       <span className="text-[7px] text-zinc-600 font-black uppercase tracking-widest">{t("market.editableDir")}</span>
                       <div className="space-y-2 border border-white/[0.03] p-3 rounded-2xl bg-black/40 max-h-[220px] overflow-y-auto no-scrollbar">
                          {categoryTree.map((rootNode) => (
                             <div key={rootNode.id} className="space-y-1.5">
                                {/* Root Edit */}
                                <button
                                  onClick={() => setSelectedNodeToEdit({ id: rootNode.id, label: rootNode.label, iconName: rootNode.iconName })}
                                  className={`w-full text-left px-3 py-2 rounded-xl border flex items-center justify-between text-[8px] font-black uppercase transition-all ${
                                    selectedNodeToEdit?.id === rootNode.id 
                                      ? "bg-primary/10 border-primary text-primary" 
                                      : "bg-transparent border-transparent text-zinc-300 hover:bg-white/[0.02]"
                                  }`}
                                >
                                   <span className="flex items-center gap-2">
                                      <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                                      {getCatLabel(rootNode.id, rootNode.label)}
                                   </span>
                                   <span className="text-[6px] text-zinc-600">DÜZENLE</span>
                                </button>

                                {/* Subs Edit */}
                                {(rootNode.items || []).map((subNode) => (
                                   <div key={subNode.id} className="pl-4 space-y-1">
                                      <button
                                        onClick={() => setSelectedNodeToEdit({ id: subNode.id, label: subNode.label, iconName: subNode.iconName })}
                                        className={`w-full text-left px-3 py-1.5 rounded-lg border flex items-center justify-between text-[8px] font-bold uppercase transition-all ${
                                          selectedNodeToEdit?.id === subNode.id 
                                            ? "bg-primary/10 border-primary text-primary" 
                                            : "bg-transparent border-transparent text-zinc-400 hover:bg-white/[0.02]"
                                        }`}
                                      >
                                         <span className="flex items-center gap-2">
                                            <FileCode className="w-3.5 h-3.5 text-zinc-600" />
                                            {getCatLabel(subNode.id, subNode.label)}
                                         </span>
                                         <span className="text-[6px] text-zinc-600">{t("edit")}</span>
                                      </button>

                                      {/* Sub-subs Edit */}
                                      {(subNode.items || []).map((deepNode) => (
                                         <button
                                           key={deepNode.id}
                                           onClick={() => setSelectedNodeToEdit({ id: deepNode.id, label: deepNode.label, iconName: deepNode.iconName })}
                                           className={`w-full text-left px-3 py-1 rounded-md border flex items-center justify-between text-[8px] font-medium uppercase transition-all pl-8 ${
                                             selectedNodeToEdit?.id === deepNode.id 
                                               ? "bg-primary/10 border-primary text-primary" 
                                               : "bg-transparent border-transparent text-zinc-500 hover:bg-white/[0.01]"
                                           }`}
                                         >
                                            <span>{getCatLabel(deepNode.id, deepNode.label)}</span>
                                            <span className="text-[6px] text-zinc-600">{t("edit")}</span>
                                         </button>
                                      ))}
                                   </div>
                                ))}
                             </div>
                          ))}
                       </div>
                    </div>

                    {/* Active Editor Panel */}
                    {selectedNodeToEdit && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/60 border border-white/[0.04] p-4 rounded-2xl space-y-4"
                      >
                         <div className="flex items-center justify-between border-b border-white/[0.03] pb-2">
                            <span className="text-[8px] text-primary font-black uppercase tracking-widest">{t("market.activeEditMode")}</span>
                            <button onClick={() => setSelectedNodeToEdit(null)} className="text-[8px] text-zinc-600 hover:text-white uppercase font-bold">{t("close")}</button>
                         </div>

                         {/* Text Rename Input */}
                         <div className="space-y-1.5">
                            <label className="text-[7px] text-zinc-600 font-bold uppercase">{t("market.categoryLabel")}</label>
                            <input
                              value={selectedNodeToEdit.label}
                              onChange={(e) => setSelectedNodeToEdit(prev => prev ? { ...prev, label: e.target.value } : null)}
                              className="w-full bg-black border border-white/[0.05] rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-primary/50 font-bold uppercase tracking-wider"
                            />
                         </div>

                         {/* 100+ Siberian Icon Picker */}
                         <div className="space-y-2">
                            <div className="flex items-center justify-between">
                               <label className="text-[7px] text-zinc-600 font-bold uppercase">{t("market.iconName")}</label>
                               <span className="text-[7px] text-primary font-black uppercase">{t("market.selected")}: {selectedNodeToEdit.iconName || "NONE"}</span>
                            </div>

                            {/* Search bar inside picker */}
                            <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                               <input
                                 value={iconSearch}
                                 onChange={(e) => setIconSearch(e.target.value)}
                                 placeholder={t("market.iconSearch")}
                                 className="w-full bg-black/85 border border-white/[0.04] rounded-lg pl-8 pr-3 py-1.5 text-[8px] text-white focus:outline-none focus:border-primary/30 uppercase font-bold placeholder:text-zinc-700"
                               />
                            </div>

                            {/* Icons Grid container */}
                            <div className="grid grid-cols-8 gap-1.5 border border-white/[0.03] p-2 rounded-xl bg-black max-h-[140px] overflow-y-auto no-scrollbar">
                               {Object.keys(ICON_MAP)
                                 .filter(key => key.toLowerCase().includes(iconSearch.toLowerCase()))
                                 .map((key) => {
                                   const IconNode = ICON_MAP[key];
                                   const isSelected = selectedNodeToEdit.iconName === key;
                                   return (
                                     <button
                                       key={key}
                                       onClick={() => setSelectedNodeToEdit(prev => prev ? { ...prev, iconName: key } : null)}
                                       className={`p-2 rounded-lg border flex items-center justify-center transition-all ${
                                         isSelected 
                                           ? "bg-primary/20 border-primary text-primary" 
                                           : "bg-white/[0.01] border-white/[0.03] text-zinc-500 hover:text-white hover:bg-white/[0.05]"
                                       }`}
                                       title={key}
                                     >
                                        <IconNode className="w-3.5 h-3.5" />
                                     </button>
                                   );
                                 })}
                            </div>
                         </div>

                         {/* Save Node Action */}
                         <button
                           onClick={() => handleSaveNodeChanges(selectedNodeToEdit.id, selectedNodeToEdit.label, selectedNodeToEdit.iconName)}
                           className="w-full bg-primary hover:bg-primary/80 text-white font-bold py-2 rounded-xl uppercase text-[9px] tracking-widest transition-colors cursor-pointer"
                         >
                            {t("market.applyChanges")}
                         </button>
                      </motion.div>
                    )}

                 </div>

                 {/* Reset system */}
                 <div className="border-t border-white/[0.04] pt-4 mt-6 flex justify-between gap-4">
                    <button
                      onClick={handleResetToDefault}
                      className="px-4 py-2 border border-red-500/20 hover:border-red-500/50 bg-red-500/[0.03] hover:bg-red-500/10 text-red-500 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                       {t("market.resetFactory")}
                    </button>
                    <button
                      onClick={() => setIsAdminPanelOpen(false)}
                      className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl text-[8px] font-bold text-zinc-400 hover:text-white uppercase transition-all cursor-pointer"
                    >
                       {t("close")}
                    </button>
                 </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>

    </PageShell>
  );
}
