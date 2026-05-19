import { useState } from "react";
import PageShell from "@/components/PageShell";
import { Bell, ShieldCheck, ShoppingBag, Info, X, Trash2, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  type: "order" | "security" | "system";
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    type: "security",
    title: "2FA DOĞRULAMA AKTİF EDİLDİ",
    body: "Hesabınız için iki aşamalı doğrulama (TOTP) protokolü başarıyla devreye alındı. Acil durum kodlarınızı güvenli bir yere saklamayı unutmayın.",
    time: "10 Dk Önce",
    read: false
  },
  {
    id: "n2",
    type: "order",
    title: "SİPARİŞ #AEIGS-ORD-3819 KARGOYA VERİLDİ",
    body: "Sipariş ettiğiniz ürün satıcı tarafından kargoya verildi. Canlı teslimat akışını siparişlerim sayfasından takip edebilirsiniz.",
    time: "2 Saat Önce",
    read: false
  },
  {
    id: "n3",
    type: "system",
    title: "GÜVENLİK GÜNCELLEMESİ V2.4",
    body: "Sistem alt yapısı en son oltalama koruma filtreleriyle güçlendirilmiştir. Profil ayarlarından anti-phishing kodunuzu teyit edin.",
    time: "1 Gün Önce",
    read: true
  },
  {
    id: "n4",
    type: "security",
    title: "YENİ CİHAZ GİRİŞ TESPİTİ",
    body: "Hesabınıza yeni bir IP adresinden başarılı giriş yapıldı. Bu işlem size ait değilse acilen dead-man modunu kurun.",
    time: "3 Gün Önce",
    read: true
  }
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState<"all" | "order" | "security" | "system">("all");

  const filtered = notifications.filter(n => activeFilter === "all" || n.type === activeFilter);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("Tüm bildirimler okundu olarak işaretlendi.");
  };

  const handleClearAll = () => {
    if (window.confirm("Tüm bildirimlerinizi silmek istediğinizden emin misiniz?")) {
      setNotifications([]);
      toast.success("Bildirim kutusu temizlendi.");
    }
  };

  const handleToggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success("Bildirim silindi.");
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "security":
        return <ShieldCheck className="w-4 h-4 text-red-500 animate-pulse" />;
      case "order":
        return <ShoppingBag className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto space-y-6 font-mono pb-12 select-none">
        
        {/* Header HUD */}
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-r from-[#030303] to-[#010101] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600 animate-pulse" />
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 shrink-0">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-[0.2em]">BİLDİRİM MERKEZİ</h1>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                Sistem güvenlik uyarıları ve sipariş akış güncellemeleri
              </p>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleMarkAllRead}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white/[0.02] border border-white/5 hover:border-red-600/30 text-zinc-400 hover:text-white rounded-xl text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <CheckSquare className="w-3 h-3 text-red-500" /> OKUNDU YAP
            </button>
            <button
              onClick={handleClearAll}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-red-950/20 border border-red-500/10 hover:border-red-500/30 text-red-500 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> TEMİZLE
            </button>
          </div>
        </div>

        {/* Filter Navigation HUD */}
        <div className="flex flex-wrap gap-2 border-b border-white/[0.03] pb-3 text-[9px] font-black uppercase">
          {[
            { id: "all", label: "TÜMÜ" },
            { id: "order", label: "📦 SİPARİŞLER" },
            { id: "security", label: "🛡️ GÜVENLİK" },
            { id: "system", label: "💡 SİSTEM" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? "bg-red-600/10 border-red-600/30 text-red-500"
                  : "bg-[#030303]/40 border-white/5 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleToggleRead(item.id)}
                  className={`glass-card rounded-2xl p-5 border transition-all duration-300 relative cursor-pointer group flex items-start gap-4 ${
                    item.read
                      ? "border-white/5 bg-[#030303]/20 opacity-70"
                      : "border-red-600/25 bg-[#020202] shadow-[0_0_20px_rgba(255,0,0,0.03)]"
                  }`}
                >
                  {/* Left Accent indicator for unread */}
                  {!item.read && (
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-600 rounded-l-2xl animate-pulse" />
                  )}

                  {/* Icon Container */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    item.read ? "bg-white/[0.01] border-white/5" : "bg-red-600/5 border-red-600/20"
                  }`}>
                    {getIcon(item.type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className={`text-[10px] font-black uppercase tracking-wide ${item.read ? "text-zinc-400" : "text-white"}`}>
                        {item.title}
                      </span>
                      <span className="text-[7.5px] text-zinc-600 font-bold uppercase tracking-wider">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-2 bg-white/[0.01] hover:bg-white/[0.06] border border-white/5 hover:border-red-500/20 rounded-lg text-zinc-600 hover:text-red-500 transition-all cursor-pointer self-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                </motion.div>
              ))
            ) : (
              <div className="bg-[#030303]/40 border border-white/5 rounded-3xl p-12 text-center space-y-3">
                <Bell className="w-8 h-8 text-zinc-700 mx-auto" />
                <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  Gelen kutunuz tamamen boş.
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </PageShell>
  );
}
