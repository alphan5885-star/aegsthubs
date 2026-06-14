import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import {
  Plus,
  Package,
  Key,
  Upload,
  Trash2,
  Edit2,
  TrendingUp,
  ShoppingBag,
  Coins,
  ArrowUpRight,
  Zap,
  Activity,
  Box,
  Save,
  X,
  FileJson,
  Layers,
  Image as ImageIcon,
  FolderOpen,
  Eye,
  FileImage,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PendingShipmentsPanel from "@/components/PendingShipmentsPanel";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useI18n } from "@/lib/i18n";

interface ProductRow {
  id: string;
  name: string | null;
  title: string;
  description: string | null;
  price: number;
  type: string | null;
  stock: number | null;
  image_emoji: string | null;
  image_url: string | null;
  delivery_data: string | null;
  tracking_number: string | null;
  category: string | null;
  origin: string | null;
  destination: string | null;
  is_active: boolean | null;
}

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
    items: [
      {
        id: "CYBER_SECURITY",
        label: "Siber Güvenlik & Kod",
        items: [
          { id: "EXPLOIT_PAYLOADS", label: "Exploit & Güvenlik Yamaları" },
          { id: "PENETRATION_KITS", label: "Sızma Test Yazılım Paketleri" },
          { id: "ZERO_DAY_REPORTS", label: "Güvenlik Açığı Raporları" },
        ],
      },
      {
        id: "DATA_LEAKS",
        label: "İstihbarat & Veritabanları",
        items: [
          { id: "OSINT_COLLECTIONS", label: "OSINT Kamu Dizinleri" },
          { id: "FINANCIAL_LOGS", label: "Teknik Sistem Log Dökümleri" },
          { id: "GOVERNMENT_ARCHIVES", label: "Kurumsal Kamu Veri Setleri" },
        ],
      },
      {
        id: "NETWORKING_CRYPT",
        label: "Ağ & Şifreleme Çözümleri",
        items: [
          { id: "SOCKS5_PROXIES", label: "Socks5 Proxy & Tünelleme" },
          { id: "VPN_ROUTING", label: "Özel Kriptolu VPN Hatları" },
          { id: "PGP_CRYPTO", label: "PGP Anahtar Yönetimi & Yazılım" },
        ],
      },
    ],
  },
  {
    id: "PHYSICAL",
    label: "FİZİKSEL DONANIM // PHYSICAL",
    items: [
      {
        id: "HARDWARE_HACKING",
        label: "Donanım Müdahale Cihazları",
        items: [
          {
            id: "SDR_RF_TRANSCEIVERS",
            label: "RF & SDR Alıcı-Verici Telsizler",
          },
          { id: "USB_INJECTORS", label: "USB Protokol Enjektörleri" },
          { id: "PROTO_ANALYSERS", label: "Bus Pirate & Protokol Analizör" },
        ],
      },
      {
        id: "COMMUNICATION_GEAR",
        label: "Güvenli Haberleşme Donanımları",
        items: [
          { id: "EMF_SHIELDS", label: "Faraday Kafesi Sinyal Torbaları" },
          { id: "MODDED_ANON_ROUTERS", label: "Modlu OpenWRT/Tor Routerlar" },
        ],
      },
      {
        id: "PHYSICAL_BYPASS",
        label: "Fiziksel Güvenlik Aşımı",
        items: [
          { id: "LOCKPICK_TOOLS", label: "Profesyonel Maymuncuk Setleri" },
          { id: "RFID_CLONERS", label: "RFID/NFC Klonlayıcı (Proxmark3)" },
          { id: "KEY_IMPRINTING", label: "Fiziksel Anahtar Döküm Kitleri" },
        ],
      },
    ],
  },
  {
    id: "STEALTH_LOGISTICS",
    label: "GİZLİLİK & LOJİSTİK // LOGISTICS",
    items: [
      {
        id: "DEAD_DROP_LOCS",
        label: "Güvenli Dead-Drop Noktaları",
        items: [
          { id: "GPS_DROP_COORDS", label: "Şifreli GPS Drop Lokasyonları" },
          { id: "DEAD_DROP_BOXES", label: "Kamufle Fiziksel Kilitli Kutular" },
        ],
      },
      {
        id: "STEALTH_PACKAGING",
        label: "Yanıltıcı Gizli Paketleme",
        items: [
          { id: "EMF_SHIELD_POUCH", label: "GPS Engelleyici Alüminyum Torba" },
          { id: "DECOY_CONTAINERS", label: "Stealth Decoy Taşıma Kapları" },
        ],
      },
    ],
  },
  {
    id: "LAB_REAGENTS",
    label: "KİMYASALLAR & LABORATUVAR // LABS",
    items: [
      {
        id: "REAGENT_TESTS",
        label: "Kimyasal Reaktif Test Kitleri",
        items: [
          {
            id: "REAGENT_TEST_KITS",
            label: "Saha Saflık Reaktif Test Kitleri",
          },
          {
            id: "ANALYTICAL_SCALES",
            label: "Mikrogram Analitik Hassas Terazi",
          },
        ],
      },
      {
        id: "ORGANIC_SOLVENTS",
        label: "Ekstraksiyon & Sentez Çözücüleri",
        items: [
          { id: "INDUSTRIAL_ACETONE", label: "Susuz Aseton %99.8 (Anhydrous)" },
          { id: "ETHYL_ETHER", label: "Diyetil Eter (Stabilized)" },
          { id: "DCM_SOLVENT", label: "Diklorometan (DCM) %99.9" },
        ],
      },
      {
        id: "LAB_GLASSWARE",
        label: "Laboratuvar Cam & Distilasyon",
        items: [
          {
            id: "DISTILLATION_COLUMNS",
            label: "Fraksiyonel Distilasyon Kolonları",
          },
          {
            id: "BOROSILICATE_FLASKS",
            label: "Borosilikat Dibi Yuvarlak Balonlar",
          },
          { id: "VACUUM_PUMPS", label: "Diyaframlı Vakum Pompaları" },
        ],
      },
    ],
  },
  {
    id: "INFRASTRUCTURE",
    label: "ALTYAPI & SUNUCU // SERVERS",
    items: [
      {
        id: "BULLETPROOF_HOST",
        label: "Kurşun Geçirmez Barındırma",
        items: [
          { id: "OFFSHORE_VPS", label: "Offshore Güvenli Sanal Sunucular" },
          {
            id: "BULLETPROOF_DEDICATED",
            label: "DMCA Korumalı Fiziksel Sunucu",
          },
        ],
      },
      {
        id: "DECENTRALIZED_VPS",
        label: "Merkeziyetsiz Sunucu Ağları",
        items: [
          { id: "PEER_HOSTING", label: "Eşler Arası Güvenli Web Hosting" },
          { id: "ANON_NODE_MGMT", label: "Yönetilen Tor & I2P Röle Node'ları" },
        ],
      },
    ],
  },
];

