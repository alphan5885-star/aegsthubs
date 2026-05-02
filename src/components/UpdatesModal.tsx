import { useState } from "react";
import { X, Sparkles, Rocket, Shield, Zap, Lock, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Update = {
  version: string;
  date: string;
  title: string;
  description: string;
  icon: "sparkles" | "rocket" | "shield" | "zap" | "lock";
  category: "feature" | "security" | "improvement" | "new";
};

const updatesData: Update[] = [
  {
    version: "3.0.0",
    date: "2025-06-01",
    title: "aeigsthub v3.0 - Ultimate Security",
    description: "Complete platform security overhaul with PGP encryption, stealth mode, and Tor integration.",
    icon: "shield",
    category: "security",
  },
  {
    version: "3.0.0",
    date: "2025-06-01",
    title: "Balance-Based Escrow",
    description: "New escrow system that holds payment until buyer confirms delivery.",
    icon: "lock",
    category: "feature",
  },
  {
    version: "3.0.0",
    date: "2025-06-01",
    title: "Vendor Trust Bond",
    description: "Vendor verification through LTC deposit - 0.5 LTC minimum bond required.",
    icon: "shield",
    category: "security",
  },
  {
    version: "2.5.0",
    date: "2025-04-15",
    title: "Automatic Withdrawal",
    description: "Set minimum amount and auto-withdraw to cold wallet (Exodus).",
    icon: "zap",
    category: "improvement",
  },
  {
    version: "2.4.0",
    date: "2025-03-20",
    title: "Live Market Analytics",
    description: "Real-time market statistics, product activity, and vendor performance.",
    icon: "sparkles",
    category: "feature",
  },
  {
    version: "2.3.0",
    date: "2025-02-10",
    title: "PGP Tools Suite",
    description: "Browser-based encryption, decryption, and signature verification.",
    icon: "shield",
    category: "feature",
  },
  {
    version: "2.2.0",
    date: "2025-01-05",
    title: "Anonymous Shipping",
    description: "Dead-drop maps, stealth packaging, and cover identity generator.",
    icon: "rocket",
    category: "feature",
  },
  {
    version: "2.0.0",
    date: "2024-11-01",
    title: "Multi-Currency Wallet",
    description: "LTC and XMR support with automatic deposit sync.",
    icon: "rocket",
    category: "new",
  },
];

const iconMap = {
  sparkles: Sparkles,
  rocket: Rocket,
  shield: Shield,
  zap: Zap,
  lock: Lock,
};

const categoryColors = {
  feature: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  security: "text-green-400 bg-green-400/10 border-green-400/20",
  improvement: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  new: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

export default function UpdatesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, language } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!open) return null;

  const filteredUpdates = selectedCategory
    ? updatesData.filter((u) => u.category === selectedCategory)
    : updatesData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/90 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col neon-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-mono text-lg font-bold text-foreground">
                {t("updates.title")}
              </h2>
              <p className="text-[10px] font-mono text-muted-foreground">
                aeigsthub changelog
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 p-3 border-b border-border overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 text-[10px] font-mono rounded-full border transition-all whitespace-nowrap ${
              !selectedCategory
                ? "bg-primary/20 text-primary border-primary/40"
                : "text-muted-foreground border-white/10 hover:border-white/30"
            }`}
          >
            {t("all")}
          </button>
          {["feature", "security", "improvement", "new"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-[10px] font-mono rounded-full border transition-all whitespace-nowrap capitalize ${
                selectedCategory === cat
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "text-muted-foreground border-white/10 hover:border-white/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Updates List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredUpdates.map((update, index) => {
            const Icon = iconMap[update.icon];
            return (
              <div
                key={index}
                className="p-4 rounded-lg border border-border bg-secondary/10 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
                      categoryColors[update.category as keyof typeof categoryColors]
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-primary">
                        v{update.version}
                      </span>
                      <span className="text-[8px] font-mono text-muted-foreground">
                        {update.date}
                      </span>
                      <span
                        className={`text-[8px] font-mono px-1.5 py-0.5 rounded border capitalize ${
                          categoryColors[update.category as keyof typeof categoryColors]
                        }`}
                      >
                        {update.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground mb-1">
                      {update.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {update.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/10">
          <div className="flex items-center justify-between">
            <a
              href="https://forum.aeigsthub.i2p"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors"
            >
              <span>{t("updates.forum")}</span>
              <ArrowRight className="w-3 h-3" />
            </a>
            <span className="text-[8px] font-mono text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
