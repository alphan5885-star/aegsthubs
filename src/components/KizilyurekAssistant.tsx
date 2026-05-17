import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, X, Send, AlertTriangle, Trash2, Zap, Activity, Cpu, Sparkles, Terminal } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSessionTimer } from "@/lib/sessionTimerContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

type Msg = { role: "user" | "assistant" | "system"; content: string };

type AssistantProps = {
  position?: "bottom-right" | "bottom-left";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideFab?: boolean;
};

const QUICK = [
  "LTC_YATIRMA", "GÜVENLİK_PROT", "ESCROW_NEDİR", "SATICI_OL", "PGP_KULLANIMI"
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kizilyurek-chat`;
const ALLOWED_MARKDOWN_ELEMENTS = ["p", "strong", "em", "code", "pre", "ul", "ol", "li", "br"];

export default function KizilyurekAssistant({
  position = "bottom-right",
  open: openProp,
  onOpenChange,
  hideFab = false,
}: AssistantProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = useCallback((v: boolean) => {
    if (onOpenChange) onOpenChange(v);
    else setOpenInternal(v);
  }, [onOpenChange]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { remainingMs } = useSessionTimer();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const userMsg: Msg = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: next.filter(m => m.role !== "system").map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!resp.ok || !resp.body) throw new Error();

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                acc += delta;
                setMessages(p => {
                   const last = p[p.length - 1];
                   if (last?.role === "assistant") return [...p.slice(0, -1), { ...last, content: acc }];
                   return [...p, { role: "assistant", content: acc }];
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "⚠️ BAĞLANTI_HATASI: SİSTEM_YANIT_VERMİYOR." }]);
    } finally {
      setLoading(false);
    }
  };

  const cornerClass = position === "bottom-right" ? "bottom-8 right-8" : "bottom-8 left-8";

  return (
    <>
      <AnimatePresence>
        {!open && !hideFab && (
          <motion.button
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            onClick={() => setOpen(true)}
            className={`fixed ${cornerClass} z-[500] w-16 h-16 rounded-[24px] bg-red-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(255,0,0,0.4)] hover:scale-110 transition-all`}
          >
            <Bot className="w-8 h-8" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-4 border-red-600 animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 50, scale: 0.9, filter: "blur(10px)" }}
            className={`fixed ${cornerClass} z-[500] w-[400px] h-[600px] bg-[#010101] border-2 border-red-600/20 rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden font-mono`}
          >
            {/* AI HUD Header */}
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
               <div className="flex items-center gap-4">
                  <div className="relative">
                     <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-[0_0_15px_#ff0000]">
                        <Cpu className="w-6 h-6 animate-pulse" />
                     </div>
                     <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#010101]" />
                  </div>
                  <div>
                     <div className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                        KIZILYÜREK <Sparkles className="w-3 h-3 text-red-600" />
                     </div>
                     <div className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em]">NEURAL_CORE_v2.0</div>
                  </div>
               </div>
               <button onClick={() => setOpen(false)} className="p-2 text-zinc-700 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
               </button>
            </div>

            {/* AI Telemetry Strip */}
            <div className="px-8 py-2 bg-red-600/5 flex items-center justify-between border-b border-white/5 text-[7px] font-black uppercase tracking-[0.2em] text-red-900">
               <div className="flex items-center gap-2"><Activity className="w-3 h-3" /> SYNC: 99.8%</div>
               <div className="flex items-center gap-2"><Zap className="w-3 h-3" /> LATENCY: 12MS</div>
               <div className="flex items-center gap-2"><Terminal className="w-3 h-3" /> LOGS: ACTIVE</div>
            </div>

            {/* Message Thread */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar relative">
               <div className="absolute inset-0 cyber-grid opacity-[0.03] pointer-events-none" />
               
               {messages.length === 0 && (
                 <div className="space-y-8 relative z-10">
                    <div className="p-6 rounded-[32px] border border-red-600/20 bg-red-600/[0.03] space-y-3">
                       <div className="flex items-center gap-2 text-[10px] text-red-600 font-black uppercase tracking-widest">
                          <AlertTriangle className="w-3 h-3" /> GÜVENLİK_UYARISI
                       </div>
                       <p className="text-[9px] text-zinc-600 font-bold leading-relaxed uppercase">
                          ASLA İSİM, ADRES VEYA OPERASYONEL VERİ PAYLAŞMAYIN. BU KANAL DIŞ AI SERVİSLERİYLE SENKRONİZE ÇALIŞIR.
                       </p>
                    </div>
                    <div className="space-y-4">
                       <div className="text-[9px] text-zinc-800 font-black uppercase tracking-[0.4em]">HIZLI_KOMUTLAR</div>
                       <div className="flex flex-wrap gap-2">
                          {QUICK.map(q => (
                            <button key={q} onClick={() => send(q)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-zinc-500 hover:text-red-600 hover:border-red-600/40 transition-all uppercase">{q}</button>
                          ))}
                       </div>
                    </div>
                 </div>
               )}

               {messages.map((m, i) => (
                 <motion.div
                   key={i}
                   initial={{ opacity: 0, x: m.role === "user" ? 10 : -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                 >
                   <div className={`max-w-[85%] p-5 rounded-[24px] text-[11px] leading-relaxed font-black uppercase tracking-widest ${m.role === "user" ? "bg-red-600 text-white shadow-[0_10px_20px_rgba(255,0,0,0.2)]" : "bg-white/5 text-zinc-400 border border-white/5"}`}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-invert prose-xs max-w-none">
                           <ReactMarkdown allowedElements={ALLOWED_MARKDOWN_ELEMENTS}>{m.content}</ReactMarkdown>
                        </div>
                      ) : m.content}
                   </div>
                 </motion.div>
               ))}

               {loading && (
                 <div className="flex items-center gap-4 px-2">
                    <div className="flex gap-1">
                       <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                       <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                       <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-bounce" />
                    </div>
                    <span className="text-[8px] font-black text-red-900 uppercase tracking-widest">VERİ_İŞLENİYOR...</span>
                 </div>
               )}
            </div>

            {/* Input Engine */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="p-8 border-t border-white/5 bg-white/[0.01] flex gap-4"
            >
               <input
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 placeholder="SİSTEME_SORU_SORUN..."
                 disabled={loading}
                 className="flex-1 bg-[#050505] border-2 border-white/5 rounded-2xl px-6 py-4 text-[10px] text-white focus:outline-none focus:border-red-600/50 transition-all font-black uppercase tracking-widest placeholder:text-zinc-900"
               />
               <button
                 type="submit"
                 disabled={loading || !input.trim()}
                 className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-[0_10px_20px_rgba(255,0,0,0.3)] hover:scale-105 transition-all disabled:opacity-50"
               >
                  <Send className="w-5 h-5" />
               </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
