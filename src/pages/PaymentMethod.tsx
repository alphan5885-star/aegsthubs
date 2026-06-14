import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LocalCheckout from "@/components/LocalCheckout";

import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/authContext";
import PageShell from "@/components/PageShell";
import { CreditCard, Bitcoin, Wallet, Loader2 } from "lucide-react";
import { confirmCryptoPaymentFn, payWithWalletBalanceFn } from "@/lib/escrowFns";
import { toast } from "sonner";
import PaymentTracker from "@/components/PaymentTracker";

interface PaymentPageProps {
  orderId: string;
  amount: number;
  productTitle?: string;
}

export default function PaymentMethodPage({
  orderId,
  amount,
  productTitle = "Ürün",
}: PaymentPageProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<"zpub" | "crypto" | "wallet">("zpub");
  const [walletLoading, setWalletLoading] = useState(false);

  const handleWalletPayment = async (currency: "BTC" | "LTC") => {
    if (!user) {
      toast.error("Lütfen giriş yapın");
      return;
    }
    setWalletLoading(true);
    try {
      await payWithWalletBalanceFn({ data: { orderId, currency } });
      toast.success("Ödeme Başarılı! Siparişiniz onaylandı.");
      setTimeout(() => {
        window.location.href = "/orders";
      }, 1500);
    } catch (e: any) {
      toast.error(e.message || "Bakiye ile ödeme başarısız.");
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto p-4">
        {/* Order Summary */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-2">{productTitle}</h2>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Toplam Tutar:</span>
            <span className="text-2xl font-bold text-primary">
              {amount} USD
            </span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <Tabs
          value={selectedMethod}
          onValueChange={(v) => setSelectedMethod(v as any)}
        >
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="zpub" className="gap-2">
              <CreditCard className="w-4 h-4" />
              ZPub
            </TabsTrigger>
            <TabsTrigger value="crypto" className="gap-2">
              <Bitcoin className="w-4 h-4" />
              Bitcoin/Crypto
            </TabsTrigger>
            <TabsTrigger value="wallet" className="gap-2">
              <Wallet className="w-4 h-4" />
              İç Cüzdan
            </TabsTrigger>
          </TabsList>

            {/* ZPub Checkout using local address generation */}
            <TabsContent value="zpub" className="space-y-4">
              <LocalCheckout
                orderId={orderId}
                amount={amount}
                currency="USD"
                description={`${productTitle} - Ödeme`}
                onSuccess={async () => {
                  console.log("Payment successful!");
                  try {
                    await confirmCryptoPaymentFn({ data: { orderId } });
                    toast.success("Ödeme Başarılı! Siparişiniz onaylandı.");
                    setTimeout(() => {
                      window.location.href = "/orders";
                    }, 1500);
                  } catch (err) {
                    console.error("Failed to update payment status:", err);
                    toast.error("Ödeme alındı ancak durum güncellenemedi.");
                  }
                }}
                onError={(error) => {
                  console.error("Payment error:", error);
                  toast.error("Ödeme sırasında bir hata oluştu.");
                }}
              />
            
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-700">
              <p className="font-semibold mb-2">💳 ZPub Nedir?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>ZPub, sadece okuma yetkisi verilen genişletilmiş public anahtar.</li>
                <li>Her sipariş için tekil Bitcoin adresi türetir.</li>
                <li>Kullanıcı ödemeyi bu adrese gönderir, ardından izlenir.</li>
                <li>Dış API'ye bağımlı değildir.</li>
              </ul>
            </div>
          </TabsContent>

          {/* Crypto Payment */}
          <TabsContent value="crypto" className="space-y-4">
            <PaymentTracker orderId={orderId} amount={amount} />

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-700">
              <p className="font-semibold mb-2">₿ Kripto Para ile Ödeme</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>LTC, BTC ve XMR ile ödeme yapabilirsiniz</li>
                <li>3 doğrulama (konfirmasyon) sonrası sipariş onaylanır</li>
                <li>Tam anonimlik ve gizlilik</li>
                <li>Blockchain tarafından doğrulandı</li>
              </ul>
            </div>
          </TabsContent>

          {/* Internal Wallet Payment */}
          <TabsContent value="wallet" className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" /> İç Cüzdan Bakiyesi ile Öde
              </h3>
              
              {user ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background border border-border rounded-md p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-sm text-muted-foreground mb-1">BTC Bakiyeniz</span>
                      <span className="font-mono font-bold text-foreground">{user.balance_btc || 0} BTC</span>
                      <button 
                        onClick={() => handleWalletPayment("BTC")}
                        disabled={walletLoading}
                        className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded disabled:opacity-50 flex items-center gap-2"
                      >
                        {walletLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "BTC ile Öde"}
                      </button>
                    </div>
                    <div className="bg-background border border-border rounded-md p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-sm text-muted-foreground mb-1">LTC Bakiyeniz</span>
                      <span className="font-mono font-bold text-foreground">{user.balance_ltc || 0} LTC</span>
                      <button 
                        onClick={() => handleWalletPayment("LTC")}
                        disabled={walletLoading}
                        className="mt-3 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded disabled:opacity-50 flex items-center gap-2"
                      >
                        {walletLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "LTC ile Öde"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground text-sm py-4">
                  Lütfen giriş yapın.
                </div>
              )}
            </div>

            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-sm text-primary">
              <p className="font-semibold mb-2">💰 İç Cüzdan Nedir?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Sisteme önceden yüklediğiniz bakiyedir.</li>
                <li>Sıfır işlem ücreti (fee) ile anında ödeme yaparsınız.</li>
                <li>Blokzinciri onayı beklemenize gerek kalmaz, siparişiniz anında onaylanır.</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

        {/* Security Badge */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-center text-xs text-muted-foreground">
            🔒 Tüm işlemler SSL/TLS ile şifrelenir. Kredi kartı bilgileri direkt
            bizim sunucularımızda saklanmaz.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
