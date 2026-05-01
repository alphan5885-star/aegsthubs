import { Truck, MapPin, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type DeliveryMethod = "cargo" | "dead_drop" | "mailbox";

interface Props {
  value: DeliveryMethod;
  onChange: (v: DeliveryMethod) => void;
  productType: string;
}

export default function DeliveryMethodSelector({ value, onChange, productType }: Props) {
  const { t } = useI18n();
  if (productType === "digital") return null;

  const methods = [
    { id: "cargo" as const, label: t("delivery.cargo"), desc: t("carrier.stealthMail"), icon: Truck },
    { id: "dead_drop" as const, label: t("delivery.deadDrop"), desc: t("orders.deadDropInfo"), icon: MapPin },
    { id: "mailbox" as const, label: t("delivery.mailbox"), desc: t("carrier.poBox"), icon: Mail },
  ];

  return (
    <div className="space-y-2">
      <label className="text-xs font-mono text-muted-foreground">{t("product.deliveryMethod")}</label>
      <div className="grid grid-cols-3 gap-2">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-all ${
              value === m.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-secondary text-muted-foreground hover:border-primary/30"
            }`}
          >
            <m.icon className="w-5 h-5" />
            <span className="text-[11px] font-mono font-bold">{m.label}</span>
            <span className="text-[9px] font-mono opacity-70">{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
