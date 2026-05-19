import { useState } from "react";
import PageShell from "@/components/PageShell";
import { useI18n } from "@/lib/i18n";
import { HelpCircle, Search, BookOpen, Key, DollarSign, LifeBuoy, ChevronDown, ChevronUp, Send, CheckCircle2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface FAQItem {
  id: string;
  category: "escrow" | "security" | "pgp" | "payments" | "general";
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: "e1",
    category: "escrow",
    question: "ESCROW SİSTEMİ NASIL ÇALIŞIR?",
    answer: "Escrow (Güvenli Havuz), alıcı ve satıcıyı koruyan akıllı bir emanet protokolüdür. Alıcı sipariş verdiğinde ödeme Litecoin (LTC) olarak sistem havuzuna kilitlenir. Satıcı ürünü kargolayıp teslim edene kadar bu tutar kilitli kalır. Alıcı teslimatı onayladığında veya teslimat süresi sorunsuz dolduğunda tutar satıcının cüzdanına aktarılır."
  },
  {
    id: "e2",
    category: "escrow",
    question: "SİPARİŞ UYUŞMAZLIĞI (DISPUTE) SÜRECİ NEDİR?",
    answer: "Ürün zamanında teslim edilmezse, eksik veya hatalı gelirse sipariş detaylarından 'Uyuşmazlık Başlat' butonuna tıklayabilirsiniz. Bu işlem havuzdaki paranızı tamamen dondurur ve bağımsız site hakemlerini (Arbitrators) sohbet odasına davet eder. Hakemler iki tarafın kanıtlarını inceleyerek parayı iade eder veya satıcıya aktarır."
  },
  {
    id: "s1",
    category: "security",
    question: "HESAP GÜVENLİĞİMİ NASIL EN ÜST DÜZEYE ÇIKARIRIM?",
    answer: "Hesap güvenliğiniz için üç temel protokolü deaktif bırakmamalısınız: 1) Güçlü bir şifre seçin ve PGP Anahtarı tanımlayın. 2) Güvenlik ayarlarından iki aşamalı doğrulamayı (2FA / TOTP) aktif edin. 3) Oltalama saldırılarına karşı her girişte 'Anti-Phishing Kodu' kontrolü gerçekleştirin."
  },
  {
    id: "p1",
    category: "pgp",
    question: "PGP ANAHTARI TANIMLAMAK NEDEN ZORUNLUDUR?",
    answer: "PGP (Pretty Good Privacy), satıcılar arası mesajlaşmalarda ve hassas teslimat bilgilerinin şifrelenmesinde kullanılır. PGP şifrelemesi sunucu tarafında çözülemez; yalnızca teslimat adresi gibi kritik bilgileri alıcının kendi özel anahtarıyla çözmesini sağlar. Böylece tam gizlilik korunur."
  },
  {
    id: "pm1",
    category: "payments",
    question: "HANGİ KRİPTO PARA BİRİMLERİ DESTEKLENİYOR?",
    answer: "Hızlı işlem onay süreleri, son derece düşük ağ ücretleri ve yüksek gizlilik sunması sebebiyle ana para birimi olarak sadece Litecoin (LTC) desteklenmektedir."
  },
  {
    id: "g1",
    category: "general",
    question: "ŞİFREMİ VEYA 2FA KODUMU KAYBETTİM, NE YAPMALIYIM?",
    answer: "Tam gizlilik protokolleri gereği, şifre sıfırlama veya 2FA devre dışı bırakma işlemleri yalnızca 2FA kurulumu sırasında size sunulan 'Acil Durum Kurtarma Kodları' (Backup Codes) ile yapılabilir. Kurtarma kodlarınızı kaybettiyseniz hesabınız kalıcı olarak kilitlenir."
  }
];

