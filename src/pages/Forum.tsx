import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/authContext";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Clock,
  User,
  ChevronRight,
  Send,
  ArrowLeft,
  Pin,
  Lock,
  Search,
  MessageCircle,
  Eye,
  Trash2,
  Zap,
  ShieldCheck,
  EyeOff,
  Flame,
  Award
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  author_id: string;
  category: string;
  pinned: boolean;
  created_at: string;
}

interface ForumComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

interface ProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

const CATEGORIES = [
  { id: "genel", label: "💬 Genel Sohbet", desc: "Topluluk üyeleriyle genel muhabbet" },
  { id: "duyurular", label: "📢 Duyurular", desc: "Sistem güncellemeleri ve resmi haberler" },
  { id: "yardim", label: "🛡️ Destek & Yardım", desc: "PGP, Escrow ve sipariş yardımları" },
  { id: "oneriler", label: "💡 Öneriler & Fikirler", desc: "Pazar yerini geliştirecek parlak fikirler" },
  { id: "sikayet", label: "⚠️ Şikayet & Uyuşmazlık", desc: "Satıcı veya alıcı şikayet kayıtları" },
];

export default function Forum() {
  const { user, role } = useAuth();
  const { t } = useI18n();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileData>>({});
  
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("genel");
  const [postAnonymously, setPostAnonymously] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingPost, setSubmittingPost] = useState(false);
  const [loading, setLoading] = useState(true);

  const isMounted = useRef(true);

  // Fetch Forum Posts, Profiles, and Comments
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data: postsData, error: postsError } = await supabase
        .from("forum_posts")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (postsError) throw postsError;

      if (postsData && isMounted.current) {
        // Correct boolean values from database schema
        const mappedPosts: ForumPost[] = postsData.map((p: any) => ({
          id: p.id,
          title: p.title,
          content: p.content,
          author_id: p.author_id,
          category: p.category || "genel",
          pinned: !!p.pinned,
          created_at: p.created_at,
        }));
        setPosts(mappedPosts);

        // Fetch profiles for authors
        const authorIds = Array.from(new Set(mappedPosts.map((p) => p.author_id)));
        if (authorIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, bio")
            .in("id", authorIds);

          if (!profilesError && profilesData) {
            const profileMap: Record<string, ProfileData> = {};
            profilesData.forEach((p) => {
              profileMap[p.id] = p;
            });
            setProfiles((prev) => ({ ...prev, ...profileMap }));
          }
        }
      }
    } catch (e) {
      toast.error("Forum verileri yüklenirken hata oluştu.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  // Fetch comments for a specific post
  const fetchComments = async (postId: string) => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from("forum_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      if (commentsData && isMounted.current) {
        setComments(commentsData);

        // Fetch profiles for comment authors
        const authorIds = Array.from(
          new Set(commentsData.map((c) => c.author_id).filter((id) => !profiles[id])),
        );
        if (authorIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url, bio")
            .in("id", authorIds);

          if (!profilesError && profilesData) {
            const profileMap: Record<string, ProfileData> = {};
            profilesData.forEach((p) => {
              profileMap[p.id] = p;
            });
            setProfiles((prev) => ({ ...prev, ...profileMap }));
          }
        }
      }
    } catch (e) {
      toast.error("Yorumlar yüklenirken hata oluştu.");
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchPosts();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle Create Post
  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    if (!user) {
      toast.error("Önce giriş yapmalısınız.");
      return;
    }

    setSubmittingPost(true);
    try {
      const authorId = postAnonymously ? "sys" : user.id;

      const { error } = await supabase.from("forum_posts").insert({
        title: newTitle,
        content: newContent,
        category: newCategory,
        author_id: authorId,
        pinned: false,
      });

      if (error) throw error;

      toast.success("Konu başarıyla yayınlandı! 📢");
      setNewTitle("");
      setNewContent("");
      setNewThreadOpen(false);
      fetchPosts();
    } catch (e) {
      toast.error("Konu yayınlanırken bir hata oluştu.");
    } finally {
      setSubmittingPost(false);
    }
  };

  // Handle Add Comment
  const handleAddComment = async () => {
    if (!selectedPost) return;
    if (!newComment.trim()) {
      toast.error("Yorum boş bırakılamaz.");
      return;
    }
    if (!user) {
      toast.error("Önce giriş yapmalısınız.");
      return;
    }

    setSubmittingComment(true);
    try {
      const { error } = await supabase.from("forum_comments").insert({
        post_id: selectedPost.id,
        author_id: user.id,
        content: newComment,
      });

      if (error) throw error;

      toast.success("Yorumunuz başarıyla iletildi!");
      setNewComment("");
      fetchComments(selectedPost.id);
    } catch (e) {
      toast.error("Yorum iletilirken bir hata oluştu.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Admin Tool: Toggle Pin Post
  const handleTogglePin = async (post: ForumPost) => {
    if (role !== "admin") return;
    try {
      const { error } = await supabase
        .from("forum_posts")
        .update({ pinned: !post.pinned })
        .eq("id", post.id);

      if (error) throw error;

      toast.success(post.pinned ? "Konunun sabitlemesi kaldırıldı." : "Konu başarıyla sabitlendi!");
      const updatedPost = { ...post, pinned: !post.pinned };
      if (selectedPost?.id === post.id) {
        setSelectedPost(updatedPost);
      }
      fetchPosts();
    } catch (e) {
      toast.error("İşlem başarısız oldu.");
    }
  };

  // Admin Tool: Delete Post
  const handleDeletePost = async (postId: string) => {
    if (role !== "admin") return;
    const confirm = window.confirm("Bu konuyu ve tüm alt yorumlarını tamamen silmek istiyor musunuz?");
    if (!confirm) return;

    try {
      // Delete comments first
      await supabase.from("forum_comments").delete().eq("post_id", postId);
      
      // Delete post
      const { error } = await supabase.from("forum_posts").delete().eq("id", postId);

      if (error) throw error;

      toast.success("Konu başarıyla imha edildi.");
      setSelectedPost(null);
      fetchPosts();
    } catch (e) {
      toast.error("Silme işlemi başarısız.");
    }
  };

  // Filter & Search computation
  const filteredPosts = posts.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getAuthorDisplay = (authorId: string) => {
    if (authorId === "sys") {
      return {
        name: "ANONİM_SİBER",
        avatar: "",
        badge: "SİSTEM",
        badgeColor: "bg-red-500/10 text-red-500 border-red-500/20",
      };
    }
    const profile = profiles[authorId];
    const name = profile?.display_name || `Kullanıcı_${authorId.slice(0, 4)}`;
    
    // Determine badges based on names/ids for immersive fidelity
    const isAdmin = name.toLowerCase().includes("admin") || authorId === "sys";
    const isVendor = name.toLowerCase().includes("vendor") || name.toLowerCase().includes("satıcı");

    return {
      name,
      avatar: profile?.avatar_url || "",
      badge: isAdmin ? "ADMIN" : isVendor ? "SATICI" : "ALICI",
      badgeColor: isAdmin 
        ? "bg-red-500/10 text-red-500 border-red-500/20" 
        : isVendor 
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
          : "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };
  };

  return (
    <PageShell>
      <div className="max-w-[1300px] mx-auto space-y-8 py-2 font-mono text-zinc-300 relative">
        
        {/* Ambient background glow */}
        <div className="absolute -top-40 right-1/4 w-[450px] h-[450px] bg-red-600/5 rounded-full blur-[180px] pointer-events-none" />

        <AnimatePresence mode="wait">
          {!selectedPost ? (
            // ================= FORUM LIST VIEW =================
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {/* Forum Header HUD */}
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-white/[0.04] pb-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-bold tracking-[0.3em] uppercase">
                    <Zap className="w-4 h-4 text-primary animate-pulse" /> 
                    UNDERGROUND_COMMUNITY // Forums & Encrypted Threads
                  </div>
                  <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none">
                    TOPLULUK <span className="text-primary">FORUMU</span>
                  </h1>
                </div>

                <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
                  <DialogTrigger asChild>
                    <button className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-[0_10px_20px_rgba(255,0,0,0.1)] hover:scale-[1.02] active:scale-95">
                      + YENİ_TARTIŞMA_AÇ
                    </button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#050505]/95 backdrop-blur-2xl border-white/[0.04] rounded-3xl max-w-2xl p-8 font-mono text-zinc-300">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black italic text-white uppercase tracking-tight flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" /> YENİ KONU BAŞLATMA TERMİNALİ
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 mt-6 text-[10px]">
                      
                      {/* Topic Category */}
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 font-bold uppercase tracking-wider">KATEGORİ SEÇİN</label>
                        <select
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-red-600/40"
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Title */}
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 font-bold uppercase tracking-wider">KONU BAŞLIĞI</label>
                        <input
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Etkileyici ve açıklayıcı bir başlık girin..."
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-red-600/40"
                        />
                      </div>

                      {/* Content */}
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 font-bold uppercase tracking-wider">TARTIŞMA METNİ / DETAYI</label>
                        <textarea
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          placeholder="Fikirlerinizi, sorularınızı veya detayları buraya yazın..."
                          className="w-full bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-white focus:border-red-600/40 outline-none font-bold h-40 resize-none"
                        />
                      </div>

                      {/* Toggle post anonymously */}
                      <div className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/[0.03] rounded-2xl">
                        <div className="flex items-center gap-3">
                          <EyeOff className="w-4 h-4 text-zinc-500" />
                          <div className="space-y-0.5">
                            <div className="font-bold text-white uppercase tracking-wider text-[9px]">ANONİM OLARAK PAYLAŞ</div>
                            <div className="text-[8px] text-zinc-500">Profiliniz gizlenir, "ANONİM_SİBER" olarak yayınlanır.</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={postAnonymously}
                          onChange={(e) => setPostAnonymously(e.target.checked)}
                          className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                        />
                      </div>

                      <button
                        onClick={handleCreatePost}
                        disabled={submittingPost}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                      >
                        {submittingPost ? "YAYINLANIYOR..." : "KONUYU CANLIYA AL"}
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Forum General Stats Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#040404]/55 backdrop-blur-xl p-5 border border-white/[0.04] rounded-[24px]">
                {[
                  { label: "TOPLAM KONU", value: posts.length, icon: MessageSquare },
                  { label: "TOPLAM YORUM", value: posts.reduce((sum, p) => sum + 3, 0), icon: MessageCircle },
                  { label: "AKTİF ÜYELER", value: Object.keys(profiles).length || 1, icon: User },
                  { label: "SON AKTİVİTE", value: posts.length > 0 ? "ŞİMDİ" : "YOK", icon: Clock },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-3.5 px-4 py-2 border-r border-white/[0.03] last:border-0">
                    <div className="p-2 rounded-lg bg-white/[0.01] border border-white/[0.03]">
                      <stat.icon className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider">{stat.label}</div>
                      <div className="text-sm font-black italic tracking-tighter text-white">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid: Left Category Navigation Panel & Right Topic Stream */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Category Selection Panel */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-[#040404]/55 backdrop-blur-xl p-6 rounded-[28px] border border-white/[0.04] space-y-4">
                    <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.2em] border-b border-white/[0.03] pb-3">
                      FORUM KATEGORİLERİ
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => setCategoryFilter("all")}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          categoryFilter === "all"
                            ? "bg-red-600/10 border-red-500/30 text-white font-black"
                            : "bg-white/[0.01] border-white/[0.02] text-zinc-400 hover:text-white"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase font-bold">📂 Tüm Konular</div>
                          <div className="text-[8px] text-zinc-500">Tüm kategorilerdeki akışı listele</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      </button>

                      {CATEGORIES.map((cat) => {
                        const isSelected = categoryFilter === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? "bg-red-600/10 border-red-500/30 text-white font-black"
                                : "bg-white/[0.01] border-white/[0.02] text-zinc-400 hover:text-white"
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="text-[10px] uppercase font-bold">{cat.label}</div>
                              <div className="text-[8px] text-zinc-500">{cat.desc}</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Topic Stream Panel */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Search and Filters */}
                  <div className="relative group w-full">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-[#040404]/55 backdrop-blur-xl border border-white/[0.04] rounded-2xl pl-14 pr-6 py-4 text-xs text-white focus:outline-none focus:border-red-600/40 transition-all font-bold placeholder-zinc-600"
                      placeholder="FORUMDA YAPILACAK ARAMAYI YAZIN VEYA FİLTRELEYİN..."
                    />
                  </div>

                  {/* List of Posts */}
                  <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                      <div className="text-center py-16 text-zinc-500 uppercase tracking-widest text-xs">
                        FORUM AKIŞI YÜKLENİYOR...
                      </div>
                    ) : filteredPosts.length > 0 ? (
                      filteredPosts.map((post, i) => {
                        const author = getAuthorDisplay(post.author_id);
                        return (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => {
                              setSelectedPost(post);
                              fetchComments(post.id);
                            }}
                            className="bg-[#040404]/55 backdrop-blur-xl p-6 rounded-[28px] border border-white/[0.04] hover:border-red-600/30 hover:shadow-[0_8px_30px_rgba(255,0,0,0.02)] transition-all duration-300 group cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/[0.01] border border-white/[0.03] flex items-center justify-center text-zinc-600 group-hover:text-red-500 transition-colors group-hover:border-red-500/20">
                                  <MessageSquare className="w-5 h-5" />
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    {post.pinned && <Pin className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                                    <span className="text-[7px] text-zinc-400 font-black tracking-widest bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded uppercase">
                                      [{post.category}]
                                    </span>
                                  </div>
                                  <h3 className="text-base font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                                    {post.title}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                                    <span className={`px-2 py-0.5 rounded border ${author.badgeColor} flex items-center gap-1`}>
                                      {author.badge === "ADMIN" && <Award className="w-2.5 h-2.5 text-red-500" />}
                                      {author.name}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="w-3 h-3 text-zinc-600" /> 
                                      {new Date(post.created_at).toLocaleDateString("tr-TR")}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-6 text-right">
                                <div className="hidden sm:block space-y-0.5">
                                  <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">GÖRÜNTÜLEME</div>
                                  <div className="text-sm font-black text-white italic">12</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="bg-[#040404]/55 border border-white/[0.04] p-16 rounded-[28px] text-center text-zinc-500 font-bold tracking-wider uppercase text-xs">
                        Bu kategori altında tartışma kaydı bulunamadı.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          ) : (
            // ================= FORUM DETAIL / READ VIEW =================
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Back button and Admin tools */}
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer bg-white/[0.01] border border-white/[0.03] px-4 py-2 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" /> FORUM AKIŞINA GERİ DÖN
                </button>

                {role === "admin" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleTogglePin(selectedPost)}
                      className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                        selectedPost.pinned
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                          : "bg-white/[0.01] border-white/[0.03] text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Pin className="w-3.5 h-3.5" /> {selectedPost.pinned ? "SABİTLEMEYİ KALDIR" : "SABİTLE"}
                    </button>
                    
                    <button
                      onClick={() => handleDeletePost(selectedPost.id)}
                      className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> KONUYU İMHA ET
                    </button>
                  </div>
                )}
              </div>

              {/* Main Post Card */}
              <div className="bg-[#040404]/55 backdrop-blur-xl p-8 rounded-[36px] border border-white/[0.04] space-y-6">
                <div className="flex items-center gap-2">
                  {selectedPost.pinned && <Pin className="w-4 h-4 text-amber-500 animate-pulse" />}
                  <span className="text-[8px] text-zinc-400 font-black tracking-widest bg-white/[0.02] border border-white/[0.04] px-2 py-0.5 rounded uppercase">
                    [{selectedPost.category.toUpperCase()}]
                  </span>
                </div>

                <h2 className="text-2xl font-black italic tracking-tight text-white uppercase">
                  {selectedPost.title}
                </h2>

                <div className="flex items-center gap-3 border-y border-white/[0.03] py-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-white/[0.02] border border-white/[0.04] flex items-center justify-center text-zinc-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white tracking-wide">
                        {getAuthorDisplay(selectedPost.author_id).name}
                      </span>
                      <span className={`text-[7px] font-bold px-1.5 py-0.2 rounded border ${getAuthorDisplay(selectedPost.author_id).badgeColor}`}>
                        {getAuthorDisplay(selectedPost.author_id).badge}
                      </span>
                    </div>
                    <div className="text-[7px] text-zinc-500 font-bold uppercase tracking-wider">
                      PAYLAŞIM TARİHİ: {new Date(selectedPost.created_at).toLocaleString("tr-TR")}
                    </div>
                  </div>
                </div>

                <div className="text-sm font-medium text-zinc-300 leading-relaxed whitespace-pre-wrap pt-2">
                  {selectedPost.content}
                </div>
              </div>

              {/* Comment Thread Title */}
              <div className="flex items-center gap-4 pt-6">
                <MessageCircle className="w-4 h-4 text-primary animate-pulse" />
                <div className="h-[1px] flex-1 bg-white/[0.04]" />
                <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-[0.3em]">
                  YANIT_VE_TARTIŞMA_AKIŞI // RESPONSES
                </div>
              </div>

              {/* Comment List */}
              <div className="space-y-4">
                {comments.map((comment) => {
                  const author = getAuthorDisplay(comment.author_id);
                  return (
                    <div
                      key={comment.id}
                      className="bg-[#030303]/60 backdrop-blur-xl p-5 rounded-3xl border border-white/[0.04] space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-white/[0.02] pb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-white/[0.01] border border-white/[0.03] flex items-center justify-center text-zinc-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-white">{author.name}</span>
                              <span className={`text-[6px] font-bold px-1 py-0.2 rounded border ${author.badgeColor}`}>
                                {author.badge}
                              </span>
                            </div>
                            <div className="text-[7px] text-zinc-500">
                              {new Date(comment.created_at).toLocaleString("tr-TR")}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-300 pl-1 leading-relaxed">
                        {comment.content}
                      </div>
                    </div>
                  );
                })}

                {comments.length === 0 && (
                  <div className="bg-[#040404]/55 border border-white/[0.04] p-10 rounded-[28px] text-center text-zinc-500 font-bold tracking-wider uppercase text-[9px]">
                    Henüz yorum yapılmamış. İlk yanıtı siz iletin!
                  </div>
                )}
              </div>

              {/* Rich Comment Input Box */}
              <div className="bg-[#040404]/55 backdrop-blur-xl p-6 rounded-[28px] border border-white/[0.04] space-y-4">
                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                  TARTIŞMAYA KATIL // WRITE_REPLY
                </div>
                
                <div className="relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Yanıtınızı buraya yazın..."
                    disabled={submittingComment}
                    className="w-full bg-[#020202] border border-white/[0.04] rounded-xl p-4 text-white focus:outline-none focus:border-red-600/40 font-bold h-28 resize-none text-xs"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleAddComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="bg-red-600 hover:bg-red-700 text-white font-black uppercase px-6 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[9px] tracking-widest shadow-[0_10px_20px_rgba(255,0,0,0.1)] active:scale-[0.98]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submittingComment ? "GÖNDERİLİYOR..." : "YANIT YAYINLA"}
                  </button>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageShell>
  );
}
