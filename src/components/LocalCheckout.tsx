// src/components/LocalCheckout.tsx
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { getDepositAddressFn } from "@/lib/walletFns";
import { confirmCryptoPaymentFn } from "@/lib/escrowFns";
import { toast } from "sonner";
import { Loader2, Bitcoin, QrCode, CheckCircle, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface LocalCheckoutProps {
  orderId: string;
  amount: number;
  currency?: string;
  description?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function LocalCheckout({
  orderId,
  amount,
  currency = "USD",
  description = "Order Payment",
  onSuccess,
  onError,
}: LocalCheckoutProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [requiredSatoshis, setRequiredSatoshis] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [rateExpired, setRateExpired] = useState(false);
  const [fundedAmount, setFundedAmount] = useState(0);

  const fetchRate = async () => {
    if (currency === "USD") {
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
        if (!res.ok) throw new Error("Rate fetch failed");
        const data = await res.json();
        const btcPrice = data.bitcoin.usd;
        const btcAmount = amount / btcPrice;
        setRequiredSatoshis(Math.floor(btcAmount * 100000000));
        setTimeLeft(15 * 60);
        setRateExpired(false);
      } catch (e) {
        console.error("Failed to fetch BTC rate", e);
        setRequiredSatoshis(Math.floor((amount / 65000) * 100000000)); // safe fallback
      }
    } else if (currency === "BTC") {
      setRequiredSatoshis(Math.floor(amount * 100000000));
    } else {
      setRequiredSatoshis(amount); // Assume satoshis if unknown
    }
  };

  // Convert fiat/crypto to Satoshis on mount
  useEffect(() => {
    fetchRate();
  }, [amount, currency]);

  // Rate expiration timer
  useEffect(() => {
    if (paymentStatus === "paid" || currency !== "USD" || !address) return;
    if (timeLeft <= 0) {
      setRateExpired(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, paymentStatus, currency, address]);

  // Blockchain Watcher
  useEffect(() => {
    if (!address || paymentStatus === "paid" || !requiredSatoshis) return;

    let timeoutId: NodeJS.Timeout;

    const checkPayment = async () => {
      try {
        const res = await fetch(`https://mempool.space/testnet/api/address/${address}`);
        if (!res.ok) throw new Error("Mempool API error");
        
        const data = await res.json();
        
        // Summing both chain_stats and mempool_stats to immediately detect 0-conf payments
        const fundedSatoshisLocal = 
          (data.chain_stats?.funded_txo_sum || 0) + 
          (data.mempool_stats?.funded_txo_sum || 0);

        setFundedAmount(fundedSatoshisLocal);

        if (fundedSatoshisLocal >= requiredSatoshis) {
          setPaymentStatus("paid");
          try {
            await confirmCryptoPaymentFn({ data: { orderId } });
          } catch (backendErr) {
            console.error("Backend failed to register payment:", backendErr);
            toast.error("Ödeme alındı ancak sisteme işlenirken hata oluştu.");
          }
          toast.success("Ödeme başarıyla alındı ve onaylandı!");
          onSuccess?.();
          return; // Stop polling once paid
        }
      } catch (err) {
        // Silent error to prevent UI spam on network timeouts, just poll again
        if (import.meta.env.DEV) console.error("Blockchain check failed:", err);
      }
      
      timeoutId = setTimeout(checkPayment, 10000); // 10 seconds polling
    };

    // Initial check
    checkPayment();

    return () => clearTimeout(timeoutId);
  }, [address, paymentStatus, requiredSatoshis, onSuccess]);

  const handleLocalPayment = async () => {
    if (!orderId || !amount || amount <= 0) {
      const err = "Geçersiz sipariş veya tutar";
      toast.error(err);
      onError?.(err);
      return;
    }

    if (!user?.id) {
      const err = "Ödeme yapmak için giriş yapmanız gerekiyor.";
      toast.error(err);
      onError?.(err);
      return;
    }

    setLoading(true);
    try {
      const result = await getDepositAddressFn({
        data: {
          userId: user.id,
          network: "BTC",
        },
      });

      if (!result?.address) {
        throw new Error("Adres oluşturulamadı");
      }

      setAddress(result.address);
      toast.success("Ödeme adresi oluşturuldu");
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Ödeme işlemi başarısız";
      toast.error(errMsg);
      onError?.(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Bitcoin className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground mb-1">
              Kripto (Bitcoin) ile Öde
            </h3>
            <p className="text-xs text-muted-foreground">
              Size özel oluşturulacak Bitcoin adresine gönderim yaparak ödemenizi tamamlayın.
            </p>
          </div>
        </div>
      </div>

      {!address ? (
        <button
          onClick={handleLocalPayment}
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Yükleniyor...
            </>
          ) : (
            <>
              <Bitcoin className="w-4 h-4" />
              {amount} {currency} için Adres Oluştur
            </>
          )}
        </button>
      ) : (
        <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-lg p-4 space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-blue-500/10 pb-3">
            <span className="text-sm font-medium text-muted-foreground">Ödenecek Tutar</span>
            <span className="font-semibold text-foreground text-right">
              {amount} {currency}
              {requiredSatoshis && currency === "USD" && (
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  ≈ {(requiredSatoshis / 100000000).toFixed(6)} BTC
                </div>
              )}
              {rateExpired && currency === "USD" && paymentStatus !== "paid" && (
                <div className="text-xs text-red-500 font-mono mt-1">
                  Kur süresi doldu! 
                  <button onClick={fetchRate} className="ml-2 text-blue-500 underline hover:text-blue-400">Yenile</button>
                </div>
              )}
              {!rateExpired && currency === "USD" && paymentStatus !== "paid" && (
                <div className="text-xs text-orange-500 font-mono mt-1">
                  Kalan Süre: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                </div>
              )}
            </span>
          </div>
          
          <div className="space-y-2 pt-1">
            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-blue-500" />
              Transfer Adresi
            </span>
            <div className="bg-background border border-border p-3 rounded-md break-all font-mono text-sm select-all text-center">
              {address}
            </div>
          </div>

          {fundedAmount > 0 && fundedAmount < (requiredSatoshis || 0) && paymentStatus !== "paid" && (
            <div className="flex flex-col gap-1 text-xs text-amber-600 bg-amber-500/10 p-3 rounded border border-amber-500/20 mt-2 shadow-inner">
              <div className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Kısmi Ödeme Tespit Edildi
              </div>
              <div className="opacity-90">
                Gönderilen: {(fundedAmount / 100000000).toFixed(6)} BTC<br/>
                Kalan: {((requiredSatoshis! - fundedAmount) / 100000000).toFixed(6)} BTC
              </div>
              <div className="text-amber-700/80 mt-1 font-medium">Lütfen kalan tutarı aynı adrese gönderin.</div>
            </div>
          )}
          
          {paymentStatus === "paid" ? (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-500/10 p-2 rounded border border-green-500/20 mt-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Ödeme alındı! İşleminiz onaylandı.</span>
            </div>
          ) : (
            fundedAmount === 0 && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-500/10 p-3 rounded border border-blue-500/20 mt-2 shadow-inner">
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold">Watching for payment...</span>
                  <span className="opacity-80">Blockchain canlı olarak izleniyor.</span>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Kripto ödemeleriniz ağ onayından veya mempool'a düştükten sonra otomatik olarak hesabınıza yansıyacaktır.
      </p>
    </div>
  );
}
