import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import {
  Camera,
  Save,
  User,
  Package,
  CheckCircle,
  Loader2,
  Fingerprint,
  Zap,
  Shield,
  Award,
  Target,
  Database,
  Key,
  Globe,
  Activity,
  Info,
  Eye,
  Edit3,
  Lock,
  Cpu,
  Sparkles,
  Terminal,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import PanicButton from "@/components/PanicButton";
import PgpVault from "@/components/PgpVault";
import PgpBadge from "@/components/PgpBadge";
import CipherNotes from "@/components/CipherNotes";
import { useI18n } from "@/lib/i18n";

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  pgp_key: string | null;
  withdraw_pin_hash: string | null;
}

interface OrderRow {
  id: string;
  amount: number;
  status: string;
  delivery_confirmed: boolean;
  created_at: string;
  products: {
    name: string;
    image_url: string | null;
    image_emoji: string | null;
  } | null;
}

const RATES = {
  BTC: 96500,
  LTC: 84,
  XMR: 180,
};

export default function Profile() {
  const { user, role } = useAuth();
  const { t } = useI18n();

  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    avatar_url: null,
    banner_url: null,
    bio: "",
    pgp_key: null,
    withdraw_pin_hash: null,
  });
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<
    "identity" | "achievements" | "ledger" | "customization"
  >("identity");
  const [bioTab, setBioTab] = useState<"edit" | "preview">("edit");

  // Level Up Customization Cosmetic States
  const [avatarBorder, setAvatarBorder] = useState(
    () => localStorage.getItem("profile_cosmetic_avatar_border") || "none",
  );
  const [scanColor, setScanColor] = useState(
    () => localStorage.getItem("profile_cosmetic_scan_color") || "red",
  );
  const [nameEffect, setNameEffect] = useState(
    () => localStorage.getItem("profile_cosmetic_name_effect") || "none",
  );
  const [matrixBg, setMatrixBg] = useState(
    () => localStorage.getItem("profile_cosmetic_matrix_bg") || "none",
  );

  const saveCosmetic = (key: string, val: string, setter: any) => {
    localStorage.setItem(key, val);
    setter(val);
    toast.success("Kozmetik başarıyla kuşanıldı! 🎨");
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    if (!user) return;
    isMounted.current = true;

    const load = async () => {
      const cachedBanner = localStorage.getItem(`profile_banner_${user.id}`);

      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, bio, pgp_key, withdraw_pin_hash")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted.current) return;

      if (p) {
        setProfile({
          display_name: p.display_name,
          avatar_url: p.avatar_url,
          bio: p.bio,
          pgp_key: p.pgp_key,
          withdraw_pin_hash: p.withdraw_pin_hash,
          banner_url: cachedBanner || null,
        });
      }

      if (role === "buyer") {
        const { data: o } = await supabase
          .from("orders")
          .select(
            "id, amount, status, delivery_confirmed, created_at, products:product_id(name, image_url, image_emoji)",
          )
          .eq("buyer_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (o && isMounted.current) {
          setOrders(o as any);
        }
      }
    };
    load();

    return () => {
      isMounted.current = false;
    };
  }, [user, role]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profile.display_name,
          bio: profile.bio,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Kimlik kaydı başarıyla güncellendi. 🛡️");
    } catch (e) {
      toast.error("Profil güncellenirken hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "banner",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dosya boyutu 2MB sınırını aşamaz.");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        if (type === "avatar") {
          const { error } = await supabase
            .from("profiles")
            .update({ avatar_url: base64 })
            .eq("user_id", user!.id);
          if (error) throw error;
          setProfile((prev) => ({ ...prev, avatar_url: base64 }));
          toast.success("Kimlik resmi başarıyla güncellendi! 🎨");
        } else {
          localStorage.setItem(`profile_banner_${user!.id}`, base64);
          setProfile((prev) => ({ ...prev, banner_url: base64 }));
          toast.success("Kimlik afişi başarıyla güncellendi! 🎨");
        }
      } catch (err) {
        toast.error("Dosya yükleme başarısız.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const ACHIEVEMENTS = [
    {
      id: 1,
      label: "İLK_TEMAS",
      desc: "Sisteme başarılı giriş sağla.",
      icon: Globe,
      active: true,
    },
    {
      id: 2,
      label: "DİJİTAL_GÖLGE",
      desc: "PGP anahtarını Vault'a yükle.",
      icon: Key,
      active: !!profile.pgp_key,
    },
    {
      id: 3,
      label: "OPERATÖR",
      desc: "10 veya üzeri işlem hacmine ulaş.",
      icon: Activity,
      active: orders.length >= 10,
    },
    {
      id: 4,
      label: "VERİ_MADENCİSİ",
      desc: "En az 5 alışveriş tamamla.",
      icon: Database,
      active: orders.length >= 5,
    },
    {
      id: 5,
      label: "GÜVENLİ_LİMAN",
      desc: "Withdraw PIN kodunu aktif et.",
      icon: Shield,
      active: !!profile.withdraw_pin_hash,
    },
    {
      id: 6,
      label: "EFSANE",
      desc: "Profil kodunu ve biyografini doldur.",
      icon: Award,
      active: !!profile.display_name && !!profile.bio,
    },
  ];

  const activeCount = ACHIEVEMENTS.filter((a) => a.active).length;
  const progressPercent = Math.round((activeCount / ACHIEVEMENTS.length) * 100);

  return (
    <PageShell>
      <div className="max-w-[1300px] mx-auto py-2 space-y-12 font-mono text-zinc-300 relative">
        {/* Animated Background Laser Glow */}
        <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-red-600/[0.03] rounded-full blur-[180px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-20 right-10 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[150px] pointer-events-none" />

        {/* Outer Premium Holographic Header */}
        <div className="bg-[#030303]/60 backdrop-blur-2xl p-8 rounded-[36px] border border-white/[0.04] relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 cyber-grid opacity-[0.03]" />
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600/40 to-transparent" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                </span>
                <span className="text-[9px] text-zinc-500 font-black tracking-[0.4em] uppercase">
                  SECURITY_IDENTITY_LEAF // CLASSIFIED
                </span>
              </div>
              <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
                KİMLİK<span className="text-primary font-black">.SYS</span>
              </h1>
              <p className="text-[10px] text-zinc-500 max-w-xl uppercase font-bold tracking-wider leading-relaxed">
                Bu alandan genel profil kodunuzu, takma adınızı (Display Name),
                lokal şifrelenmiş biyografi metninizi yönetebilir ve PGP
                anahtarlarınızı güncelleyebilirsiniz.
              </p>
            </div>

            {/* Quick Actions Panel */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-[0_10px_25px_rgba(255,0,0,0.15)] hover:scale-[1.03] active:scale-95"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                KİMLİK_KAYDINI_ONAYLA
              </button>
            </div>
          </div>
        </div>

        {/* Master Content Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 8-COLUMN MAIN HUD */}
          <div className="lg:col-span-8 space-y-8">
            {/* Super premium holographic canvas header */}
            <div className="relative h-80 rounded-[40px] overflow-hidden border border-white/[0.05] bg-[#020202] shadow-2xl group">
              <div className="absolute inset-0 cyber-grid opacity-[0.06] z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

              {/* Image banner renderer */}
              {profile.banner_url ? (
                <img
                  src={profile.banner_url}
                  className="w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-60 transition-all duration-1000 scale-[1.01]"
                  alt="Profile Banner"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-zinc-950 via-zinc-900 to-black" />
              )}

              {/* Dynamic Matrix Cyber Grid background if equipped */}
              {matrixBg === "grid" && (
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,0,0,0.03)_1px,transparent_1px),linear-gradient(to_right,rgba(255,0,0,0.03)_1px,transparent_1px)] bg-[size:10px_10px] z-10 pointer-events-none animate-pulse" />
              )}

              {/* Holographic scanning laser line */}
              <div
                className={`absolute left-0 top-0 w-full h-[1.5px] z-10 animate-scan pointer-events-none ${
                  scanColor === "green"
                    ? "bg-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.8)]"
                    : scanColor === "cyan"
                      ? "bg-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                      : "bg-red-600/50 shadow-[0_0_15px_rgba(239,68,68,0.8)]"
                }`}
              />

              {/* Avatar position overlapping header */}
              <div className="absolute bottom-6 left-8 z-20 flex items-end gap-6">
                <div className="relative group/avatar">
                  {/* Glowing dynamic ring */}
                  <div
                    className={`absolute -inset-1 rounded-3xl blur-[8px] opacity-70 group-hover/avatar:opacity-100 transition-opacity animate-pulse ${
                      avatarBorder === "neon-red"
                        ? "bg-[#ff0000] shadow-[0_0_20px_#ff0000]"
                        : avatarBorder === "neon-cyan"
                          ? "bg-[#00f0ff] shadow-[0_0_20px_#00f0ff]"
                          : "bg-gradient-to-r from-red-600 to-amber-500"
                    }`}
                  />

                  <div
                    className={`w-28 h-28 rounded-3xl bg-black border-2 overflow-hidden relative shadow-2xl z-10 ${
                      avatarBorder === "neon-red"
                        ? "border-red-500"
                        : avatarBorder === "neon-cyan"
                          ? "border-cyan-400"
                          : "border-[#090909]"
                    }`}
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        className="w-full h-full object-cover"
                        alt="Avatar"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <User className="w-8 h-8 text-zinc-700" />
                      </div>
                    )}
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 bg-black/80 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer z-20"
                    >
                      <Camera className="w-6 h-6 text-primary" />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, "avatar")}
                    />
                  </div>
                </div>

                {/* Quick details next to avatar */}
                <div className="space-y-1 text-white z-20 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xl font-black italic tracking-tighter uppercase ${
                        nameEffect === "neon-glow"
                          ? "text-red-500 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                          : nameEffect === "gold-pulse"
                            ? "text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)] animate-bounce"
                            : "text-white"
                      }`}
                    >
                      {profile.display_name || "KULLANICI"}
                    </span>
                    <span className="text-[7px] font-black px-2 py-0.5 rounded bg-red-600/10 border border-red-500/20 text-primary uppercase tracking-widest">
                      {role === "vendor" ? "VENDOR_OPERATOR" : "SECURED_BUYER"}
                    </span>
                  </div>
                  <div className="text-[7px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-primary" />
                    NODE_ID: {user?.id.slice(0, 14).toUpperCase()}...
                  </div>
                </div>
              </div>

              {/* Banner edit button */}
              <button
                onClick={() => bannerRef.current?.click()}
                disabled={uploading}
                className="absolute top-6 right-6 bg-black/60 backdrop-blur-xl border border-white/[0.08] p-3 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-black/90 z-20"
              >
                <Camera className="w-4 h-4 text-primary" />
              </button>
              <input
                ref={bannerRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, "banner")}
              />
            </div>

            {/* Custom Interactive Tab Bar inside main dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-[#040404]/55 backdrop-blur-xl p-1.5 border border-white/[0.04] rounded-2xl text-[9px] font-black uppercase tracking-wider shadow-md">
              {[
                {
                  id: "identity",
                  label: "💻 Kimlik Yapılandırması",
                  desc: "Takma ad & Biyografi",
                },
                {
                  id: "achievements",
                  label: "🏆 Siber Başarımlar",
                  desc: "Aktivite & Güvenlik ödülleri",
                },
                {
                  id: "ledger",
                  label: "📦 Sipariş & İşlem Defteri",
                  desc: "Finansal intikal geçmişiniz",
                },
                {
                  id: "customization",
                  label: "🎨 Siber Arayüz Özelleştirici",
                  desc: "Level ödülleri & kozmetikler",
                },
              ].map((subTab) => {
                const isSelected = activeSubTab === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => {
                      setActiveSubTab(subTab.id as any);
                    }}
                    className={`py-3.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 ${
                      isSelected
                        ? "bg-red-600 text-white shadow-md shadow-red-600/10 scale-[1.02]"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.01]"
                    }`}
                  >
                    <span className="font-black tracking-widest">
                      {subTab.label}
                    </span>
                    <span
                      className={`text-[6px] tracking-wider font-bold ${isSelected ? "text-red-200" : "text-zinc-600"}`}
                    >
                      {subTab.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-Tab Display Switcher */}
            <AnimatePresence mode="wait">
              {activeSubTab === "identity" && (
                // ================= TAB: IDENTITY FIELDS =================
                <motion.div
                  key="identity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6 shadow-2xl"
                >
                  <div className="flex items-center gap-3 border-b border-white/[0.03] pb-4">
                    <Fingerprint className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-black italic text-white uppercase tracking-tight">
                      KİMLİK YAPILANDIRMA PANELİ
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Display name */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                        KOD ADINIZ (DISPLAY NAME)
                      </label>
                      <div className="relative group">
                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-30 group-focus-within:opacity-100 transition-all animate-pulse" />
                        <input
                          value={profile.display_name || ""}
                          onChange={(e) =>
                            setProfile({
                              ...profile,
                              display_name: e.target.value,
                            })
                          }
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-xl pl-12 pr-4 py-3.5 text-xs text-white focus:outline-none focus:border-red-600/40 font-bold uppercase tracking-wider"
                          placeholder="Takma adınızı belirleyin..."
                        />
                      </div>
                    </div>

                    {/* Node Role info card */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                        GÜVENLİK YETKİ SEVİYESİ
                      </label>
                      <div className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3.5 text-xs text-primary font-black uppercase tracking-widest flex items-center justify-between">
                        <span>
                          {role === "vendor"
                            ? "VENDOR_OPERATOR"
                            : "SECURED_BUYER"}
                        </span>
                        <Cpu className="w-4 h-4 text-primary animate-pulse" />
                      </div>
                    </div>

                    {/* Bio Textarea */}
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center justify-between border-b border-white/[0.03] pb-1.5">
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                          KİMLİK BİYOGRAFİSİ (BIO_ENCRYPTION)
                        </label>

                        <div className="flex bg-[#020202] p-1 border border-white/[0.04] rounded-lg gap-1 text-[8px] font-black uppercase tracking-wider">
                          <button
                            onClick={() => setBioTab("edit")}
                            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                              bioTab === "edit"
                                ? "bg-red-600 text-white"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            <Edit3 className="w-3 h-3 inline mr-1" /> Düzenle
                          </button>
                          <button
                            onClick={() => setBioTab("preview")}
                            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                              bioTab === "preview"
                                ? "bg-red-600 text-white"
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            <Eye className="w-3 h-3 inline mr-1" /> Önizleme
                          </button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {bioTab === "edit" ? (
                          <motion.div
                            key="edit"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <textarea
                              value={profile.bio || ""}
                              onChange={(e) =>
                                setProfile({ ...profile, bio: e.target.value })
                              }
                              className="w-full bg-[#020202] border border-white/[0.04] rounded-2xl px-4 py-4 text-xs text-white focus:outline-none focus:border-red-600/40 font-bold resize-none h-36 focus:ring-1 focus:ring-red-600/20"
                              placeholder="Diğer kullanıcılara gösterilecek biyografi metni..."
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full bg-[#020202] border border-white/[0.04] rounded-2xl px-4 py-4 text-xs text-zinc-300 h-36 overflow-auto font-bold leading-relaxed whitespace-pre-wrap"
                          >
                            {profile.bio || "Biyografi verisi yok."}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeSubTab === "achievements" && (
                // ================= TAB: ACHIEVEMENTS =================
                <motion.div
                  key="achievements"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                    <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-primary" />
                      <h2 className="text-sm font-black italic text-white uppercase tracking-tight">
                        KİMLİK BAŞARIMLARI
                      </h2>
                    </div>

                    <span className="text-[9px] font-black text-white bg-red-600/10 border border-red-500/20 px-3 py-1 rounded-lg">
                      {activeCount} / 6 AKTİF
                    </span>
                  </div>

                  {/* Trust indicator progress bar */}
                  <div className="p-5 bg-[#020202] border border-white/[0.03] rounded-2xl space-y-3">
                    <div className="flex justify-between items-center text-[9px] font-bold">
                      <span className="text-zinc-500 uppercase tracking-wider">
                        KİMLİK TAMAMLANMA YÜZDESİ
                      </span>
                      <span className="text-primary font-black tracking-widest">
                        {progressPercent}% SECURE
                      </span>
                    </div>
                    <div className="h-2 w-full bg-white/[0.02] border border-white/[0.05] rounded-full overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-[10px]">
                    {ACHIEVEMENTS.map((a) => (
                      <div
                        key={a.id}
                        className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-36 relative group overflow-hidden ${
                          a.active
                            ? "border-red-500/20 bg-red-600/[0.02] hover:border-red-500/30"
                            : "border-white/[0.03] opacity-30 grayscale"
                        }`}
                      >
                        {a.active && (
                          <div className="absolute -top-6 -right-6 w-12 h-12 bg-red-600/5 rounded-full blur-[8px] group-hover:scale-150 transition-all duration-500" />
                        )}

                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            a.active
                              ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                              : "bg-white/5 text-zinc-700"
                          }`}
                        >
                          <a.icon className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-black text-[9px] text-white uppercase tracking-wider flex items-center gap-1.5">
                            {a.label}
                            {a.active && (
                              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                            )}
                          </div>
                          <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-tight leading-none">
                            {a.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeSubTab === "ledger" && (
                // ================= TAB: TRANSACTION LEDGER =================
                <motion.div
                  key="ledger"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6 shadow-2xl"
                >
                  <div className="flex items-center gap-3 border-b border-white/[0.03] pb-4">
                    <Package className="w-5 h-5 text-primary animate-pulse" />
                    <h2 className="text-sm font-black italic text-white uppercase tracking-tight">
                      ALICI SİPARİŞ GEÇMİŞİ
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {orders.map((o) => {
                      const btcEquiv = o.amount * (RATES.LTC / RATES.BTC);
                      const xmrEquiv = o.amount * (RATES.LTC / RATES.XMR);

                      return (
                        <div
                          key={o.id}
                          className="bg-[#020202] p-5 rounded-2xl border border-white/[0.03] hover:border-white/[0.06] hover:shadow-[0_4px_20px_rgba(255,0,0,0.02)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[10px] group"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-3">
                              <span className="font-black text-white italic tracking-wider group-hover:text-primary transition-colors text-xs">
                                #{o.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span className="text-[8px] text-zinc-400 font-black bg-white/[0.02] border border-white/[0.04] px-2.5 py-0.5 rounded uppercase">
                                {o.products?.name || "Bilinmeyen Ürün"}
                              </span>
                            </div>
                            <div className="text-[7px] text-zinc-600 font-bold uppercase">
                              İŞLEM TARİHİ:{" "}
                              {new Date(o.created_at).toLocaleDateString(
                                "tr-TR",
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-6 text-right">
                            {/* Multicoin values */}
                            <div className="space-y-0.5">
                              <div className="text-[7px] text-zinc-500 font-bold uppercase">
                                LTC DEĞERİ
                              </div>
                              <div className="font-black text-emerald-500 italic text-xs">
                                {o.amount.toFixed(4)} LTC
                              </div>
                            </div>

                            <div className="hidden md:block space-y-0.5 border-l border-white/[0.04] pl-4">
                              <div className="text-[7px] text-zinc-600 font-bold uppercase">
                                CANLI KUR EŞDEĞERİ
                              </div>
                              <div className="text-[8px] font-bold space-x-1.5">
                                <span className="text-amber-500">
                                  {btcEquiv.toFixed(6)} BTC
                                </span>
                                <span className="text-zinc-600">/</span>
                                <span className="text-red-400">
                                  {xmrEquiv.toFixed(4)} XMR
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                                o.status === "completed" ||
                                o.status === "delivered"
                                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                  : o.status === "paid"
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                              }`}
                            >
                              {o.status === "completed"
                                ? "TAMAMLANDI"
                                : o.status === "delivered"
                                  ? "TESLİM EDİLDİ"
                                  : o.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {orders.length === 0 && (
                      <div className="bg-[#040404]/55 border border-white/[0.04] p-16 rounded-[28px] text-center text-zinc-500 font-bold tracking-wider uppercase text-xs">
                        Henüz sisteme intikal eden alıcı siparişiniz
                        bulunmamaktadır.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeSubTab === "customization" && (
                // ================= TAB: PROFILE CUSTOMIZATION =================
                <motion.div
                  key="customization"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-8 shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.03] pb-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-primary animate-spin" />
                      <h2 className="text-sm font-black italic text-white uppercase tracking-tight">
                        PROFİL ÖZELLEŞTİRME TERMİNALİ
                      </h2>
                    </div>
                    <span className="text-[9px] font-black text-white bg-red-600/10 border border-red-500/20 px-3 py-1 rounded-lg">
                      SEVİYE (LEVEL) {1 + activeCount} UYUMLU
                    </span>
                  </div>

                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-relaxed">
                    * SİSTEM BAŞARIMLARINI TAMAMLAYIP SEVİYE (LEVEL) ATLADIKÇA
                    KİLİTLİ ARAYÜZ VE KOZMETİK ÖDÜLLERİNİ ALABİLİRSİNİZ.
                    AŞAĞIDAN DİLEDİĞİNİZ KOZMETİĞİ SEÇEREK PROFİLİNİZİ SÜSLEYİN.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Item 1: Avatar Border */}
                    <div className="bg-[#020202] p-6 rounded-3xl border border-white/[0.03] space-y-4">
                      <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest flex justify-between items-center">
                        <span>AVATAR IŞIMA ÇERÇEVESİ</span>
                        <span className="text-primary font-black">
                          SEVİYE 2+ GEREKLİ
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "none", label: "STANDART", levelReq: 1 },
                          { id: "neon-red", label: "NEON RED", levelReq: 2 },
                          { id: "neon-cyan", label: "NEON CYAN", levelReq: 3 },
                        ].map((opt) => {
                          const locked = 1 + activeCount < opt.levelReq;
                          const active = avatarBorder === opt.id;
                          return (
                            <button
                              key={opt.id}
                              disabled={locked}
                              onClick={() =>
                                saveCosmetic(
                                  "profile_cosmetic_avatar_border",
                                  opt.id,
                                  setAvatarBorder,
                                )
                              }
                              className={`py-3 rounded-xl border text-[8px] font-black tracking-widest uppercase transition-all ${
                                locked
                                  ? "opacity-30 border-white/5 text-zinc-700 cursor-not-allowed"
                                  : active
                                    ? "border-red-600 bg-red-600/10 text-white shadow-md shadow-red-600/10"
                                    : "border-white/5 text-zinc-500 hover:border-white/10 cursor-pointer"
                              }`}
                            >
                              {opt.label} {locked && "🔒"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Item 2: Scanning Laser Color */}
                    <div className="bg-[#020202] p-6 rounded-3xl border border-white/[0.03] space-y-4">
                      <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest flex justify-between items-center">
                        <span>TARAYICI LAZER RENGİ</span>
                        <span className="text-primary font-black">
                          SEVİYE 3+ GEREKLİ
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "red", label: "STANDART", levelReq: 1 },
                          { id: "green", label: "MATRIX", levelReq: 3 },
                          { id: "cyan", label: "CYBER NEON", levelReq: 4 },
                        ].map((opt) => {
                          const locked = 1 + activeCount < opt.levelReq;
                          const active = scanColor === opt.id;
                          return (
                            <button
                              key={opt.id}
                              disabled={locked}
                              onClick={() =>
                                saveCosmetic(
                                  "profile_cosmetic_scan_color",
                                  opt.id,
                                  setScanColor,
                                )
                              }
                              className={`py-3 rounded-xl border text-[8px] font-black tracking-widest uppercase transition-all ${
                                locked
                                  ? "opacity-30 border-white/5 text-zinc-700 cursor-not-allowed"
                                  : active
                                    ? "border-red-600 bg-red-600/10 text-white shadow-md shadow-red-600/10"
                                    : "border-white/5 text-zinc-500 hover:border-white/10 cursor-pointer"
                              }`}
                            >
                              {opt.label} {locked && "🔒"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Item 3: Name Title Glow */}
                    <div className="bg-[#020202] p-6 rounded-3xl border border-white/[0.03] space-y-4">
                      <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest flex justify-between items-center">
                        <span>TAKMA AD EFEKTİ</span>
                        <span className="text-primary font-black">
                          SEVİYE 4+ GEREKLİ
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "none", label: "STANDART", levelReq: 1 },
                          { id: "neon-glow", label: "RED PULSE", levelReq: 4 },
                          {
                            id: "gold-pulse",
                            label: "LEGEND GOLD",
                            levelReq: 5,
                          },
                        ].map((opt) => {
                          const locked = 1 + activeCount < opt.levelReq;
                          const active = nameEffect === opt.id;
                          return (
                            <button
                              key={opt.id}
                              disabled={locked}
                              onClick={() =>
                                saveCosmetic(
                                  "profile_cosmetic_name_effect",
                                  opt.id,
                                  setNameEffect,
                                )
                              }
                              className={`py-3 rounded-xl border text-[8px] font-black tracking-widest uppercase transition-all ${
                                locked
                                  ? "opacity-30 border-white/5 text-zinc-700 cursor-not-allowed"
                                  : active
                                    ? "border-red-600 bg-red-600/10 text-white shadow-md shadow-red-600/10"
                                    : "border-white/5 text-zinc-500 hover:border-white/10 cursor-pointer"
                              }`}
                            >
                              {opt.label} {locked && "🔒"}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Item 4: Matrix BG */}
                    <div className="bg-[#020202] p-6 rounded-3xl border border-white/[0.03] space-y-4">
                      <div className="text-[9px] text-zinc-500 font-black uppercase tracking-widest flex justify-between items-center">
                        <span>ARKAPLAN DEKORASYONU</span>
                        <span className="text-primary font-black">
                          SEVİYE 5+ GEREKLİ
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "none", label: "STANDART", levelReq: 1 },
                          { id: "grid", label: "CYBER GRID", levelReq: 5 },
                        ].map((opt) => {
                          const locked = 1 + activeCount < opt.levelReq;
                          const active = matrixBg === opt.id;
                          return (
                            <button
                              key={opt.id}
                              disabled={locked}
                              onClick={() =>
                                saveCosmetic(
                                  "profile_cosmetic_matrix_bg",
                                  opt.id,
                                  setMatrixBg,
                                )
                              }
                              className={`py-3 rounded-xl border text-[8px] font-black tracking-widest uppercase transition-all ${
                                locked
                                  ? "opacity-30 border-white/5 text-zinc-700 cursor-not-allowed"
                                  : active
                                    ? "border-red-600 bg-red-600/10 text-white shadow-md shadow-red-600/10"
                                    : "border-white/5 text-zinc-500 hover:border-white/10 cursor-pointer"
                              }`}
                            >
                              {opt.label} {locked && "🔒"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT 4-COLUMN SIDEBAR MODULES */}
          <div className="lg:col-span-4 space-y-8">
            {/* Cyber vault secure tools */}
            <div className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-4 right-4 opacity-5">
                <Shield className="w-20 h-20 text-white" />
              </div>

              <div className="flex items-center gap-2.5 border-b border-white/[0.03] pb-3 text-[9px] text-primary font-black uppercase tracking-[0.2em]">
                <Lock className="w-4 h-4 animate-pulse" /> SİBER GÜVENLİK
                TERMİNALİ
              </div>

              <div className="space-y-6">
                <PgpBadge userId={user?.id || ""} size="md" />
                <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                <PgpVault />
                <CipherNotes />
                <PanicButton />
              </div>
            </div>

            {/* Dynamic Telemetry System stats */}
            <div className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6 shadow-2xl">
              <div className="text-[8px] text-zinc-500 font-black uppercase tracking-widest border-b border-white/[0.03] pb-2">
                TELEMETRİ ANALİZ SİSTEMLERİ
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Total transactions count */}
                <div className="bg-[#020202] p-5 rounded-2xl border border-white/[0.03] space-y-1 text-center hover:border-white/[0.06] transition-all">
                  <div className="text-3xl font-black text-white italic tracking-tighter">
                    {orders.length}
                  </div>
                  <div className="text-[7px] text-zinc-500 font-black uppercase leading-none">
                    İŞLEM ADEDİ
                  </div>
                </div>

                {/* Security Trust score level */}
                <div className="bg-[#020202] p-5 rounded-2xl border border-white/[0.03] space-y-1 text-center hover:border-white/[0.06] transition-all">
                  <div className="text-3xl font-black text-red-500 italic tracking-tighter animate-pulse">
                    Lv.{1 + activeCount}
                  </div>
                  <div className="text-[7px] text-zinc-500 font-black uppercase leading-none">
                    GÜVEN SKORU
                  </div>
                </div>
              </div>

              {/* Security info alert footer */}
              <div className="p-4 bg-white/[0.01] border border-white/[0.03] rounded-xl flex gap-3 text-[8px] text-zinc-500 leading-normal uppercase">
                <Info className="w-5 h-5 shrink-0 text-zinc-600" />
                <div>
                  KİMLİK GÜVEN SKORUNUZU ARTIRMAK İÇİN PGP ANAHTARINIZI EKLEMEYİ
                  VE GÜVENLİ PARA ÇEKME PIN ŞİFRENİZİ OLUŞTURMAYI UNUTMAYINIZ.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