const EMOJIS = [
  "🔌",
  "📦",
  "🔬",
  "🧪",
  "🔑",
  "🗺️",
  "🛡️",
  "📞",
  "💻",
  "💾",
  "📡",
  "🗃️",
];

// Baseline exchange rates for local multi-currency conversions
const RATES = {
  BTC: 96500, // BTC/USD
  LTC: 84, // LTC/USD
  XMR: 180, // XMR/USD
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dynamic Category Tree loaded from database or falling back to default
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>(
    DEFAULT_CATEGORY_TREE,
  );

  const [stats, setStats] = useState({
    totalSales: 0,
    activeProducts: 0,
    pendingOrders: 0,
    totalRevenue: 0,
  });

  // State to manage Product Form Drawer (for both Creating and Editing)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Listing Currency State
  const [listingCurrency, setListingCurrency] = useState<"LTC" | "BTC" | "XMR">(
    "LTC",
  );

  // Cascading Category selectors
  const [selectedRoot, setSelectedRoot] = useState<string>("");
  const [selectedSub, setSelectedSub] = useState<string>("");
  const [selectedSubSub, setSelectedSubSub] = useState<string>("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "", // price entered in listingCurrency
    stock: "",
    type: "digital",
    deliveryData: "",
    origin: "",
    destination: "",
    imageEmoji: EMOJIS[0],
    imageUrl: "",
  });

  // JSON Batch Import state
  const [batchJson, setBatchJson] = useState("");
  const [injecting, setInjecting] = useState(false);

  // Custom Local File Upload reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGlobalCategoryTree = async () => {
    try {
      const { data } = await supabase
        .from("system_announcements")
        .select("content")
        .eq("id", "00000000-0000-0000-0000-000000000000")
        .maybeSingle();

      if (data && data.content) {
        const parsed = JSON.parse(data.content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategoryTree(parsed);
          return parsed;
        }
      }
    } catch (err) {
      console.warn(
        "Failed fetching global custom category tree, falling back.",
        err,
      );
    }
    setCategoryTree(DEFAULT_CATEGORY_TREE);
    return DEFAULT_CATEGORY_TREE;
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const currentTree = await fetchGlobalCategoryTree();

      const [prodRes, orderRes] = await Promise.all([
        supabase
          .from("products")
          .select("*")
          .eq("vendor_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*")
          .eq("vendor_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (prodRes.data) setProducts(prodRes.data as any);
      if (orderRes.data) {
        const ords = orderRes.data;
        setOrders(ords);

        const totalRevenue = ords.reduce(
          (acc: any, o: any) =>
            acc + (o.status === "completed" ? Number(o.amount) : 0),
          0,
        );

        setStats({
          totalSales: ords.length,
          activeProducts: prodRes.data?.length || 0,
          pendingOrders: ords.filter(
            (o: any) => o.status === "processing" || o.status === "pending",
          ).length,
          totalRevenue,
        });

        // Chart sales map over last 7 days
        const chartMap = new Map();
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toLocaleDateString("tr-TR", { weekday: "short" });
          chartMap.set(dateStr, 0);
        }
        ords.forEach((o: any) => {
          const dateStr = new Date(o.created_at).toLocaleDateString("tr-TR", {
            weekday: "short",
          });
          if (chartMap.has(dateStr)) {
            chartMap.set(dateStr, chartMap.get(dateStr) + Number(o.amount));
          }
        });
        setSalesData(
          Array.from(chartMap).map(([name, value]) => ({ name, value })),
        );
      }
    } catch (err) {
      console.error("Error fetching vendor data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Dynamic cascading category resolution when editing an existing product
  const resolveCategoryHierarchy = (
    categoryValue: string | null,
    tree: CategoryNode[],
  ) => {
    if (!categoryValue) return null;
    for (const root of tree) {
      if (root.id === categoryValue)
        return { root: root.id, sub: "", subsub: "" };
      for (const sub of root.items || []) {
        if (sub.id === categoryValue)
          return { root: root.id, sub: sub.id, subsub: "" };
        for (const subsub of sub.items || []) {
          if (subsub.id === categoryValue)
            return { root: root.id, sub: sub.id, subsub: subsub.id };
        }
      }
    }
    return null;
  };

  // Convert custom currency price to LTC value for backend escrow compatibility
  const convertPriceToLTC = (
    amount: number,
    from: "LTC" | "BTC" | "XMR",
  ): number => {
    if (from === "LTC") return amount;
    const amountInUSD = amount * RATES[from];
    return amountInUSD / RATES.LTC;
  };

  // Convert LTC value from database back to specified display currency
  const convertPriceFromLTC = (
    ltcAmount: number,
    to: "LTC" | "BTC" | "XMR",
  ): number => {
    if (to === "LTC") return ltcAmount;
    const amountInUSD = ltcAmount * RATES.LTC;
    return amountInUSD / RATES[to];
  };

  // Handle Custom Local Image File Upload via FileReader Base64 decoder
  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen geçerli bir resim dosyası seçin.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, imageUrl: reader.result as string }));
      toast.success("Özel ürün görseli başarıyla yüklendi.");
    };
    reader.readAsDataURL(file);
  };

  // Handle Add/Edit product submit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.name || !form.price) {
      toast.error("Lütfen ürün adı ve fiyat alanlarını doldurun.");
      return;
    }

    const inputPrice = parseFloat(form.price);
    const stockNum = form.stock ? parseInt(form.stock) : null;

    if (isNaN(inputPrice) || inputPrice <= 0) {
      toast.error("Geçerli bir fiyat girmelisiniz.");
      return;
    }

    // Convert listing currency inputs directly to base LTC value for database storage
    const ltcPrice = convertPriceToLTC(inputPrice, listingCurrency);

    // Dynamic lowest level selected category ID
    const dbCategory = selectedSubSub || selectedSub || selectedRoot || null;

    if (!dbCategory) {
      toast.error("Lütfen en az bir ana kategori seçimi yapın.");
      return;
    }

    setSaving(true);
    try {
      const productPayload = {
        name: form.name,
        title: form.name, // Set both to avoid constraint errors
        description: form.description || null,
        price: ltcPrice, // stored strictly in base LTC
        stock: stockNum,
        type: form.type,
        delivery_data: form.type === "digital" ? form.deliveryData : null,
        category: dbCategory,
        origin: form.type === "physical" ? form.origin : null,
        destination: form.type === "physical" ? form.destination : null,
        image_emoji: form.imageEmoji,
        image_url: form.imageUrl || null,
        vendor_id: user.id,
        is_active: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from("products")
          .update(productPayload as any)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Ürün envanter kaydı başarıyla güncellendi.");
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productPayload as any);

        if (error) throw error;
        toast.success("Yeni ürün envantere başarıyla kaydedildi.");
      }

      // Reset form and reload
      handleResetForm();
      fetchData();
    } catch (err: any) {
      toast.error(`Kayıt başarısız: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (p: ProductRow) => {
    setEditingId(p.id);

    // Resolve the category cascading levels
    const resolved = resolveCategoryHierarchy(p.category, categoryTree);
    if (resolved) {
      setSelectedRoot(resolved.root);
      setSelectedSub(resolved.sub);
      setSelectedSubSub(resolved.subsub);
    } else {
      setSelectedRoot("");
      setSelectedSub("");
      setSelectedSubSub("");
    }

    // Default to displaying LTC for custom pricing edits
    setListingCurrency("LTC");

    setForm({
      name: p.name || p.title,
      description: p.description || "",
      price: String(p.price),
      stock: p.stock !== null ? String(p.stock) : "",
      type: p.type || "digital",
      deliveryData: p.delivery_data || "",
      origin: p.origin || "",
      destination: p.destination || "",
      imageEmoji: p.image_emoji || EMOJIS[0],
      imageUrl: p.image_url || "",
    });
    setShowForm(true);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (
      !confirm(
        `"${name}" adlı ürünü envanterden tamamen silmek istediğinize emin misiniz?`,
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;
      toast.success("Ürün envanterden silindi.");
      fetchData();
    } catch (err: any) {
      toast.error(`Silme başarısız: ${err.message}`);
    }
  };

  const handleResetForm = () => {
    setEditingId(null);
    setListingCurrency("LTC");
    setSelectedRoot("");
    setSelectedSub("");
    setSelectedSubSub("");
    setForm({
      name: "",
      description: "",
      price: "",
      stock: "",
      type: "digital",
      deliveryData: "",
      origin: "",
      destination: "",
      imageEmoji: EMOJIS[0],
      imageUrl: "",
    });
    setShowForm(false);
  };

  // Process JSON batch payload injection
  const handleBatchInject = async () => {
    if (!user) return;
    if (!batchJson.trim()) {
      toast.error("Lütfen enjekte edilecek bir JSON verisi girin.");
      return;
    }

    setInjecting(true);
    try {
      const parsed = JSON.parse(batchJson);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON kök öğesi bir liste (array) olmalıdır.");
      }

      const enriched = parsed.map((item: any) => {
        // Handle conversion of bulk items labeled in other currencies to base LTC
        let rawPrice = Number(item.price || 0.05);
        if (
          item.currency &&
          (item.currency === "BTC" || item.currency === "XMR")
        ) {
          rawPrice = convertPriceToLTC(rawPrice, item.currency);
        }

        return {
          vendor_id: user.id,
          name: item.name || item.title || "Adsız Siber Yük",
          title: item.title || item.name || "Adsız Siber Yük",
          description: item.description || null,
          price: rawPrice,
          stock: item.stock !== undefined ? Number(item.stock) : 10,
          type: item.type || "digital",
          category: item.category || "DIGITAL",
          delivery_data: item.delivery_data || null,
          origin: item.origin || null,
          destination: item.destination || null,
          image_emoji: item.image_emoji || EMOJIS[0],
          image_url: item.image_url || null,
          is_active: true,
        };
      });

      const { error } = await supabase.from("products").insert(enriched);

      if (error) throw error;
      toast.success(
        `${enriched.length} adet ürün toplu olarak envantere enjekte edildi!`,
      );
      setBatchJson("");
      fetchData();
    } catch (err: any) {
      toast.error(`JSON Enjeksiyonu başarısız: ${err.message}`);
    } finally {
      setInjecting(false);
    }
  };

  // Cascading selector nodes
  const rootNode = categoryTree.find((n) => n.id === selectedRoot);
  const subNode = rootNode?.items?.find((n) => n.id === selectedSub);

  // Conversion calculations for Multi-Coin Revenue HUD stats card
  const revenueBTC = convertPriceFromLTC(stats.totalRevenue, "BTC");
  const revenueXMR = convertPriceFromLTC(stats.totalRevenue, "XMR");

  return (
    <PageShell>
      <div className="max-w-[1340px] mx-auto space-y-12 py-2 font-mono relative text-zinc-300">
        {/* Siberian Ambient Neon Light */}
        <div className="absolute -top-40 right-1/4 w-[350px] h-[350px] bg-red-600/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Vendor Header HUD */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 border-b border-white/[0.04] pb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-bold tracking-[0.3em] uppercase">
              <Zap className="w-4 h-4 text-primary animate-pulse" />
              VENDOR_OPS_CENTER // ROOT_ACCESS_v5.5
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
              SATICI<span className="text-primary">.CORE</span>
            </h1>
          </div>

          <button
            onClick={() => {
              if (showForm) {
                handleResetForm();
              } else {
                setShowForm(true);
              }
            }}
            className="group flex items-center gap-3 bg-red-600 hover:bg-red-700 px-6 py-3.5 rounded-2xl transition-all duration-300 shadow-[0_10px_20px_rgba(255,0,0,0.1)] active:scale-95 cursor-pointer text-white"
          >
            <Plus className="w-4 h-4 text-white" />
            <span className="text-[9px] font-black uppercase tracking-widest">
              YENİ_KAYIT // EKLE
            </span>
          </button>
        </div>

        {/* Dynamic Telemetry Stats (With Multi-Coin LTC, BTC, XMR earnings!) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            {
              label: "TOPLAM_SATIŞ",
              value: stats.totalSales,
              icon: ShoppingBag,
              color: "text-white",
            },
            {
              label: "AKTİF_ENVANTER",
              value: stats.activeProducts,
              icon: Box,
              color: "text-zinc-400",
            },
            {
              label: "BEKLEYEN_TALEP",
              value: stats.pendingOrders,
              icon: Activity,
              color: "text-red-500",
            },
            {
              label: "TOPLAM_KAZANÇ",
              value: `${stats.totalRevenue.toFixed(3)} LTC`,
              icon: Coins,
              color: "text-primary",
              isRevenue: true,
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-[#040404]/55 backdrop-blur-xl p-6 rounded-3xl border border-white/[0.04] space-y-3 relative overflow-hidden group hover:border-white/[0.08] transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <ArrowUpRight className="w-3 h-3 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
                {stat.isRevenue ? (
                  <div className="mt-3 space-y-1.5">
                    <div className="text-xl font-black text-white italic tracking-tighter flex items-center gap-1.5">
                      <span className="text-primary text-[11px]">⚡</span>{" "}
                      {stats.totalRevenue.toFixed(3)}{" "}
                      <span className="text-[9px] text-zinc-500 not-italic font-bold">
                        LTC
                      </span>
                    </div>
                    <div className="text-xl font-black text-amber-500 italic tracking-tighter flex items-center gap-1.5">
                      <span className="text-[11px]">🪙</span>{" "}
                      {revenueBTC.toFixed(5)}{" "}
                      <span className="text-[9px] text-zinc-500 not-italic font-bold">
                        BTC
                      </span>
                    </div>
                    <div className="text-xl font-black text-red-500 italic tracking-tighter flex items-center gap-1.5">
                      <span className="text-[11px]">🔒</span>{" "}
                      {revenueXMR.toFixed(3)}{" "}
                      <span className="text-[9px] text-zinc-500 not-italic font-bold">
                        XMR
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`text-2xl font-black italic tracking-tighter mt-3 ${stat.color}`}
                  >
                    {stat.value}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  {stat.label}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Product Customizer Slide-Over Form Panel */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#050505]/85 backdrop-blur-2xl border border-white/[0.06] p-8 rounded-[36px] space-y-6 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary animate-pulse" />
                  <h2 className="text-lg font-black italic text-white uppercase">
                    {editingId
                      ? "ENVANTER_KAYDI_DÜZENLE"
                      : "YENİ_ENVANTER_KAYDI_AÇ"}
                  </h2>
                </div>
                <button
                  onClick={handleResetForm}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={handleSaveProduct}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[10px]"
              >
                {/* Left Form Block (Properties) */}
                <div className="space-y-4">
                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      ÜRÜN ADI
                    </label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Siber envanter adını girin..."
                      className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600/40 font-bold"
                    />
                  </div>

                  {/* Description field */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      AÇIKLAMA
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Teknik detayları ve açıklamayı girin..."
                      rows={3}
                      className="w-full bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-white focus:outline-none focus:border-red-600/40 font-bold resize-none"
                    />
                  </div>

                  {/* Listing Currency & Price Selection (BTC, LTC, XMR Support) */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      LİSTELEME PARA BİRİMİ & FİYAT
                    </label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {["LTC", "BTC", "XMR"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setListingCurrency(c as any)}
                          className={`py-2 rounded-lg border font-bold transition-all cursor-pointer text-[9px] ${
                            listingCurrency === c
                              ? "bg-primary/15 border-red-600/40 text-white shadow-[0_0_10px_rgba(255,0,0,0.15)]"
                              : "bg-[#020202] border-white/[0.04] text-zinc-500 hover:text-white"
                          }`}
                        >
                          {c} {c === "BTC" ? "🪙" : c === "XMR" ? "🔒" : "⚡"}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <input
                          value={form.price}
                          onChange={(e) =>
                            setForm({ ...form, price: e.target.value })
                          }
                          placeholder="0.00"
                          type="number"
                          step="0.000001"
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-xl pl-4 pr-10 py-3 text-white focus:outline-none focus:border-red-600/40 font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-primary text-[9px]">
                          {listingCurrency}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <input
                          value={form.stock}
                          onChange={(e) =>
                            setForm({ ...form, stock: e.target.value })
                          }
                          placeholder="Stok adedi (Limitsiz: Boş)"
                          type="number"
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600/40 font-bold"
                        />
                      </div>
                    </div>

                    {form.price && !isNaN(parseFloat(form.price)) && (
                      <div className="p-3 bg-[#020202]/80 border border-white/[0.03] rounded-xl text-[8px] text-zinc-500 space-y-1 mt-2">
                        <div className="text-zinc-400 font-bold uppercase tracking-widest border-b border-white/[0.03] pb-1 mb-1">
                          DÖNÜŞÜM ÖNİZLEMESİ // BLOCKCHAIN CONVERTER
                        </div>
                        {listingCurrency !== "LTC" && (
                          <div>
                            UYUMLU DEĞER:{" "}
                            <span className="text-white font-bold">
                              {convertPriceToLTC(
                                parseFloat(form.price),
                                listingCurrency,
                              ).toFixed(4)}{" "}
                              LTC
                            </span>
                          </div>
                        )}
                        {listingCurrency !== "BTC" && (
                          <div>
                            BTC KARŞILIĞI:{" "}
                            <span className="text-white font-bold">
                              {convertPriceFromLTC(
                                convertPriceToLTC(
                                  parseFloat(form.price),
                                  listingCurrency,
                                ),
                                "BTC",
                              ).toFixed(6)}{" "}
                              BTC
                            </span>
                          </div>
                        )}
                        {listingCurrency !== "XMR" && (
                          <div>
                            XMR KARŞILIĞI:{" "}
                            <span className="text-white font-bold">
                              {convertPriceFromLTC(
                                convertPriceToLTC(
                                  parseFloat(form.price),
                                  listingCurrency,
                                ),
                                "XMR",
                              ).toFixed(4)}{" "}
                              XMR
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cascading Category Selection */}
                  <div className="space-y-2 border-t border-white/[0.03] pt-4">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-primary" />{" "}
                      DERECE_KATEGORİ_SEÇİMİ
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Root Selector */}
                      <div className="space-y-1">
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-black">
                          1. ANA SEVİYE
                        </span>
                        <select
                          value={selectedRoot}
                          onChange={(e) => {
                            setSelectedRoot(e.target.value);
                            setSelectedSub("");
                            setSelectedSubSub("");
                          }}
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-red-600/40 text-[9px] font-bold cursor-pointer"
                        >
                          <option value="">-- SEÇİN --</option>
                          {categoryTree.map((root) => (
                            <option key={root.id} value={root.id}>
                              {root.label.split(" // ")[0]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sub Selector */}
                      <div className="space-y-1">
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-black">
                          2. ALT SEVİYE
                        </span>
                        <select
                          value={selectedSub}
                          disabled={!selectedRoot}
                          onChange={(e) => {
                            setSelectedSub(e.target.value);
                            setSelectedSubSub("");
                          }}
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-red-600/40 text-[9px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <option value="">-- SEÇİN --</option>
                          {rootNode?.items?.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sub-Sub Selector */}
                      <div className="space-y-1">
                        <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-black">
                          3. DETAY SEVİYE
                        </span>
                        <select
                          value={selectedSubSub}
                          disabled={!selectedSub}
                          onChange={(e) => setSelectedSubSub(e.target.value)}
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-red-600/40 text-[9px] font-bold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <option value="">-- SEÇİN --</option>
                          {subNode?.items?.map((subsub) => (
                            <option key={subsub.id} value={subsub.id}>
                              {subsub.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Form Block (Delivery & Visual Media Assets) */}
                <div className="space-y-4">
                  {/* Product Type selection */}
                  <div className="space-y-1.5">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider">
                      TESLİMAT TÜRÜ
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      {["digital", "physical"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setForm({ ...form, type: t })}
                          className={`py-3 rounded-xl border font-bold transition-all cursor-pointer ${
                            form.type === t
                              ? "bg-primary/10 border-red-600/40 text-white"
                              : "bg-[#020202] border-white/[0.04] text-zinc-500 hover:text-white"
                          }`}
                        >
                          {t === "digital"
                            ? "DİJİTAL // ANINDA"
                            : "FİZİKSEL // SEVKİYAT"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional type rendering */}
                  {form.type === "digital" ? (
                    <div className="space-y-1.5">
                      <label className="text-zinc-500 font-bold uppercase tracking-wider">
                        DİJİTAL ANAHTARLAR / PAYLOAD (OTOMATİK TESLİMAT)
                      </label>
                      <textarea
                        value={form.deliveryData}
                        onChange={(e) =>
                          setForm({ ...form, deliveryData: e.target.value })
                        }
                        placeholder="Her satıra bir anahtar kodu/indirme linki girin..."
                        rows={4}
                        className="w-full bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-white focus:outline-none focus:border-red-600/40 font-bold resize-none"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 font-bold uppercase tracking-wider">
                          MENŞEİ (ORIGIN)
                        </label>
                        <input
                          value={form.origin}
                          onChange={(e) =>
                            setForm({ ...form, origin: e.target.value })
                          }
                          placeholder="Örn: NL, DE, DECRYPTED"
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600/40 font-bold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 font-bold uppercase tracking-wider">
                          HEDEF (DESTINATION)
                        </label>
                        <input
                          value={form.destination}
                          onChange={(e) =>
                            setForm({ ...form, destination: e.target.value })
                          }
                          placeholder="Örn: WW, EU, USA"
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-600/40 font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {/* 100% User Local Custom Image File Upload Uploader (No preset presets!) */}
                  <div className="space-y-2 border-t border-white/[0.03] pt-4">
                    <label className="text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-primary" />{" "}
                      CİHAZDAN ÜRÜN RESMİ YÜKLE
                    </label>

                    <div className="space-y-3">
                      {/* Dashed Cybernetic Upload Area */}
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-32 bg-[#020202] border-2 border-dashed border-white/5 hover:border-red-600/30 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 p-4 relative group"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCustomImageUpload}
                        />
                        <FileImage className="w-8 h-8 text-zinc-600 group-hover:text-red-500 transition-colors" />
                        <span className="text-[8px] text-zinc-500 group-hover:text-white uppercase tracking-widest font-black">
                          CİHAZINIZDAN BİR RESİM DOSYASI SEÇİN
                        </span>
                        <span className="text-[6px] text-zinc-700 font-bold">
                          PNG, JPG, WEBP DESTEKLENİR // MAX 5MB
                        </span>
                      </div>

                      {/* Preview and clear block */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        {/* EMOJI ICON FALLBACK SELECTOR */}
                        <div className="space-y-1">
                          <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-black">
                            ALTERNATİF GÖSTERGE EMOJİSİ
                          </span>
                          <div className="flex flex-wrap gap-1 p-2 bg-[#020202] border border-white/[0.04] rounded-xl">
                            {EMOJIS.slice(0, 8).map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() =>
                                  setForm({ ...form, imageEmoji: emoji })
                                }
                                className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-all cursor-pointer ${
                                  form.imageEmoji === emoji
                                    ? "bg-primary/20 border border-red-600/40"
                                    : "hover:bg-white/5 border border-transparent"
                                }`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Image Preview & removal HUD */}
                        <div className="space-y-1 relative">
                          <span className="text-[7px] text-zinc-500 uppercase tracking-widest font-black">
                            MEDYA ÖNİZLEME
                          </span>
                          <div className="w-full h-[65px] bg-[#020202] border border-white/[0.04] rounded-xl flex items-center justify-center overflow-hidden relative">
                            {form.imageUrl ? (
                              <>
                                <img
                                  src={form.imageUrl}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm({ ...form, imageUrl: "" })
                                  }
                                  className="absolute top-1 right-1 p-1 bg-black/80 rounded-md border border-white/10 hover:border-red-600/50 hover:text-red-500 transition-all cursor-pointer"
                                  title="Görseli Kaldır"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <span className="text-3xl">
                                {form.imageEmoji}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit block */}
                  <div className="flex gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black uppercase py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      {saving
                        ? "KAYDEDİLİYOR..."
                        : editingId
                          ? "DEĞİŞİKLİKLERİ_KAYDET"
                          : "YENİ_ÜRÜNÜ_EKLE"}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="bg-white/5 hover:bg-white/10 text-white font-black uppercase px-6 py-4 rounded-xl transition-all cursor-pointer"
                    >
                      İPTAL
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analytics & Import Segment */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Chart feed */}
          <div className="lg:col-span-8">
            <div className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-black italic text-white uppercase tracking-tight">
                    SATIŞ_ANALİTİĞİ
                  </h2>
                  <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">
                    SON_7_GÜN_TOPLAM_GELİR // LEDGER
                  </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600/5 border border-red-600/20 rounded-full">
                  <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">
                    LIVE_FEED
                  </span>
                </div>
              </div>

              <div className="h-[235px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient
                        id="colorSales"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ff0000"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ff0000"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      stroke="#4b5563"
                      fontSize={8}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#4b5563"
                      fontSize={8}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v} LTC`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#050505",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "12px",
                        fontSize: "9px",
                        fontFamily: "monospace",
                        color: "#fff",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#ff0000"
                      fillOpacity={1}
                      fill="url(#colorSales)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Action panel */}
          <div className="lg:col-span-4 space-y-8">
            <PendingShipmentsPanel />

            {/* Batch Import HUD */}
            <div className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6">
              <div className="flex items-center gap-2.5 text-[9px] text-primary font-bold uppercase tracking-widest">
                <FileJson className="w-4 h-4 animate-pulse" />{" "}
                JSON_BATCH_PAYLOAD_INJECTOR
              </div>

              <div className="space-y-4">
                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest leading-relaxed">
                  ÜRÜN ENVANTER LİSTESİNİ JSON DİZİSİ OLARAK YAZIP DİREKT
                  TABLOYA ENJEKTE EDİN.
                </p>
                <textarea
                  value={batchJson}
                  onChange={(e) => setBatchJson(e.target.value)}
                  placeholder={`[\n  {\n    "name": "Örnek Siber Yük",\n    "price": 0.025,\n    "currency": "BTC",\n    "stock": 100,\n    "type": "digital",\n    "category": "EXPLOIT_PAYLOADS",\n    "image_url": "https://..."\n  }\n]`}
                  className="w-full h-28 bg-[#020202] border border-white/[0.04] rounded-2xl p-4 text-[9px] text-zinc-300 focus:border-red-600/40 outline-none font-bold resize-none placeholder:text-zinc-700"
                />

                <button
                  onClick={handleBatchInject}
                  disabled={injecting}
                  className="w-full bg-white/[0.01] border border-white/10 hover:border-red-600/40 text-white py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/[0.04] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-primary" />
                  {injecting ? "YÜKLENİYOR..." : "INJECT_BATCH_PAYLOAD"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Envanter Listesi */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Package className="w-4 h-4 text-primary animate-pulse" />
            <div className="h-[1px] flex-1 bg-white/[0.04]" />
            <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.3em]">
              ENVANTER_KAYITLARI ({products.length})
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {products.map((p) => {
              const stock = p.stock;
              const isOutOfStock = stock !== null && stock <= 0;
              const isLowStock = stock !== null && stock > 0 && stock < 5;

              // Calculate equivalent rates for visual BTC and Monero support
              const btcValue = convertPriceFromLTC(p.price, "BTC");
              const xmrValue = convertPriceFromLTC(p.price, "XMR");

              return (
                <motion.div
                  key={p.id}
                  whileHover={{ x: 6 }}
                  className="bg-[#040404]/55 backdrop-blur-xl p-5 rounded-3xl border border-white/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 group hover:border-white/[0.08] transition-all duration-300"
                >
                  <div className="flex items-center gap-5">
                    {/* Visual Image Render instead of only emoji icons */}
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        className="w-12 h-12 rounded-2xl object-cover border border-white/[0.05] grayscale group-hover:grayscale-0 transition-all duration-300 shrink-0"
                        alt={p.name || p.title}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-black border border-white/[0.04] flex items-center justify-center text-2xl grayscale group-hover:grayscale-0 transition-all shrink-0">
                        {p.image_emoji || "📦"}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-white uppercase tracking-tighter group-hover:text-red-600 transition-colors">
                          {p.name || p.title}
                        </span>

                        {/* Type badges */}
                        <span
                          className={`text-[7px] font-black uppercase px-2 py-0.5 rounded ${
                            p.type === "digital"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-orange-500/10 text-orange-400"
                          }`}
                        >
                          {p.type === "digital" ? "DİJİTAL" : "FİZİKSEL"}
                        </span>

                        {/* Stock warning status badges */}
                        {isOutOfStock ? (
                          <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded bg-red-600/10 text-red-500 animate-pulse">
                            STOK_TÜKENDİ
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 animate-pulse">
                            KRİTİK_STOK ({stock})
                          </span>
                        ) : (
                          <span className="text-[7px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                            STOKTA ({stock ?? "LİMİTSİZ"})
                          </span>
                        )}
                      </div>

                      <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest flex flex-wrap items-center gap-1.5">
                        <span>KATEGORİ: {p.category || "Kategorisiz"}</span>
                        {p.origin && (
                          <span>
                            // ROTASYON: {p.origin} ➔ {p.destination}
                          </span>
                        )}
                      </div>

                      {p.description && (
                        <p className="text-[9px] text-zinc-400 max-w-[500px] line-clamp-1">
                          {p.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Valuation and multi-currency conversions block (LTC, BTC, XMR) */}
                  <div className="flex items-center gap-6 self-end sm:self-center shrink-0">
                    <div className="text-right space-y-0.5">
                      <div className="text-[7px] text-zinc-500 font-bold tracking-widest uppercase">
                        ENVANTER_DEĞERİ // MULTI_COIN
                      </div>
                      <div className="text-lg font-black text-white italic tracking-tighter">
                        {p.price.toFixed(4)}{" "}
                        <span className="text-xs text-primary not-italic">
                          LTC
                        </span>
                      </div>
                      <div className="text-[8px] text-zinc-500 font-bold space-x-1.5">
                        <span className="text-amber-500">
                          ≈ {btcValue.toFixed(5)} BTC
                        </span>
                        <span className="text-zinc-400">/</span>
                        <span className="text-red-400">
                          ≈ {xmrValue.toFixed(3)} XMR
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(p)}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleDeleteProduct(p.id, p.name || p.title)
                        }
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-zinc-500 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {products.length === 0 && !loading && (
              <div className="bg-[#040404]/55 border border-white/[0.04] p-10 rounded-[28px] text-center text-zinc-500 font-bold tracking-wider uppercase text-sm">
                Envanterde kayıtlı ürününüz bulunamadı.
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
