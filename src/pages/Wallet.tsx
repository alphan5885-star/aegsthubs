import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Balance = { available: number; pending: number; total: number };

export default function Wallet() {
  const [ltcAddress, setLtcAddress] = useState<string>("");
  const [balance, setBalance] = useState<Balance>({ available: 0, pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [pinHash, setPinHash] = useState<string | null>(null);

  const ensureDepositAddress = async () => {
    // Önce DB'de kayıtlı kişisel adres var mı?
    const { data: existing } = await supabase
      .from("user_deposit_addresses")
      .select("address")
      .eq("network", "LTC")
      .maybeSingle();
    if (existing?.address) {
      setLtcAddress(existing.address);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("create-deposit-address", { body: {} });
      if (!error && data?.address) {
        setLtcAddress(data.address);
        return;
      }
      toast.error("LTC yatırma adresi sağlayıcısı şu an çevrim dışı. Lütfen birkaç dakika sonra tekrar dene.");
    } catch {
      toast.error("LTC yatırma adresi alınamadı.");
    }
  };

  const refreshBalance = async (showToast = false) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-deposits", { body: {} });
      if (error) throw new Error(error.message);
      if (data?.balance) {
        setBalance({
          available: Number(data.balance.available || 0),
          pending: Number(data.balance.pending || 0),
          total: Number(data.balance.total || 0),
        });
      }
      if (showToast) {
        toast.success(
          data?.credited
            ? `${data.credited} yeni transfer onaylandı ve bakiyene eklendi.`
            : "Yeni onaylı transfer bulunamadı.",
        );
      }
    } finally {
      setSyncing(false);
    }
  };

useEffect(() => {
    const init = async () => {
      try {
        await ensureDepositAddress();
        await refreshBalance(false);
        // Get user's pin hash for withdrawals
        const { data: profileData } = await supabase
          .from("profiles")
          .select("withdraw_pin_hash")
          .maybeSingle();
        if (profileData?.withdraw_pin_hash) {
          setPinHash(profileData.withdraw_pin_hash);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Cüzdan yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleWithdraw = async () => {
    if (!withdrawAddr || !withdrawAmount) return;
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Geçersiz miktar"); return; }
    if (amt > balance.available) { toast.error("Yetersiz bakiye"); return; }
    setWithdrawing(true);
    try {
      if (!pinHash) {
        toast.error("Para çekme PIN'i belirlenmemiş. Profil sayfasından PIN oluştur.");
        return;
      }
      const { data, error } = await supabase.rpc("user_withdraw_ltc", {
        _address: withdrawAddr,
        _amount: amt,
        _pin_hash: pinHash,
      });
      if (error || !(data as any)?.success) {
        const msg = (data as any)?.error;
        toast.error(
          msg === "insufficient_balance" ? "Yetersiz bakiye" :
          msg === "invalid_address" ? "Geçersiz LTC adresi" : "Çekim başarısız",
        );
        return;
      }
      toast.success(`${amt} LTC çekim talebi oluşturuldu.`);
      setWithdrawAddr("");
      setWithdrawAmount("");
      setBalance((prev) => ({
        ...prev,
        available: prev.available - amt,
        total: prev.total - amt,
      }));
    } finally {
      setWithdrawing(false);
    }
  };

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Adres panoya kopyalandı");
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
<h1 className="text-2xl font-mono font-bold text-primary neon-text">Cüzdan</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            LTC/XMR cüzdan adreslerine para yatır, 3 onaydan sonra bakiyene otomatik yansır
          </p>
        </div>

        <div className="glass-card neon-border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded border border-border p-3 bg-background/40">
              <div className="text-[10px] text-muted-foreground font-mono">Kullanilabilir</div>
              <div className="text-lg font-mono text-primary">
                {balance.available.toFixed(8)} <span className="text-xs">LTC</span>
              </div>
            </div>
            <div className="rounded border border-border p-3 bg-background/40">
              <div className="text-[10px] text-muted-foreground font-mono">Bekleyen</div>
              <div className="text-lg font-mono text-foreground">
                {balance.pending.toFixed(8)} <span className="text-xs">LTC</span>
              </div>
            </div>
            <div className="rounded border border-border p-3 bg-background/40">
              <div className="text-[10px] text-muted-foreground font-mono">Toplam</div>
              <div className="text-lg font-mono text-foreground">
                {balance.total.toFixed(8)} <span className="text-xs">LTC</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => refreshBalance(true)}
              size="sm"
              variant="outline"
              disabled={syncing || loading}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
              BlockCypher ile Yenile
            </Button>
          </div>

          <h2 className="font-mono text-sm text-foreground">LTC Adresi</h2>
          <div className="flex flex-col items-center gap-3 p-4 bg-background/40 rounded">
            <div className="bg-white p-3 rounded">
              <QRCodeCanvas value={ltcAddress || "loading"} size={160} />
            </div>
            <div className="w-full flex items-center gap-2">
              <code className="flex-1 text-xs font-mono break-all bg-background/60 px-2 py-1.5 rounded border border-border text-primary">
                {ltcAddress || "Adres olusturuluyor..."}
              </code>
              <Button
                onClick={() => ltcAddress && copy(ltcAddress)}
                size="sm"
                variant="outline"
                disabled={!ltcAddress}
                className="shrink-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm text-foreground">Para Çekimi (LTC)</h2>
              <span className="text-[10px] font-mono text-muted-foreground">
                Maks: {balance.available.toFixed(8)} LTC
              </span>
            </div>

            <div className="flex gap-2">
              <input
                value={withdrawAddr}
                onChange={(e) => setWithdrawAddr(e.target.value)}
                placeholder="LTC Cüzdan Adresi"
                disabled={withdrawing}
                className="flex-1 bg-background/60 border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Miktar"
                type="number"
                step="0.00000001"
                min="0"
                max={balance.available}
                disabled={withdrawing}
                className="w-28 bg-background/60 border border-border rounded px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                onClick={handleWithdraw}
                disabled={withdrawing || balance.available <= 0}
                size="sm"
                variant="outline"
              >
                {withdrawing ? "..." : "Çek"}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 px-3 py-2 rounded bg-destructive/10 border border-destructive/40 text-xs font-mono text-destructive">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Ödeme yapmadan önce ağ türünü doğrula. Yanlış ağa gönderilen transferler geri
              alınamaz.
            </span>
          </div>
          <div className="flex items-start gap-2 px-3 py-2 rounded bg-primary/10 border border-primary/40 text-xs font-mono text-primary">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              LTC transferleri BlockCypher'da 3 onay aldiginda otomatik bakiyene eklenir. XMR manuel doğrulama ile işlenir. Satin alimda bakiye escrowa kilitlenir; teslimatta %90 saticiya, %10 admin hesaba aktarilir.
            </span>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