export default function Help() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // Support ticket form state
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketCategory, setTicketCategory] = useState("general");
  const [ticketMessage, setTicketMessage] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketResult, setTicketResult] = useState<string | null>(null);

  const filteredFaqs = FAQ_DATA.filter((faq) => {
    const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error("Lütfen bilet konusu ve mesajı alanlarını doldurun.");
      return;
    }

    setSubmittingTicket(true);

    // Simulate ticket creation delay
    setTimeout(() => {
      const ticketId = `AEIGS-TK-${Math.floor(1000 + Math.random() * 9000)}`;
      setTicketResult(ticketId);
      setSubmittingTicket(false);
      setTicketSubject("");
      setTicketMessage("");
      toast.success("Destek talebiniz başarıyla oluşturuldu!");
    }, 1500);
  };

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto space-y-8 font-mono pb-12 select-none">
        
        {/* Header HUD */}
        <div className="glass-card rounded-3xl p-6 border border-white/5 bg-gradient-to-r from-[#030303] to-[#010101] flex items-center gap-4 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-600 animate-pulse" />
          <div className="w-12 h-12 rounded-2xl bg-red-600/10 border border-red-600/20 flex items-center justify-center text-red-500 shrink-0">
            <LifeBuoy className="w-6 h-6 animate-spin" style={{ animationDuration: "10s" }} />
          </div>
          <div>
            <h1 className="text-sm font-black text-white uppercase tracking-[0.2em]">YARDIM MASASI & DESTEK PROVAYDERİ</h1>
            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
              Sorularınıza hızlı çözümler alın veya yeni bir şifreli destek bileti açın
            </p>
          </div>
        </div>

        {/* Live FAQ Search and Category Select */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              placeholder="SORU VEYA ANAHTAR KELİME ARA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#030303] border border-white/5 focus:border-red-600/60 rounded-2xl py-3.5 pl-12 pr-4 text-[10px] font-black text-white placeholder-zinc-700 uppercase tracking-wider focus:outline-none transition-all"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-[#030303] border border-white/5 focus:border-red-600/60 rounded-2xl py-3.5 px-4 text-[10px] font-black text-white uppercase tracking-wider focus:outline-none transition-all"
          >
            <option value="all">TÜM KATEGORİLER</option>
            <option value="escrow">ESCROW & UYUŞMAZLIK</option>
            <option value="security">GÜVENLİK AYARLARI</option>
            <option value="pgp">PGP İŞLEMLERİ</option>
            <option value="payments">ÖDEMELER & LTC</option>
            <option value="general">GENEL SORULAR</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Left Column: FAQ Accordion list */}
          <div className="md:col-span-2 space-y-3">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">SIKÇA SORULAN SORULAR</h2>
            
            <div className="space-y-2.5">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaq === faq.id;
                  return (
                    <div 
                      key={faq.id}
                      className={`glass-card rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isExpanded ? "border-red-600/30 bg-[#020202]" : "border-white/5 bg-[#030303]/40 hover:border-white/10"
                      }`}
                    >
                      <button
                        onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 cursor-pointer"
                      >
                        <span className="text-[9.5px] font-black text-white uppercase tracking-wider leading-relaxed">
                          {faq.question}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-red-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-600 shrink-0" />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-5 pb-5 pt-1 border-t border-white/[0.03] text-[9px] text-zinc-400 font-bold uppercase tracking-wide leading-relaxed">
                              {faq.answer}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div className="bg-[#030303]/40 border border-white/5 rounded-2xl p-8 text-center text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                  Kriterlere uygun soru bulunamadı.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Support Ticket Creator */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">DESTEK BİLETİ OLUŞTUR</h2>

            <div className="glass-card rounded-2xl border border-white/5 bg-[#030303]/80 p-5 shadow-2xl space-y-4 relative">
              
              <AnimatePresence mode="wait">
                {!ticketResult ? (
                  <motion.form 
                    key="form"
                    onSubmit={handleSubmitTicket}
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="space-y-1.5">
                      <label className="text-[7.5px] text-zinc-600 font-black uppercase tracking-widest">KATEGORİ</label>
                      <select
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 focus:border-red-600/60 rounded-xl py-2 px-3 text-[9px] font-black text-white focus:outline-none uppercase"
                      >
                        <option value="general">GENEL YARDIM</option>
                        <option value="escrow">HAVUZ / ESCROW SORUNU</option>
                        <option value="security">GÜVENLİK KİLİDİ</option>
                        <option value="vendor">SATICI BİLGİLENDİRME</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[7.5px] text-zinc-600 font-black uppercase tracking-widest">BİLET KONUSU</label>
                      <input
                        type="text"
                        placeholder="Örn: LTC YATIRMA GECİKMESİ"
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 focus:border-red-600/60 rounded-xl py-2.5 px-3 text-[9px] font-black text-white focus:outline-none placeholder-zinc-700 uppercase tracking-wide"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[7.5px] text-zinc-600 font-black uppercase tracking-widest">AÇIKLAMA</label>
                      <textarea
                        rows={4}
                        placeholder="Sorununuzu detaylıca yazın..."
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        className="w-full bg-zinc-950 border border-white/5 focus:border-red-600/60 rounded-xl py-2.5 px-3 text-[9px] font-black text-white focus:outline-none placeholder-zinc-700 uppercase tracking-wide resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingTicket}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {submittingTicket ? "GÖNDERİLİYOR..." : "TALEP GÖNDER"} <Send className="w-3 h-3" />
                    </button>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="success"
                    className="text-center space-y-4 py-4"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500 mx-auto animate-bounce">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">BİLET OLUŞTURULDU</h3>
                      <p className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">EN GEÇ 12 SAAT İÇİNDE YANITLANACAKTIR</p>
                    </div>

                    <div className="bg-zinc-950 border border-white/5 rounded-xl p-3">
                      <span className="text-[6.5px] text-zinc-600 font-black uppercase tracking-widest block">BİLET NUMARASI</span>
                      <span className="text-white text-xs font-black tracking-widest select-all">{ticketResult}</span>
                    </div>

                    <button
                      onClick={() => setTicketResult(null)}
                      className="w-full py-2.5 bg-white/[0.02] border border-white/5 text-zinc-400 hover:text-white rounded-xl text-[8.5px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      YENİ TALEP OLUŞTUR
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
