import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "@/lib/router-shim";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { ShoppingCart, Key, Package, User, Shield, Lock, Plus, CheckCircle, Zap, ArrowUpRight, Activity, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import VendorRating from "@/components/VendorRating";
import PgpBadge from "@/components/PgpBadge";
import DeliveryMethodSelector from "@/components/DeliveryMethodSelector";
import MathCaptcha from "@/components/MathCaptcha";
import { encryptForRecipient } from "@/lib/pgp";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cartContext";
import { getProductReviews, addProductReview, getProductAverageRating } from "@/lib/productReviews";

interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  vendor_id: string;
  stock: number;
  image_emoji: string | null;
  image_url: string | null;
  category: string | null;
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [vendorName, setVendorName] = useState<string>("");
  const [vendorPgp, setVendorPgp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryMethod, setDeliveryMethod] = useState<any>("cargo");
  const [shippingAddress, setShippingAddress] = useState("");
  const [captchaOk, setCaptchaOk] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Product Reviews and Ratings State
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [userHoverRating, setUserHoverRating] = useState<number>(0);
  const [userComment, setUserComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const { addItem, isInCart } = useCart();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (data) {
        setProduct(data as ProductRow);
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", data.vendor_id).maybeSingle();
        if (profile) setVendorName(profile.display_name || "ANONYMOUS_VENDOR");
        const { data: pgp } = await (supabase as any).from("user_pgp_keys").select("public_key").eq("user_id", data.vendor_id).maybeSingle();
        if (pgp) setVendorPgp(pgp.public_key);
      }
      
      // Load reviews
      const productReviews = getProductReviews(id);
      setReviews(productReviews);
      const avgData = getProductAverageRating(id);
      setAvgRating(avgData.avg);
      
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!user) {
      toast.error("Yorum yapmak için giriş yapmalısınız.");
      return;
    }
    if (userRating === 0) {
      toast.error("Lütfen bir puan (yıldız) seçin.");
      return;
    }
    
    setSubmittingReview(true);
    const reviewerName = user.email ? user.email.split("@")[0].toUpperCase() : "ANON_USER";
    const newReview = addProductReview(id, userRating, userComment, reviewerName);
    
    // Update local state
    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);
    const avgData = getProductAverageRating(id);
    setAvgRating(avgData.avg);
    
    // Reset form
    setUserRating(0);
    setUserComment("");
    setSubmittingReview(false);
    
    toast.success("Yorumunuz başarıyla eklendi.");
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.image_url,
      imageEmoji: product.image_emoji,
      type: product.type as "digital" | "physical",
      vendorId: product.vendor_id,
    });
    toast.success("Sepete eklendi.");
  };

  const handleStartPayment = async () => {
    if (!product || !user || !captchaOk) return;
    setCreating(true);
    try {
      let finalAddress = shippingAddress;
      if (vendorPgp && shippingAddress.trim()) {
        finalAddress = await encryptForRecipient(shippingAddress, vendorPgp);
      }
      const { data, error } = await (supabase as any).rpc("create_order_with_escrow", {
        _product_id: product.id,
        _delivery_method: deliveryMethod,
        _shipping_address: finalAddress,
        _notes: "PGP_ENCRYPTED_PAYLOAD",
      });
      if (!error && (data as any)?.order_id) {
        toast.success("Sipariş başarıyla oluşturuldu.");
        navigate("/orders");
      } else {
        toast.error((data as any)?.error || "İşlem başarısız.");
      }
    } catch {
      toast.error("Şifreleme veya sipariş hatası.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <PageShell><div className="p-20 text-[10px] text-zinc-800 font-black animate-pulse">SİSTEM_VERİLERİ_YÜKLENİYOR...</div></PageShell>;
  if (!product) return <PageShell><div className="p-20 text-red-600 font-black">VARLIK_BULUNAMADI</div></PageShell>;

  return (
    <PageShell>
      <div className="max-w-[1200px] mx-auto py-8 space-y-12 font-mono">
        
        {/* Breadcrumb HUD */}
        <div className="flex items-center gap-4 text-[9px] text-zinc-800 font-black uppercase tracking-[0.4em]">
           <button onClick={() => navigate(-1)} className="hover:text-red-600 transition-colors">DATABASE</button>
           <span>/</span>
           <span className="text-red-600">ASSET_VIEW</span>
           <span>/</span>
           <span className="text-white">{product.id.slice(0,8)}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Visual Column */}
          <div className="lg:col-span-7 space-y-8">
             <div className="aspect-video bg-black rounded-[40px] overflow-hidden border-2 border-white/5 relative group">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-80" />
                {product.image_url ? (
                  <img src={product.image_url} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl grayscale opacity-10 group-hover:opacity-100 transition-all duration-700">
                    {product.image_emoji || "📦"}
                  </div>
                )}
                
                {/* Floating Tags */}
                <div className="absolute top-6 left-6 z-20 flex gap-3">
                   <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full text-[8px] font-black text-white uppercase tracking-widest">
                      {product.category || "GENERAL"}
                   </div>
                   <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${product.type === "digital" ? "bg-red-600 text-white" : "bg-white text-black"}`}>
                      {product.type === "digital" ? "DIGITAL_DATA" : "PHYSICAL_ASSET"}
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase leading-none group-hover:text-red-600">
                  {product.name}
                </h1>
                
                {/* Rating display under product name */}
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                         <Star 
                            key={s} 
                            className={`w-3.5 h-3.5 ${s <= Math.round(avgRating) ? "text-yellow-500 fill-yellow-500" : "text-zinc-700"}`} 
                         />
                      ))}
                   </div>
                   <span className="text-[10px] font-black text-white bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-md">
                      {avgRating > 0 ? `${avgRating} / 5` : "PUAN_YOK"}
                   </span>
                   <span className="text-[9px] font-bold text-zinc-600 uppercase">
                      ({reviews.length} GÖRÜŞ)
                   </span>
                </div>

                <p className="text-[11px] text-zinc-700 font-bold uppercase tracking-widest leading-relaxed max-w-xl">
                   {product.description || "NO_PRODUCT_SPECIFICATIONS_FOUND_IN_CENTRAL_LOGS."}
                </p>
             </div>
          </div>

          {/* Pricing & Checkout Column */}
          <div className="lg:col-span-5 space-y-10">
             
             {/* Pricing Card */}
             <div className="obsidian-card p-8 rounded-[40px] border-2 border-white/5 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6">
                   <Zap className="w-6 h-6 text-red-600 opacity-20" />
                </div>
                
                <div className="space-y-1">
                   <div className="text-[9px] text-zinc-800 font-black uppercase tracking-widest">AKTARIM_DEĞERİ</div>
                   <div className="text-4xl font-black text-white italic tracking-tighter">
                      {product.price.toFixed(4)} <span className="text-xs text-red-600 not-italic ml-1">LTC</span>
                   </div>
                   <div className="flex items-center gap-4 text-[8px] text-zinc-800 font-black uppercase tracking-widest pt-2">
                      <span className="flex items-center gap-2"><Shield className="w-3 h-3 text-red-900" /> ESCROW_ACTIVE</span>
                      <span className="flex items-center gap-2"><Activity className="w-3 h-3 text-red-900" /> STOCK: {product.stock}</span>
                   </div>
                </div>

                <div className="h-[1px] bg-white/5" />

                {/* Vendor HUD */}
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                         <User className="w-5 h-5 text-zinc-700" />
                      </div>
                      <div className="space-y-0.5">
                         <div className="text-[9px] font-black text-white uppercase tracking-widest">{vendorName}</div>
                         <VendorRating vendorId={product.vendor_id} size="sm" />
                      </div>
                   </div>
                   <PgpBadge userId={product.vendor_id} size="sm" />
                </div>
             </div>

             {/* Order Configuration */}
             <div className="space-y-8">
                {product.type === "physical" && (
                  <div className="space-y-6">
                     <DeliveryMethodSelector value={deliveryMethod} onChange={setDeliveryMethod} productType="physical" />
                     <div className="space-y-2">
                        <div className="flex items-center justify-between">
                           <label className="text-[9px] text-zinc-800 font-black tracking-widest uppercase">TESLİMAT_ADRESİ (PGP_ENCRYPTED)</label>
                           {vendorPgp && <span className="text-[7px] text-red-600 font-black uppercase">SECURE_PGP_LINK</span>}
                        </div>
                        <textarea
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          className="w-full bg-[#050505] border-2 border-white/5 rounded-[24px] p-5 text-[10px] text-white focus:border-red-600/50 outline-none font-black h-24 resize-none"
                          placeholder="Şifreli veri girişi yapın..."
                        />
                     </div>
                  </div>
                )}

                <div className="bg-white/[0.01] border border-white/5 rounded-[24px] p-6 scale-90 origin-left">
                   <MathCaptcha onValidChange={setCaptchaOk} label="SİSTEM_DOĞRULAMASI" />
                </div>

                <div className="flex flex-col gap-3">
                   <button
                     onClick={handleStartPayment}
                     disabled={!captchaOk || creating}
                     className="w-full bg-red-600 text-white py-6 rounded-[32px] text-[10px] font-black uppercase tracking-[0.4em] hover:bg-red-700 transition-all shadow-[0_15px_30px_rgba(255,0,0,0.1)] active:scale-95 duration-500 disabled:opacity-50"
                   >
                     {creating ? "HAZIRLANIYOR..." : "HEMEN_SATIN_AL"}
                   </button>
                   <button 
                     onClick={handleAddToCart}
                     className="w-full bg-white/[0.02] border border-white/10 text-white py-4 rounded-[24px] text-[9px] font-black uppercase tracking-widest hover:bg-white/[0.05] transition-all"
                   >
                      SEPETE_EKLE
                   </button>
                </div>
             </div>
          </div>
        </div>

        {/* Yorumlar ve Değerlendirmeler Section */}
        <div className="border-t border-white/[0.04] pt-12 mt-12 space-y-8">
          <div className="space-y-2">
            <span className="text-[9px] text-zinc-500 font-bold tracking-[0.3em] uppercase">SYSTEM_FEEDBACK_LOGS</span>
            <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">
              KULLANICI DEĞERLENDİRMELERİ & YORUMLAR
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Yorum Yapma Formu */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#030303]/30 border border-white/[0.04] p-6 rounded-[28px] space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                  <MessageSquare className="w-5 h-5 text-red-600 opacity-10" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">GERİ BİLDİRİM GÖNDER</h3>
                  <p className="text-[9px] text-zinc-600 uppercase font-bold">Deneyiminizi diğer kullanıcılarla paylaşın.</p>
                </div>
                
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Yıldız Derecelendirmesi */}
                  <div className="space-y-2">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block">Ürün Puanı</label>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          type="button"
                          key={s}
                          onMouseEnter={() => setUserHoverRating(s)}
                          onMouseLeave={() => setUserHoverRating(0)}
                          onClick={() => setUserRating(s)}
                          className="p-1 transition-transform hover:scale-110 cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 ${(userHoverRating || userRating) >= s ? "text-yellow-500 fill-yellow-500" : "text-zinc-700"}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Yorum Girişi */}
                  <div className="space-y-2">
                    <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block">Yorumunuz</label>
                    <textarea
                      required
                      value={userComment}
                      onChange={(e) => setUserComment(e.target.value)}
                      placeholder="Ürün hakkındaki geri bildiriminizi yazın..."
                      rows={4}
                      className="w-full bg-[#050505] border border-white/5 rounded-[18px] p-4 text-[10px] text-white focus:border-red-600/50 focus:outline-none font-bold resize-none"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submittingReview || userRating === 0}
                    className="w-full bg-red-600 text-white py-3 rounded-[18px] text-[9px] font-black uppercase tracking-[0.3em] hover:bg-red-700 transition-all active:scale-95 duration-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    {submittingReview ? "GÖNDERİLİYOR..." : "YORUMU GÖNDER"}
                  </button>
                </form>
              </div>
            </div>
            
            {/* Yorumlar Listesi */}
            <div className="lg:col-span-8 space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
              {reviews.length === 0 ? (
                <div className="bg-[#030303]/20 border border-white/[0.02] p-12 rounded-[28px] text-center space-y-2">
                  <div className="text-xs font-black text-zinc-600 uppercase tracking-widest">HENÜZ YORUM YAPILMAMIŞ</div>
                  <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">İlk yorumu siz yazarak deneyiminizi paylaşabilirsiniz.</p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div key={r.id} className="bg-[#020202]/30 border border-white/[0.03] rounded-[24px] p-6 space-y-4 hover:border-white/[0.08] transition-all duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-center">
                          <span className="text-[10px] font-black text-zinc-500 uppercase">{r.username.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-white uppercase tracking-wider">{r.username}</div>
                          <div className="text-[7px] text-zinc-600 font-bold uppercase tracking-widest">
                            {new Date(r.created_at).toLocaleDateString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-zinc-800"}`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wide leading-relaxed pl-1">
                      {r.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
