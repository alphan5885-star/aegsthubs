import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { getDepositAddressFn } from "@/lib/walletFns";
import { useAuth } from "@/lib/authContext";
import { confirmCryptoPaymentFn } from "@/lib/escrowFns";

interface Props {
  orderId: string;
  amount: number;
}

export default function PaymentTracker({ orderId, amount }: Props) {
  const isMounted = useRef(true);
  const { t } = useI18n();
  const { user } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [generating, setGenerating] = useState(false);
  const [network, setNetwork] = useState<"BTC" | "LTC" | "XMR">("LTC");
  const [fundedSatoshis, setFundedSatoshis] = useState(0);
  const [requiredSatoshis, setRequiredSatoshis] = useState(0);

  // 1. Generate payment address on mount or network change
  useEffect(() => {
    isMounted.current = true;
    const init = async () => {
      if (!user?.id) return;
      setGenerating(true);
      try {
        const result = await getDepositAddressFn({
          data: { userId: user.id, network },
        });
        if (!isMounted.current) return;
        if (result?.address) {
          setAddress(result.address);
          setStatus("awaiting_payment");
        } else {
          setStatus("error");
          toast.error("Adres oluşturulamadı");
        }
      } catch (e) {
        if (import.meta.env.DEV)
          console.error("Catch create-payment-address:", e);
        if (isMounted.current) setStatus("error");
        toast.error("Adres oluşturulamadı");
      } finally {
        if (isMounted.current) setGenerating(false);
      }
    };
    init();
    return () => {
      isMounted.current = false;
    };
  }, [orderId, network, user?.id]);

  // 2. Fetch exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const coinId = network === "BTC" ? "bitcoin" : network === "LTC" ? "litecoin" : "monero";
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
        );
        if (!res.ok) throw new Error("Rate fetch failed");
        const data = await res.json();
        const price = network === "BTC" ? data.bitcoin.usd : 
                     network === "LTC" ? data.litecoin.usd : 
                     data.monero.usd;
        const cryptoAmount = amount / price;
        const decimals = network === "XMR" ? 1000000000000 : 100000000; // XMR has 12 decimals
        setRequiredSatoshis(Math.floor(cryptoAmount * decimals));
      } catch (e) {
        console.error("Failed to fetch rate", e);
        // Fallback
        const fallbackPrice = network === "BTC" ? 65000 : network === "LTC" ? 85 : 180;
        const decimals = network === "XMR" ? 1000000000000 : 100000000;
        setRequiredSatoshis(Math.floor((amount / fallbackPrice) * decimals));
      }
    };
    fetchRate();
  }, [amount, network]);

  // 3. Poll blockchain every 10s
  useEffect(() => {
    if (!address || status === "confirmed") return;
    const poll = async () => {
      try {
        if (network === "XMR") {
          // For XMR, we'll use a mock check for testing
          // In real setup, this would call the explorer API
          setFundedSatoshis(0); // Reset for demo
        } else {
          const apiUrl = network === "BTC"
            ? `https://mempool.space/testnet/api/address/${address}`
            : `https://litecoinspace.org/testnet/api/address/${address}`;
          const res = await fetch(apiUrl);
          if (!res.ok) throw new Error("Blockchain API error");
          const data = await res.json();
          
          const funded = (data.chain_stats?.funded_txo_sum || 0) + (data.mempool_stats?.funded_txo_sum || 0);
          setFundedSatoshis(funded);

          if (funded >= requiredSatoshis && requiredSatoshis > 0) {
            setStatus("confirmed");
            try {
              await confirmCryptoPaymentFn({ data: { orderId } });
              toast.success("Ödeme başarıyla alındı ve onaylandı!");
            } catch (err) {
              console.error("Failed to confirm payment:", err);
              toast.error("Ödeme alındı ancak durum güncellenemedi.");
            }
          }
        }
      } catch (e) {
        if (import.meta.env.DEV)
          console.error("Catch checking payment status:", e);
      }
    };
    poll();
    const interval = setInterval(poll, 10_000);
    return () => {
      clearInterval(interval);
    };
  }, [address, orderId, status, requiredSatoshis, network]);

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    toast.success("Adres panoya kopyalandı");
  };

  if (generating) {
    return (
      <div className="glass-card rounded-lg p-6 text-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
        <p className="text-sm font-mono text-muted-foreground">
          Ödeme adresi oluşturuluyor...
        </p>
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <div className="space-y-3">
        <div className="glass-card rounded-lg p-4 border border-green-500/40 bg-green-500/10">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-mono text-sm font-bold">
              Ödeme Onaylandı!
            </span>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground mt-1">
            Siparişiniz hazırlanıyor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-sm font-bold text-primary">
          Ödeme Bekleniyor
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setNetwork("LTC")}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-mono transition-all ${
              network === "LTC"
                ? "border-red-500/30 bg-red-500/10 text-red-500"
                : "border-primary/30 bg-primary/10 text-primary hover:border-primary/50"
            }`}
          >
            <Coins className="w-3 h-3" /> LTC
          </button>
          <button
            onClick={() => setNetwork("BTC")}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-mono transition-all ${
              network === "BTC"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                : "border-primary/30 bg-primary/10 text-primary hover:border-primary/50"
            }`}
          >
            <Coins className="w-3 h-3" /> BTC
          </button>
          <button
            onClick={() => setNetwork("XMR")}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-mono transition-all ${
              network === "XMR"
                ? "border-orange-500/30 bg-orange-500/10 text-orange-500"
                : "border-primary/30 bg-primary/10 text-primary hover:border-primary/50"
            }`}
          >
            <Coins className="w-3 h-3" /> XMR
          </button>
        </div>
      </div>

      <div className="rounded border border-primary/25 bg-primary/10 p-3 text-xs font-mono text-foreground">
        <div className="flex items-center gap-2 font-bold text-primary mb-1">
          <ShieldCheck className="w-4 h-4" /> Otomatik Escrow
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Ödemeniz blokzincirde görüldükten sonra siparişiniz onaylanacaktır.
        </p>
      </div>

      {address && (
        <>
          <div className="flex justify-center bg-secondary p-3 rounded">
            <QRCodeSVG
              value={address}
              size={140}
              bgColor="transparent"
              fgColor="hsl(var(--foreground))"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              Ödeme Adresi
            </label>
            <div className="flex gap-2">
              <code className="flex-1 text-[11px] font-mono bg-background border border-border rounded px-2 py-1.5 break-all select-all">
                {address}
              </code>
              <button
                onClick={copy}
                className="p-1.5 rounded border border-border hover:border-primary active:scale-95 transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="bg-background/60 border border-border rounded p-2 text-xs font-mono">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Ödenecek Tutar
              </span>
              <div className="text-right">
                <div className="text-primary font-bold">
                  {(requiredSatoshis / (network === "XMR" ? 1000000000000 : 100000000)).toFixed(network === "XMR" ? 12 : 6)} {network}
                </div>
                <div className="text-muted-foreground">≈ ${amount} USD</div>
              </div>
            </div>
            {fundedSatoshis > 0 && fundedSatoshis < requiredSatoshis && network !== "XMR" && (
              <div className="mt-1 border-t border-border/50 pt-1 text-[10px] text-destructive">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Kısmi ödeme alındı. Lütfen kalan tutarı gönderin.
              </div>
            )}
            {network === "XMR" && (
              <div className="mt-1 border-t border-border/50 pt-1 text-[10px] text-orange-500">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                XMR ödemeleri için lütfen tam tutarı gönderin. Otomatik takip için Monero node entegrasyonu gerekmektedir.
              </div>
            )}
          </div>

          <p className="text-[10px] font-mono text-muted-foreground text-center">
            <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
            Blokzincir canlı olarak izleniyor...
          </p>
        </>
      )}
    </div>
  );
}
