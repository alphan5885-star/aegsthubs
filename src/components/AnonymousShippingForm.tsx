import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { encryptForRecipient } from "@/lib/pgp";
import { useI18n } from "@/lib/i18n";
import { COUNTRIES } from "@/lib/countries";
import {
  generateCoverIdentity,
  STEALTH_METHODS,
  SHIPPING_CARRIERS,
} from "@/lib/coverIdentity";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shuffle, Lock, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  buyerId: string;
  onSubmitted?: () => void;
}

export default function AnonymousShippingForm({
  open,
  onOpenChange,
  orderId,
  buyerId,
  onSubmitted,
}: Props) {
  const { t } = useI18n();
  const [carrier, setCarrier] = useState("stealth_mail");
  const [tracking, setTracking] = useState("");
  const [countryFrom, setCountryFrom] = useState("NL");
  const [countryTo, setCountryTo] = useState("US");
  const [stealth, setStealth] = useState("vacuum_sealed");
  const [coverName, setCoverName] = useState("");
  const [notes, setNotes] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [buyerKey, setBuyerKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !buyerId) return;
    supabase
      .from("user_pgp_keys")
      .select("public_key")
      .eq("user_id", buyerId)
      .maybeSingle()
      .then(({ data }: any) => setBuyerKey(data?.public_key ?? null));
  }, [open, buyerId]);

  const generateCover = () => {
    const cov = generateCoverIdentity(countryFrom);
    setCoverName(cov.full);
  };

  const handleSubmit = async () => {
    if (!tracking.trim()) {
      toast.error(t("err.required"));
      return;
    }
    setSubmitting(true);
    try {
      let encrypted: string | null = null;
      if (buyerKey) {
        try {
          encrypted = await encryptForRecipient(tracking, buyerKey);
        } catch (e) {
          console.error("PGP encrypt failed:", e);
        }
      }

      const { error } = await supabase.from("shipping_tracking").upsert(
        {
          order_id: orderId,
          tracking_number: encrypted ? "[ENCRYPTED]" : tracking,
          pgp_encrypted_tracking: encrypted,
          carrier,
          country_from: countryFrom,
          country_to: countryTo,
          stealth_method: stealth,
          cover_sender_name: coverName || null,
          notes: notes || null,
          is_anonymous: anonymous,
          status: "shipped",
          shipped_at: new Date().toISOString(),
        },
        { onConflict: "order_id" },
      );
      if (error) throw error;

      const { error: rpcErr } = await supabase.rpc("mark_order_shipped", {
        _order_id: orderId,
      });
      if (rpcErr) console.warn("mark_order_shipped:", rpcErr);

      toast.success(t("delivery.submitted"));
      onSubmitted?.();
      onOpenChange(false);
      setTracking("");
      setCoverName("");
      setNotes("");
    } catch (e: any) {
      toast.error(e?.message || t("err.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> {t("delivery.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {!buyerKey && (
            <div className="flex gap-2 items-start text-[11px] font-mono text-yellow-400 bg-yellow-500/10 rounded p-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("delivery.noBuyerKey")}</span>
            </div>
          )}
          {buyerKey && (
            <div className="text-[11px] font-mono text-green-400 bg-green-500/10 rounded p-2">
              {t("delivery.encryptionWarning")}
            </div>
          )}

          <div>
            <label className="text-xs font-mono text-muted-foreground">
              {t("delivery.carrier")}
            </label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIPPING_CARRIERS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {t(c.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-mono text-muted-foreground">
              {t("delivery.trackingCode")}
            </label>
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="LX123456789NL"
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-mono text-muted-foreground">
                {t("delivery.countryFrom")}
              </label>
              <Select value={countryFrom} onValueChange={setCountryFrom}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-mono text-muted-foreground">
                {t("delivery.countryTo")}
              </label>
              <Select value={countryTo} onValueChange={setCountryTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-muted-foreground">
              {t("delivery.stealthMethod")}
            </label>
            <Select value={stealth} onValueChange={setStealth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STEALTH_METHODS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {t(m.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-muted-foreground">
                {t("delivery.coverIdentity")}
              </label>
              <button
                type="button"
                onClick={generateCover}
                className="text-[10px] font-mono text-primary flex items-center gap-1 hover:underline"
              >
                <Shuffle className="w-3 h-3" /> {t("delivery.generateCover")}
              </button>
            </div>
            <Textarea
              value={coverName}
              onChange={(e) => setCoverName(e.target.value)}
              rows={3}
              className="font-mono text-xs"
              placeholder="John Doe&#10;123 Main St&#10;Amsterdam, 1011&#10;NL"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-muted-foreground">
              {t("delivery.notesOptional")}
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between bg-secondary/30 rounded p-2">
            <span className="text-xs font-mono">{t("delivery.anonymous")}</span>
            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? t("loading") : t("delivery.submit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
