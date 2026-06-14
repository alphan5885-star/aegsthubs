import { useState } from "react";
import { Languages, Loader2, RotateCcw, X } from "lucide-react";
import { useTranslate } from "@/lib/useTranslate";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  text: string;
  /** Source language hint (optional). Pass "auto" or omit to auto-detect. */
  sourceLang?: string;
  /** Visual variant — "bubble" for chat messages, "inline" for other content */
  variant?: "bubble" | "inline";
}

const LANG_LABELS: Record<string, string> = {
  tr: "TR",
  en: "EN",
  ru: "RU",
};

export default function TranslateButton({
  text,
  sourceLang = "auto",
  variant = "bubble",
}: Props) {
  const { language } = useI18n();
  const { translatedText, isLoading, error, translate, reset } = useTranslate();
  const [open, setOpen] = useState(false);

  const handleTranslate = async () => {
    if (open) {
      // Toggle off
      setOpen(false);
      reset();
      return;
    }
    const result = await translate(text, sourceLang);
    if (result) setOpen(true);
  };

  const targetLabel = LANG_LABELS[language] ?? language.toUpperCase();

  if (variant === "inline") {
    return (
      <div className="mt-1">
        <button
          onClick={handleTranslate}
          disabled={isLoading}
          className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          title={`${targetLabel} diline çevir`}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Languages className="w-3 h-3" />
          )}
          <span>{open ? "Gizle" : `${targetLabel} çevir`}</span>
        </button>

        <AnimatePresence>
          {open && translatedText && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1 text-xs font-mono text-muted-foreground border-l-2 border-primary/40 pl-2 italic"
            >
              {translatedText}
            </motion.div>
          )}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1 text-[10px] font-mono text-destructive"
            >
              Çeviri hatası
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // "bubble" variant — compact icon button shown below a chat bubble
  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleTranslate}
        disabled={isLoading}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono transition-all disabled:opacity-50 ${
          open
            ? "bg-primary/20 text-primary"
            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        }`}
        title={`${targetLabel} diline çevir`}
      >
        {isLoading ? (
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
        ) : open ? (
          <RotateCcw className="w-2.5 h-2.5" />
        ) : (
          <Languages className="w-2.5 h-2.5" />
        )}
        <span>{open ? "Gizle" : targetLabel}</span>
      </button>

      <AnimatePresence>
        {open && translatedText && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="relative max-w-[85%] px-2.5 py-1.5 rounded text-[11px] font-mono bg-primary/10 border border-primary/20 text-primary/80 italic"
          >
            <button
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="absolute top-1 right-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-2.5 h-2.5" />
            </button>
            <span className="text-[9px] not-italic text-muted-foreground block mb-0.5 uppercase tracking-widest">
              {targetLabel} çeviri
            </span>
            {translatedText}
          </motion.div>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[9px] font-mono text-destructive"
          >
            Çeviri başarısız
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
