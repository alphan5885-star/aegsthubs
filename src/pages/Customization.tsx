import { useCustomization, CustomizationSettings } from "@/lib/customizationContext";
import { useBackground } from "@/lib/backgroundContext";
import { useI18n, languageOptions, TranslationKey } from "@/lib/i18n";
import PageShell from "@/components/PageShell";
import {
  Palette,
  Type,
  Sparkles,
  PanelLeft,
  RotateCcw,
  ImagePlus,
  Trash2,
  Wallpaper,
  Globe,
  Zap,
  Activity,
  Maximize2
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useRef } from "react";

export default function Customization() {
  const { settings, updateSettings, resetSettings } = useCustomization();
  const { backgroundUrl, setBackgroundUrl, backgroundOpacity, setBackgroundOpacity } = useBackground();
  const { t, language, setLanguage } = useI18n();
  const bgRef = useRef<HTMLInputElement>(null);

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBackgroundUrl(reader.result as string);
      toast.success("Arkaplan güncellendi.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <PageShell>
      <div className="max-w-[1000px] mx-auto py-8 space-y-12 font-mono">
        
        {/* Header HUD */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 border-b border-white/5 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[9px] text-red-600 font-black tracking-[0.4em] uppercase">
              <Zap className="w-4 h-4 shadow-[0_0_10px_#ff0000]" /> SYSTEM_CONFIG // CORE_v4.5
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
              ÖZELLEŞTİR<span className="text-red-600">.UI</span>
            </h1>
          </div>
          <button
            onClick={() => { resetSettings(); toast.success("Sistem sıfırlandı."); }}
            className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-600 hover:border-red-600/40 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> SIFIRLA
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           
           {/* Section: Language */}
           <div className="obsidian-card p-8 rounded-[40px] border-2 border-white/5 space-y-6">
              <div className="flex items-center gap-3 text-[10px] text-red-600 font-black uppercase tracking-widest">
                 <Globe className="w-4 h-4" /> DİL_KODLAMASI
              </div>
              <div className="grid grid-cols-2 gap-3">
                 {languageOptions.map(lang => (
                   <button
                     key={lang.value}
                     onClick={() => setLanguage(lang.value)}
                     className={`px-4 py-4 rounded-2xl border-2 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${language === lang.value ? "border-red-600 bg-red-600/10 text-white" : "border-white/5 text-zinc-700 hover:border-white/10"}`}
                   >
                     <span className="text-base">{lang.flag}</span> {lang.label}
                   </button>
                 ))}
              </div>
           </div>

           {/* Section: Appearance */}
           <div className="obsidian-card p-8 rounded-[40px] border-2 border-white/5 space-y-6">
              <div className="flex items-center gap-3 text-[10px] text-red-600 font-black uppercase tracking-widest">
                 <Palette className="w-4 h-4" /> RENK_TAYFI
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-[8px] text-zinc-800 font-black uppercase">
                    <span>HUE_ADJUSTMENT</span>
                    <span className="text-white">{settings.themeHue}°</span>
                 </div>
                 <input
                   type="range"
                   min="0"
                   max="360"
                   value={settings.themeHue}
                   onChange={(e) => updateSettings({ themeHue: parseInt(e.target.value) })}
                   className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-red-600"
                   style={{ background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" }}
                 />
              </div>
           </div>

           {/* Section: Typography */}
           <div className="obsidian-card p-8 rounded-[40px] border-2 border-white/5 space-y-6">
              <div className="flex items-center gap-3 text-[10px] text-red-600 font-black uppercase tracking-widest">
                 <Type className="w-4 h-4" /> FONT_MODÜLÜ
              </div>
              <div className="grid grid-cols-2 gap-3">
                 {["inter", "jetbrains", "system"].map(f => (
                   <button
                     key={f}
                     onClick={() => updateSettings({ fontFamily: f as any })}
                     className={`px-4 py-3 rounded-2xl border-2 transition-all text-[9px] font-black uppercase tracking-widest ${settings.fontFamily === f ? "border-red-600 bg-red-600/10 text-white" : "border-white/5 text-zinc-700 hover:border-white/10"}`}
                   >
                      {f}
                   </button>
                 ))}
              </div>
           </div>

           {/* Section: Layout */}
           <div className="obsidian-card p-8 rounded-[40px] border-2 border-white/5 space-y-6">
              <div className="flex items-center gap-3 text-[10px] text-red-600 font-black uppercase tracking-widest">
                 <PanelLeft className="w-4 h-4" /> PANEL_DÜZENİ
              </div>
              <div className="flex flex-col gap-4">
                 <button
                   onClick={() => updateSettings({ sidebarCollapsed: !settings.sidebarCollapsed })}
                   className={`px-6 py-3 rounded-2xl border-2 transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-between ${settings.sidebarCollapsed ? "border-red-600 bg-red-600/10 text-white" : "border-white/5 text-zinc-700"}`}
                 >
                    SIDEBAR_COLLAPSE <span>{settings.sidebarCollapsed ? "ON" : "OFF"}</span>
                 </button>
                 <button
                   onClick={() => updateSettings({ sidebarPosition: settings.sidebarPosition === "left" ? "right" : "left" })}
                   className="px-6 py-3 rounded-2xl border-2 border-white/5 text-zinc-700 text-[9px] font-black uppercase tracking-widest flex items-center justify-between hover:border-white/10 transition-all"
                 >
                    POSITION <span>{settings.sidebarPosition.toUpperCase()}</span>
                 </button>
              </div>
           </div>

           {/* Section: Background */}
           <div className="obsidian-card md:col-span-2 p-8 rounded-[40px] border-2 border-white/5 space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3 text-[10px] text-red-600 font-black uppercase tracking-widest">
                    <Wallpaper className="w-4 h-4" /> ATMOSFER_MATRİSİ
                 </div>
                 <div className="flex items-center gap-3">
                    <button onClick={() => bgRef.current?.click()} className="bg-white/5 border border-white/5 p-3 rounded-xl text-zinc-500 hover:text-white transition-all"><ImagePlus className="w-4 h-4" /></button>
                    {backgroundUrl && <button onClick={() => setBackgroundUrl(null)} className="bg-white/5 border border-white/5 p-3 rounded-xl text-zinc-500 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>}
                 </div>
              </div>
              <input ref={bgRef} type="file" className="hidden" onChange={handleBgUpload} />
              
              {backgroundUrl && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                   <div className="relative h-24 rounded-2xl overflow-hidden border border-white/10">
                      <img src={backgroundUrl} className="w-full h-full object-cover grayscale opacity-40" />
                      <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">PREVIEW_ACTIVE</div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between text-[8px] text-zinc-800 font-black uppercase">
                         <span>OPACITY_LEVEL</span>
                         <span className="text-white">{Math.round(backgroundOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={backgroundOpacity}
                        onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-red-600"
                      />
                   </div>
                </div>
              )}
           </div>

        </div>

        {/* HUD Footer */}
        <div className="flex justify-between items-center text-[9px] text-zinc-900 font-black uppercase tracking-[1em] pt-12 border-t border-white/5">
           <span>X_CONFIG_STABLE</span>
           <span>AE_ROOT_SYNC_OK</span>
        </div>

      </div>
    </PageShell>
  );
}
