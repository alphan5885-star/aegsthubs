import { useState, useEffect, useRef } from "react";
import PageShell from "@/components/PageShell";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "@/lib/router-shim";
import {
  Package,
  Search,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  getAdminProductsFn, addProductFn, editProductFn, deleteProductFn, 
  type Product 
} from "@/lib/productFns";
import { 
  getAdminOrdersFn, getAdminUsersFn, updateOrderStatusFn, approveVendorBondFn 
} from "@/lib/adminFns";

type Tab = "products" | "orders" | "users" | "disputes";

interface Order {
  id: string;
  product_id: string;
  buyer_id: string;
  vendor_id: string;
  amount: number;
  status: string;
  delivery_method: string;
  created_at: string;
  product_name: string;
  buyer_name: string;
  vendor_name: string;
}

interface User {
  id: string;
  identifier: string;
  display_name: string;
  role: string;
  vendor_rating: number;
  vendor_bond_paid: boolean;
  balance_ltc: number;
  balance_btc: number;
  created_at: string;
}

interface Dispute {
  id: string;
  buyer_id: string;
  seller_id: string;
  order_id: string;
  product_name: string;
  amount: number;
  status: string;
  reason: string;
  created_at: string;
}

export default function AdminStore() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Product editing
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<any>>({});
  
  // Order filtering
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updateOrderStatus, setUpdateOrderStatus] = useState<string>("");
  
  // User filtering
  const [userFilter, setUserFilter] = useState<string>("all");
  
  // Product adding
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addForm, setAddForm] = useState<Partial<any>>({
    name: "",
    price: 0,
    currency: "LTC",
    type: "digital",
    stock: 0,
    description: "",
    category: "DIGITAL",
    commission_rate: 5,
    is_active: true,
    vendor_id: "admin-vendor",
  });

  // Load all data
  useEffect(() => {
    isMounted.current = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [prodRes, orderRes, userRes] = await Promise.all([
          getAdminProductsFn(),
          getAdminOrdersFn(),
          getAdminUsersFn(),
        ]);

        if (!isMounted.current) return;

        if (prodRes.success) setProducts(prodRes.products);
        if (orderRes.success) setOrders(orderRes.orders);
        if (userRes.success) setUsers(userRes.users);
        
        // TODO: Add disputes when disputes table implemented
        setDisputes([]);
        setLoading(false);
      } catch (e) {
        if (isMounted.current) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ========== PRODUCTS TAB ==========
  const toggleProductActive = async (id: string, current: boolean | null) => {
    const res = await editProductFn({ id, updates: { is_active: !current } });
    if (!res.success) {
      toast.error(res.error || "Failed to toggle product");
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p)));
    toast.success(!current ? "Ürün aktifleştirildi" : "Ürün devre dışı bırakıldı");
  };

  const deleteProductHandler = async (id: string) => {
    if (!confirm("Ürünü silmek istediğinize emin misiniz?")) return;
    const res = await deleteProductFn({ id });
    if (!res.success) {
      toast.error(res.error || "Failed to delete product");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Ürün silindi");
  };

  const startEdit = (p: any) => {
    setEditingProduct(p.id);
    setEditForm({
      name: p.name || p.title,
      price: p.price,
      currency: p.currency,
      stock: p.stock,
      description: p.description,
      commission_rate: p.commission_rate,
    });
  };

  const saveEdit = async (id: string) => {
    const res = await editProductFn({ 
      id, 
      updates: {
        name: editForm.name,
        title: editForm.name as string,
        price: editForm.price,
        currency: editForm.currency,
        stock: editForm.stock,
        description: editForm.description,
        commission_rate: editForm.commission_rate,
      } 
    });
    if (!res.success) {
      toast.error(res.error || "Failed to edit product");
      return;
    }
    if (res.product) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...res.product } : p)));
    }
    setEditingProduct(null);
    toast.success("Ürün güncellendi");
  };

  const addProductHandler = async () => {
    if (!addForm.name || !addForm.price || !addForm.type) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    const res = await addProductFn({
      vendor_id: addForm.vendor_id || "admin-vendor",
      name: addForm.name as string,
      title: addForm.name as string,
      description: addForm.description,
      price: addForm.price as number,
      currency: addForm.currency as "BTC" | "LTC" | "XMR",
      type: addForm.type as "digital" | "physical",
      stock: addForm.stock as number,
      category: addForm.category,
      commission_rate: addForm.commission_rate as number,
      is_active: addForm.is_active as boolean,
    });
    if (!res.success) {
      toast.error(res.error || "Failed to add product");
      return;
    }
    if (res.product) {
      setProducts((prev) => [res.product as any, ...prev]);
    }
    setShowAddProduct(false);
    setAddForm({
      name: "",
      price: 0,
      currency: "LTC",
      type: "digital",
      stock: 0,
      description: "",
      category: "DIGITAL",
      commission_rate: 5,
      is_active: true,
      vendor_id: "admin-vendor",
    });
    toast.success("Ürün eklendi");
  };

  // ========== ORDERS TAB ==========
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const res = await updateOrderStatusFn({ orderId, status: newStatus });
    if (!res.success) {
      toast.error("Failed to update order status");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    toast.success("Sipariş durumu güncellendi");
    setExpandedOrder(null);
  };

  // ========== USERS TAB ==========
  const handleApproveBond = async (userId: string) => {
    if (!confirm("Satıcı depozitosunu onaylamak istediğinize emin misiniz?")) return;
    const res = await approveVendorBondFn({ userId });
    if (!res.success) {
      toast.error("Failed to approve vendor bond");
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, vendor_bond_paid: true } : u)));
    toast.success("Satıcı depozitosu onaylandı");
  };

  // ========== FILTERING ==========
  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    return (p.name || p.title || "").toLowerCase().includes(search.toLowerCase());
  });

  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (search && !(o.product_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (userFilter !== "all" && u.role !== userFilter) return false;
    if (search && !u.identifier.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColor = (s: string | null) => {
    if (s === "completed") return "text-green-500";
    if (s === "paid" || s === "shipped") return "text-blue-500";
    if (s === "pending") return "text-yellow-500";
    if (s === "cancelled" || s === "disputed") return "text-red-500";
    return "text-muted-foreground";
  };

  const statusIcon = (s: string | null) => {
    if (s === "completed") return <CheckCircle className="w-4 h-4" />;
    if (s === "cancelled") return <XCircle className="w-4 h-4" />;
    if (s === "pending") return <Clock className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground font-mono animate-pulse">Yükleniyor...</div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text">Admin Store Manager</h1>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {(["products", "orders", "users", "disputes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 border-b-2 transition-all font-mono text-sm ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "products" && `📦 Ürünler (${filteredProducts.length})`}
              {t === "orders" && `🛒 Siparişler (${filteredOrders.length})`}
              {t === "users" && `👥 Kullanıcılar (${filteredUsers.length})`}
              {t === "disputes" && `⚠️ İtirazlar (${disputes.length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-white/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        {/* ========== PRODUCTS TAB ========== */}
        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {filteredProducts.length} ürün
              </span>
              <button
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-mono hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> Ürün Ekle
              </button>
            </div>

            {/* Add Product Modal */}
            <AnimatePresence>
              {showAddProduct && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="bg-background border border-white/10 rounded-lg p-6 max-w-md w-full space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h2 className="text-lg font-mono font-bold">Yeni Ürün</h2>
                      <button onClick={() => setShowAddProduct(false)}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <input
                        placeholder="Ürün Adı"
                        value={addForm.name || ""}
                        onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded text-sm text-foreground"
                      />
                      <input
                        placeholder="Fiyat"
                        type="number"
                        value={addForm.price || ""}
                        onChange={(e) => setAddForm({ ...addForm, price: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded text-sm text-foreground"
                      />
                      <select
                        value={addForm.currency || "LTC"}
                        onChange={(e) => setAddForm({ ...addForm, currency: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded text-sm text-foreground"
                      >
                        <option>BTC</option>
                        <option>LTC</option>
                        <option>XMR</option>
                      </select>
                      <select
                        value={addForm.type || "digital"}
                        onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded text-sm text-foreground"
                      >
                        <option value="digital">Dijital</option>
                        <option value="physical">Fiziksel</option>
                      </select>
                      <input
                        placeholder="Açıklama"
                        value={addForm.description || ""}
                        onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-white/10 rounded text-sm text-foreground"
                      />
                    </div>

                    <button
                      onClick={addProductHandler}
                      className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-mono hover:bg-primary/90"
                    >
                      Ürün Ekle
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Products Grid */}
            <div className="space-y-2">
              {filteredProducts.map((p) => (
                <motion.div
                  key={p.id}
                  className="glass-card p-4 rounded-lg flex items-center justify-between hover:bg-white/[0.03] transition-all"
                >
                  {editingProduct === p.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        placeholder="Adı"
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="flex-1 px-2 py-1 bg-background border border-white/10 rounded text-xs"
                      />
                      <input
                        placeholder="Fiyat"
                        type="number"
                        value={editForm.price || ""}
                        onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                        className="w-20 px-2 py-1 bg-background border border-white/10 rounded text-xs"
                      />
                      <button
                        onClick={() => saveEdit(p.id)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingProduct(null)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-mono font-bold text-sm">{p.name || p.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.price} {p.currency} • {p.stock || 0} stock
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleProductActive(p.id, p.is_active)}
                          className={`p-2 rounded ${
                            p.is_active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {p.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => startEdit(p)} className="p-2 hover:bg-white/10 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteProductHandler(p.id)} className="p-2 hover:bg-red-500/10 rounded">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ========== ORDERS TAB ========== */}
        {tab === "orders" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {["all", "pending", "paid", "shipped", "completed", "disputed"].map((s) => (
                <button
                  key={s}
                  onClick={() => setOrderFilter(s)}
                  className={`px-3 py-1 text-xs font-mono rounded-lg border transition-all ${
                    orderFilter === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {s === "all" ? "Tümü" : s.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {filteredOrders.map((o) => (
                <motion.div key={o.id} className="glass-card p-4 rounded-lg">
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                    className="w-full flex items-center justify-between hover:bg-white/[0.03] p-0"
                  >
                    <div className="flex-1 text-left flex items-center gap-3">
                      <div className={`${statusColor(o.status)}`}>{statusIcon(o.status)}</div>
                      <div>
                        <div className="font-mono font-bold text-sm">{o.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {o.buyer_name} → {o.vendor_name} • {o.amount} ???
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-mono ${statusColor(o.status)}`}>{o.status}</span>
                      {expandedOrder === o.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedOrder === o.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-white/10 space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Sipariş ID:</span> {o.id}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Yöntem:</span> {o.delivery_method}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Oluşturuldu:</span>{" "}
                            {new Date(o.created_at).toLocaleString("tr-TR")}
                          </div>
                        </div>

                        <select
                          value={updateOrderStatus}
                          onChange={(e) => setUpdateOrderStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-white/10 rounded text-sm"
                        >
                          <option value="">Durum Değiştir...</option>
                          <option value="pending">Beklemede</option>
                          <option value="paid">Ödendi</option>
                          <option value="shipped">Gönderildi</option>
                          <option value="completed">Tamamlandı</option>
                          <option value="disputed">İtirazlı</option>
                        </select>

                        <button
                          onClick={() => {
                            if (updateOrderStatus) {
                              handleUpdateOrderStatus(o.id, updateOrderStatus);
                              setUpdateOrderStatus("");
                            }
                          }}
                          className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-mono hover:bg-primary/90"
                        >
                          Durum Güncelle
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ========== USERS TAB ========== */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {["all", "admin", "vendor", "user"].map((r) => (
                <button
                  key={r}
                  onClick={() => setUserFilter(r)}
                  className={`px-3 py-1 text-xs font-mono rounded-lg border transition-all ${
                    userFilter === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {r === "all" ? "Tümü" : r.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3">Kullanıcı</th>
                    <th className="text-left p-3">Rol</th>
                    <th className="text-left p-3">Puan</th>
                    <th className="text-left p-3">Bakiye LTC</th>
                    <th className="text-left p-3">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-white/10 hover:bg-white/[0.02]">
                      <td className="p-3">
                        <div className="font-bold">{u.display_name || u.identifier}</div>
                        <div className="text-muted-foreground text-xs">{u.id}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          u.role === "admin" ? "bg-red-500/20 text-red-400" :
                          u.role === "vendor" ? "bg-blue-500/20 text-blue-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">{u.vendor_rating?.toFixed(2) || "0.00"}</td>
                      <td className="p-3">{u.balance_ltc?.toFixed(4) || "0.0000"}</td>
                      <td className="p-3">
                        {u.role === "vendor" && !u.vendor_bond_paid && (
                          <button
                            onClick={() => handleApproveBond(u.id)}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          >
                            Depozitoyu Onayla
                          </button>
                        )}
                        {u.vendor_bond_paid && (
                          <span className="text-green-500 text-xs">✓ Ödendi</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========== DISPUTES TAB ========== */}
        {tab === "disputes" && (
          <div className="p-8 text-center text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>İtiraz yönetimi şu anda yapılıyor... ({disputes.length} itiraz)</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

interface ProductRow {
  id: string;
  name: string | null;
  title: string;
  description: string | null;
  price: number;
  currency: "BTC" | "LTC" | "XMR";
  type: string | null;
  stock: number | null;
  image_emoji: string | null;
  image_url: string | null;
  is_active: boolean | null;
  vendor_id: string;
  category: string | null;
  subcategory?: string | null;
  subsubcategory?: string | null;
  commission_rate: number | null;
  created_at: string;
}

interface OrderRow {
  id: string;
  amount: number;
  status: string | null;
  delivery_method: string | null;
  created_at: string;
  buyer_id: string;
  vendor_id: string;
  product_name: string | null;
  notes: string | null;
}

interface VendorInfo {
  user_id: string;
  display_name: string | null;
  product_count: number;
  order_count: number;
  total_revenue: number;
}

export default function AdminStore() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isMounted = useRef(true);
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [vendors, setVendors] = useState<VendorInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProductRow>>({});
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addForm, setAddForm] = useState<Partial<ProductRow>>({
    name: "",
    price: 0,
    currency: "LTC",
    type: "digital",
    stock: 0,
    description: "",
    category: "DIGITAL",
    subcategory: "CYBER_SECURITY",
    subsubcategory: "EXPLOIT_PAYLOADS",
    commission_rate: 5,
    is_active: true,
    vendor_id: "vendor-test",
  });

  // Fetch all data
  useEffect(() => {
    isMounted.current = true;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const prodRes = await getAdminProductsFn();
        if (!isMounted.current) return;

        if (prodRes.success) setProducts(prodRes.products as any);
        
        // TODO: Add orders and vendors fetch using our db functions later
        setOrders([]);
        setVendors([]);

        setLoading(false);
      } catch (e) {
        if (isMounted.current) setLoading(false);
      }
    };
    fetchAll();
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Product actions
  const toggleProductActive = async (id: string, current: boolean | null) => {
    const res = await editProductFn({ id, updates: { is_active: !current } });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p)));
    toast.success(!current ? "Ürün aktifleştirildi" : "Ürün devre dışı bırakıldı");
  };

  const deleteProductHandler = async (id: string) => {
    const res = await deleteProductFn({ id });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Ürün silindi");
  };

  const startEdit = (p: ProductRow) => {
    setEditingProduct(p.id);
    setEditForm({
      name: p.name,
      price: p.price,
      currency: p.currency,
      stock: p.stock,
      description: p.description,
      commission_rate: p.commission_rate,
    });
  };

  const saveEdit = async (id: string) => {
    const res = await editProductFn({ id, updates: {
      name: editForm.name,
      title: editForm.name as string,
      price: editForm.price,
      currency: editForm.currency,
      stock: editForm.stock,
      description: editForm.description,
      commission_rate: editForm.commission_rate,
    } });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    if (res.product) {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...res.product } : p)),
      );
    }
    setEditingProduct(null);
    toast.success("Ürün güncellendi");
  };

  const addProductHandler = async () => {
    if (!addForm.name || !addForm.price || !addForm.type) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    const res = await addProductFn({
      vendor_id: addForm.vendor_id || "vendor-test",
      name: addForm.name as string,
      title: addForm.name as string,
      description: addForm.description,
      price: addForm.price as number,
      currency: addForm.currency as "BTC" | "LTC" | "XMR",
      type: addForm.type as "digital" | "physical",
      stock: addForm.stock as number,
      category: addForm.category,
      subcategory: addForm.subcategory,
      subsubcategory: addForm.subsubcategory,
      commission_rate: addForm.commission_rate as number,
      is_active: addForm.is_active as boolean,
    });
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    if (res.product) {
      setProducts((prev) => [res.product as any, ...prev]);
    }
    setShowAddProduct(false);
    setAddForm({
      name: "",
      price: 0,
      currency: "LTC",
      type: "digital",
      stock: 0,
      description: "",
      category: "DIGITAL",
      subcategory: "CYBER_SECURITY",
      subsubcategory: "EXPLOIT_PAYLOADS",
      commission_rate: 5,
      is_active: true,
      vendor_id: "vendor-test",
    });
    toast.success("Ürün eklendi");
  };

  // Order actions (TODO: implement later)
  const updateOrderStatus = async (id: string, status: string) => {
    toast.warning("Sipariş işlemleri şu anda devre dışı");
  };

  // Filtered data
  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    return (p.name || p.title || "").toLowerCase().includes(search.toLowerCase());
  });

  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== "all" && o.status !== orderFilter) return false;
    if (
      search &&
      !(o.product_name || "").toLowerCase().includes(search.toLowerCase()) &&
      !o.id.includes(search)
    )
      return false;
    return true;
  });

  const statusColor = (s: string | null) => {
    if (s === "completed") return "text-green-500";
    if (s === "processing") return "text-yellow-500";
    if (s === "cancelled") return "text-destructive";
    return "text-muted-foreground";
  };

  const statusIcon = (s: string | null) => {
    if (s === "completed") return <CheckCircle className="w-3 h-3" />;
    if (s === "processing") return <Clock className="w-3 h-3" />;
    if (s === "cancelled") return <XCircle className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const tabs: { key: Tab; label: string; icon: any; count: number }[] = [
    { key: "products", label: t("adminStore.tabProducts"), icon: Package, count: products.length },
    { key: "orders", label: t("adminStore.tabOrders"), icon: ShoppingCart, count: orders.length },
    { key: "vendors", label: t("adminStore.tabVendors"), icon: Users, count: vendors.length },
  ];

  if (loading) {
    return (
      <PageShell>
        <div className="text-muted-foreground font-mono animate-pulse text-center py-12">
          Yükleniyor...
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-mono font-bold text-primary neon-text">Mağaza Yönetimi</h1>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground">
            {products.length} ürün • {orders.length} sipariş • {vendors.length} satıcı
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-lg border border-border mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSearch("");
            }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono rounded-md transition-all ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            <span
              className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${
                tab === t.key ? "bg-primary-foreground/20" : "bg-border"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "products"
                ? t("adminStore.searchProducts")
                : tab === "orders"
                  ? t("adminStore.searchOrders")
                  : t("adminStore.searchVendors")
            }
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {tab === "orders" && (
          <div className="flex gap-1 p-1 bg-secondary rounded-lg border border-border">
            {["all", "pending", "processing", "completed", "cancelled"].map((f) => (
              <button
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`px-2.5 py-1 text-[10px] font-mono rounded-md transition-all ${
                  orderFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all"
                  ? "TÜMÜ"
                  : f === "pending"
                    ? "BEKLEYEN"
                    : f === "processing"
                      ? "İŞLENEN"
                      : f === "completed"
                        ? "TAMAMLANAN"
                        : "İPTAL"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Tab */}
      {tab === "products" && (
        <div className="space-y-2">
          {/* Add Product Button */}
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setShowAddProduct(!showAddProduct)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-mono hover:bg-primary/90 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> {showAddProduct ? "İptal" : "Ürün Ekle"}
            </button>
          </div>

          {/* Add Product Form */}
          <AnimatePresence>
            {showAddProduct && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="glass-card rounded-lg p-4 mb-4 overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      value={addForm.name || ""}
                      onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                      placeholder="Ürün adı"
                      className="col-span-2 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      value={addForm.price || ""}
                      onChange={(e) =>
                        setAddForm({ ...addForm, price: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="Fiyat"
                      type="number"
                      step="0.0001"
                      className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <select
                      value={addForm.currency || "LTC"}
                      onChange={(e) => setAddForm({ ...addForm, currency: e.target.value as "BTC" | "LTC" | "XMR" })}
                      className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="BTC">BTC</option>
                      <option value="LTC">LTC</option>
                      <option value="XMR">XMR</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      value={addForm.stock ?? ""}
                      onChange={(e) =>
                        setAddForm({ ...addForm, stock: parseInt(e.target.value) || 0 })
                      }
                      placeholder="Stok"
                      type="number"
                      className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <select
                      value={addForm.type || "digital"}
                      onChange={(e) => setAddForm({ ...addForm, type: e.target.value as "digital" | "physical" })}
                      className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="digital">Dijital</option>
                      <option value="physical">Fiziksel</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-mono text-muted-foreground">Komisyon %:</label>
                      <input
                        value={addForm.commission_rate ?? ""}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            commission_rate: parseFloat(e.target.value) || 0,
                          })
                        }
                        type="number"
                        step="0.5"
                        className="w-20 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-mono text-muted-foreground">Aktif:</label>
                      <input
                        type="checkbox"
                        checked={addForm.is_active}
                        onChange={(e) => setAddForm({ ...addForm, is_active: e.target.checked })}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                  <textarea
                    value={addForm.description || ""}
                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    placeholder="Açıklama"
                    rows={2}
                    className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addProductHandler}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-[10px] font-mono rounded hover:bg-green-700"
                    >
                      <Save className="w-3 h-3" /> Ekle
                    </button>
                    <button
                      onClick={() => setShowAddProduct(false)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-muted-foreground text-[10px] font-mono rounded hover:bg-border"
                    >
                      <X className="w-3 h-3" /> İptal
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {filteredProducts.length === 0 ? (
            <div className="glass-card rounded-lg p-8 text-center text-muted-foreground font-mono text-sm">
              Ürün bulunamadı.
            </div>
          ) : (
            filteredProducts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`glass-card rounded-lg p-4 ${p.is_active === false ? "opacity-50" : ""}`}
              >
                {editingProduct === p.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="Ürün adı"
                        className="col-span-2 bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <input
                        value={editForm.price || ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="Fiyat"
                        type="number"
                        step="0.0001"
                        className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <select
                        value={editForm.currency || "LTC"}
                        onChange={(e) => setEditForm({ ...editForm, currency: e.target.value as "BTC" | "LTC" | "XMR" })}
                        className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="BTC">BTC</option>
                        <option value="LTC">LTC</option>
                        <option value="XMR">XMR</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        value={editForm.stock ?? ""}
                        onChange={(e) =>
                          setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })
                        }
                        placeholder="Stok"
                        type="number"
                        className="bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-mono text-muted-foreground">Komisyon %:</label>
                        <input
                          value={editForm.commission_rate ?? ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              commission_rate: parseFloat(e.target.value) || 0,
                            })
                          }
                          type="number"
                          step="0.5"
                          className="w-20 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <textarea
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Açıklama"
                      rows={2}
                      className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(p.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-[10px] font-mono rounded hover:bg-green-700"
                      >
                        <Save className="w-3 h-3" /> Kaydet
                      </button>
                      <button
                        onClick={() => setEditingProduct(null)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-secondary text-muted-foreground text-[10px] font-mono rounded hover:bg-border"
                      >
                        <X className="w-3 h-3" /> İptal
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name || p.title}
                          className="w-12 h-12 rounded object-cover"
                        />
                      ) : (
                        <span className="text-2xl">{p.image_emoji || "📦"}</span>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {p.name || p.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {p.category || t("adminStore.noCategory")} • Komisyon: {p.commission_rate ?? 5}%
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {p.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-sm font-mono font-bold ${p.currency === "BTC" ? "text-orange-500" : p.currency === "LTC" ? "text-primary" : "text-green-500"}`}>
                          {p.price} {p.currency}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Stok: {p.stock ?? 0}
                        </div>
                      </div>
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono ${
                          p.type === "digital"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-orange-500/10 text-orange-400"
                        }`}
                      >
                        {p.type === "digital" ? (
                          <Key className="w-3 h-3" />
                        ) : (
                          <Package className="w-3 h-3" />
                        )}
                        {p.type === "digital" ? "DİJİTAL" : "FİZİKSEL"}
                      </span>
                      <VendorRating vendorId={p.vendor_id} />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(p)}
                          className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleProductActive(p.id, p.is_active)}
                          className="p-1.5 text-muted-foreground hover:text-yellow-500 transition-colors"
                          title={p.is_active !== false ? "Devre dışı bırak" : "Aktifleştir"}
                        >
                          {p.is_active !== false ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => deleteProductHandler(p.id)}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <div className="space-y-2">
          {filteredOrders.length === 0 ? (
            <div className="glass-card rounded-lg p-8 text-center text-muted-foreground font-mono text-sm">
              Sipariş bulunamadı.
            </div>
          ) : (
            filteredOrders.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass-card rounded-lg p-4"
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {o.product_name || "Ürün"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        #{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleDateString("tr-TR")} •{" "}
                        {o.delivery_method || "dijital"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-primary">{o.amount} LTC</div>
                    </div>
                    <span
                      className={`flex items-center gap-1 ${statusColor(o.status)} text-[10px] font-mono`}
                    >
                      {statusIcon(o.status)} {o.status || "pending"}
                    </span>
                    {expandedOrder === o.id ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <AnimatePresence>
                  {expandedOrder === o.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-border space-y-2 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <span className="text-muted-foreground">Alıcı:</span>{" "}
                          <span className="text-foreground">{o.buyer_id.slice(0, 12)}...</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Satıcı:</span>{" "}
                          <span className="text-foreground">{o.vendor_id.slice(0, 12)}...</span>
                        </div>
                        {o.notes && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Not:</span>{" "}
                            <span className="text-foreground">{o.notes}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        {o.status !== "completed" && (
                          <button
                            onClick={() => updateOrderStatus(o.id, "completed")}
                            className="flex items-center gap-1 px-2 py-1 bg-green-600/20 text-green-500 text-[10px] font-mono rounded hover:bg-green-600/30"
                          >
                            <CheckCircle className="w-3 h-3" /> Tamamla
                          </button>
                        )}
                        {o.status !== "processing" && o.status !== "completed" && (
                          <button
                            onClick={() => updateOrderStatus(o.id, "processing")}
                            className="flex items-center gap-1 px-2 py-1 bg-yellow-600/20 text-yellow-500 text-[10px] font-mono rounded hover:bg-yellow-600/30"
                          >
                            <Clock className="w-3 h-3" /> İşleme Al
                          </button>
                        )}
                        {o.status !== "cancelled" && o.status !== "completed" && (
                          <button
                            onClick={() => updateOrderStatus(o.id, "cancelled")}
                            className="flex items-center gap-1 px-2 py-1 bg-destructive/20 text-destructive text-[10px] font-mono rounded hover:bg-destructive/30"
                          >
                            <XCircle className="w-3 h-3" /> İptal Et
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Vendors Tab */}
      {tab === "vendors" && (
        <div className="space-y-2">
          {vendors.length === 0 ? (
            <div className="glass-card rounded-lg p-8 text-center text-muted-foreground font-mono text-sm">
              Kayıtlı satıcı yok.
            </div>
          ) : (
            vendors
              .filter(
                (v) =>
                  !search || (v.display_name || "").toLowerCase().includes(search.toLowerCase()),
              )
              .map((v, i) => (
                <motion.div
                  key={v.user_id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => navigate(`/vendor/${v.user_id}`)}
                  className="glass-card rounded-lg p-4 flex items-center justify-between cursor-pointer hover:neon-border transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-mono text-primary font-bold">
                      {(v.display_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {v.display_name || "Anonim"}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {v.user_id.slice(0, 12)}...
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-foreground">
                        {v.product_count}
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">Ürün</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-foreground">
                        {v.order_count}
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">Sipariş</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-mono font-bold text-primary">
                        {v.total_revenue.toFixed(2)} LTC
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono">Gelir</div>
                    </div>
                    <VendorRating vendorId={v.user_id} />
                  </div>
                </motion.div>
              ))
          )}
        </div>
      )}
    </PageShell>
  );
}
