import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useCustomization } from "@/lib/customizationContext";
import { useI18n } from "@/lib/i18n";
import UpdatesModal from "@/components/UpdatesModal";
import { useNavigate, useLocation, Link } from "@/lib/router-shim";
import {
  ShoppingCart,
  Store,
  Wallet,
  LogOut,
  User,
  Package,
  Lock,
  Coins,
  Palette,
  LayoutDashboard,
  Zap,
  Search,
  MessageSquare,
  Shield,
  Bell,
  Heart,
  ArrowRightLeft,
  Bot,
  EyeOff,
  Rocket,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TorBadge from "@/components/TorBadge";
import SessionTimerBadge from "./SessionTimerBadge";

type LinkDef = { to: string; labelKey: string; icon: any };

const groupedLinks = {
  main: [
    { to: "/market", labelKey: "market", icon: ShoppingCart },
    { to: "/orders", labelKey: "myOrders", icon: Package },
    { to: "/watchlist", labelKey: "watchlist", icon: Heart },
  ],
  financial: [
    { to: "/wallet", labelKey: "wallet", icon: Coins },
    { to: "/transactions", labelKey: "transactions", icon: ArrowRightLeft },
  ],
  community: [
    { to: "/forum", labelKey: "forum", icon: MessageSquare },
    { to: "/help", labelKey: "help", icon: HelpCircle },
    { to: "/pgp-tool", labelKey: "pgpTool", icon: Shield },
  ],
  account: [
    { to: "/profile", labelKey: "profile", icon: User },
    { to: "/security", labelKey: "security", icon: Lock },
    { to: "/customization", labelKey: "customize", icon: Palette },
  ],
  vendor: [
    { to: "/vendor", labelKey: "myProducts", icon: Store },
    { to: "/vendor/wallet", labelKey: "vendorWallet", icon: Wallet },
  ],
  admin: [{ to: "/admin", labelKey: "dashboard", icon: LayoutDashboard }],
};

export default function AppSidebar() {
  const { role, user, logout } = useAuth();
  const { settings, updateSettings } = useCustomization();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = settings.sidebarCollapsed;
  const [openUpdates, setOpenUpdates] = useState(false);

  const accountLinks = [...groupedLinks.account];
  if (role !== "admin" && role !== "vendor") {
    accountLinks.push({
      to: "/vendor/bond",
      labelKey: "vendorApplication",
      icon: Shield,
    });
  }

  const renderLink = (link: LinkDef) => {
    const active = location.pathname === link.to;
    return (
      <Link
        key={link.to}
        to={link.to}
        className={`group flex items-center gap-4 px-8 py-3.5 transition-all duration-500 relative ${
          active
            ? "text-white bg-white/[0.04]"
            : "text-zinc-700 hover:text-white hover:bg-white/[0.01]"
        } ${collapsed ? "justify-center px-0" : ""}`}
      >
        {active && (
          <motion.div
            layoutId="active-highlight"
            className="absolute left-0 w-1.5 h-6 bg-red-600 shadow-[0_0_20px_#ff0000]"
          />
        )}
        <motion.div
          whileHover={{ scale: 1.2, rotate: 5 }}
          className="relative z-10"
        >
          <link.icon
            className={`w-5 h-5 transition-all duration-300 ${active ? "text-red-600 drop-shadow-[0_0_12px_#ff0000]" : "group-hover:text-red-600 group-hover:drop-shadow-[0_0_8px_rgba(255,0,0,0.4)]"}`}
          />
        </motion.div>
        {!collapsed && (
          <span
            className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${active ? "text-white" : "group-hover:tracking-[0.4em]"}`}
          >
            {t(link.labelKey as any)}
          </span>
        )}
        {active && !collapsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto w-1.5 h-1.5 rounded-full bg-red-600 shadow-[0_0_10px_#ff0000]"
          />
        )}
      </Link>
    );
  };

  const renderSection = (title: string, links: LinkDef[]) => {
    if (collapsed) return links.map(renderLink);
    return (
      <div className="mb-4">
        <div className="px-8 py-2 text-[8px] font-black text-zinc-800 uppercase tracking-[0.4em]">
          {title}
        </div>
        <div className="space-y-0.5">{links.map(renderLink)}</div>
      </div>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen ${collapsed ? "w-[80px]" : "w-[280px]"} bg-[#020202] border-r border-white/5 flex flex-col z-50 transition-all duration-500 ease-in-out`}
    >
      {/* Sidebar Header */}
      <div className="py-5 px-6 border-b border-white/5 flex flex-col items-center gap-4">
        <div className="w-full flex items-center justify-between">
          <button
            onClick={() => updateSettings({ sidebarCollapsed: !collapsed })}
            className="text-zinc-800 hover:text-white transition-colors p-1"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-3.5 h-3.5" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5" />
            )}
          </button>
          <div className="flex items-center gap-1.5">
            {!collapsed && <LanguageSwitcher />}
            <button className="text-zinc-500 hover:text-white p-1 transition-colors">
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          className="cursor-pointer group relative"
          onClick={() => navigate("/market")}
        >
          <svg width="28" height="28" viewBox="0 0 100 100">
            <rect x="10" y="15" width="12" height="70" fill="#FF0000" />
            <rect x="78" y="15" width="12" height="70" fill="#FF0000" />
            <path
              d="M22 50 L50 20 L78 50 L50 80 Z"
              stroke="#FF0000"
              strokeWidth="12"
              strokeLinejoin="miter"
              fill="none"
            />
          </svg>
        </div>

        {!collapsed && (
          <div className="text-center space-y-1">
            <span className="font-black text-base text-white tracking-tighter uppercase italic leading-none block">
              AEIGST<span className="text-red-600">HUB</span>
            </span>
            <div className="text-[7.5px] text-zinc-600 font-bold uppercase tracking-[0.4em] flex items-center gap-1.5 justify-center leading-none">
              <Activity className="w-2.5 h-2.5 animate-pulse text-red-950" />{" "}
              NODE_CONNECTED
            </div>
          </div>
        )}
      </div>

      {/* Quick Search */}
      <div className="p-4 px-6">
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent("palette:toggle"))
          }
          className={`w-full flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-xl py-3 px-4 text-zinc-800 hover:text-white transition-all ${collapsed ? "justify-center px-0" : ""}`}
        >
          <Search className="w-4 h-4" />
          {!collapsed && (
            <span className="text-[9px] font-black uppercase tracking-widest flex-1 text-left">
              _SEARCH
            </span>
          )}
        </button>
      </div>

      {/* Nav Content */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-2">
        {renderSection("PAZAR", groupedLinks.main)}
        {renderSection("FİNANS", groupedLinks.financial)}
        {role === "vendor" && renderSection("SATICI", groupedLinks.vendor)}
        {role === "admin" && renderSection("YÖNETİM", groupedLinks.admin)}
        {renderSection("TOPLULUK", groupedLinks.community)}
        {renderSection("SİSTEM", accountLinks)}

        {/* Extra Tools */}
        <div className="mt-4 px-8 space-y-2">
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("kizilyurek:toggle"))
            }
            className="w-full flex items-center gap-3 text-[10px] font-black text-red-900 hover:text-red-600 uppercase tracking-widest transition-colors"
          >
            <Bot className="w-4 h-4" /> {!collapsed && "Kızılyürek AI"}
          </button>
          <button
            onClick={() => setOpenUpdates(true)}
            className="w-full flex items-center gap-3 text-[10px] font-black text-red-900 hover:text-red-600 uppercase tracking-widest transition-colors cursor-pointer"
          >
            <Rocket className="w-4 h-4" /> {!collapsed && "Yenilikler"}
          </button>
        </div>
      </nav>

      {/* Identity Footer */}
      <div className="p-4 mx-4 mb-4 rounded-2xl border border-white/5 bg-[#030303]/80 backdrop-blur-md space-y-4">
        {/* Network Status */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            {!collapsed && (
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                TOR
              </span>
            )}
          </div>
          {!collapsed && <SessionTimerBadge />}
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_#ff0000]" />
            {!collapsed && (
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                AI_CORE
              </span>
            )}
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-600/30 flex items-center justify-center text-xs font-black text-red-600 relative shrink-0">
            {(user?.email?.[0] || "U").toUpperCase()}
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-600 rounded-full border border-[#030303]" />
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-white font-black truncate uppercase tracking-wider">
                  {user?.email?.split("@")[0]}
                </span>
                <span
                  className={`text-[7px] px-1.5 py-0.5 rounded font-black tracking-widest border uppercase ${
                    role === "admin"
                      ? "bg-amber-600/10 border-amber-600/30 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                      : role === "vendor"
                        ? "bg-purple-600/10 border-purple-600/30 text-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.1)]"
                        : "bg-zinc-600/10 border-white/5 text-zinc-400"
                  }`}
                >
                  {role === "admin"
                    ? "ADMIN"
                    : role === "vendor"
                      ? "VENDOR"
                      : "BUYER"}
                </span>
              </div>
              <div className="text-[8px] text-zinc-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                ID:{" "}
                <span className="text-zinc-500 font-mono">
                  {user?.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!collapsed && (
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <Link
              to="/notifications"
              className="flex items-center gap-2 text-zinc-500 hover:text-white font-black text-[8px] uppercase tracking-wider transition-colors relative group"
            >
              <div className="relative">
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
              </div>
              <span>BİLDİRİMLER</span>
            </Link>

            <button
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              className="flex items-center gap-2 text-zinc-500 hover:text-red-500 font-black text-[8px] uppercase tracking-wider transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>GÜVENLİ ÇIKIŞ</span>
            </button>
          </div>
        )}
      </div>

      <UpdatesModal open={openUpdates} onOpenChange={setOpenUpdates} />
    </aside>
  );
}
