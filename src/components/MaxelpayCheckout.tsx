import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { createMaxelpaySessionFn } from "@/lib/maxelpay";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface MaxelpayCheckoutProps {
  orderId: string;
  amount: number;
  currency?: string;
  description?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function MaxelpayCheckout({
  orderId,
  amount,
  currency = "USD",
  description = "Order Payment",
  onSuccess,
  onError,
}: MaxelpayCheckoutProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleMaxelpayPayment = async () => {
    if (!orderId || !amount || amount <= 0) {
      const error = "Geçersiz sipariş veya tutar";
      toast.error(error);
      onError?.(error);
      return;
    }

    if (!user?.id) {
      const error = "Ödeme yapmak için giriş yapmanız gerekiyor.";
      toast.error(error);
      onError?.(error);
      return;
    }

    setLoading(true);
    try {
      const result = await createMaxelpaySessionFn({
        data: {
          userId: user.id,
          orderId,
          amount,
          currency,
          description,
        },
      });

      if (!result?.checkout_url) {
        const errorMsg = "Maxelpay ödeme oturumu oluşturulamadı";
        toast.error(errorMsg);
        onError?.(errorMsg);
        return;
      }

      window.location.href = result.checkout_url;
      onSuccess?.();
    } catch (e) {
      const errorMsg =
        e instanceof Error ? e.message : "Ödeme işlemi başarısız";
      toast.error(errorMsg);
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-foreground mb-1">
              Maxelpay ile Öde
            </h3>
            <p className="text-xs text-muted-foreground">
              Kredi kartı, banka transferi ve diğer ödeme yöntemlerini
              kullanarak güvenli bir şekilde ödeme yapın.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleMaxelpayPayment}
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
            <CreditCard className="w-4 h-4" />
            {amount} {currency} ile Maxelpay'den Ödeme Yap
          </>
        )}
      </button>

      <p className="text-[10px] text-muted-foreground text-center">
        Maxelpay tarafından güvenli bir şekilde işlenir. Kartınız direkt olarak
        bizim sunucularımızda saklanmaz.
      </p>
    </div>
  );
}
