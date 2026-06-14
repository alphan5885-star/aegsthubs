import { useState, useCallback } from "react";
import { useI18n } from "@/lib/i18n";

// Language code mapping: our app codes → MyMemory API codes
const LANG_MAP: Record<string, string> = {
  tr: "tr",
  en: "en",
  ru: "ru",
};

interface TranslateResult {
  translatedText: string;
  isLoading: boolean;
  error: string | null;
  translate: (text: string, sourceLang?: string) => Promise<string | null>;
  reset: () => void;
}

/**
 * useTranslate — MyMemory free translation API hook
 * Translates any text into the user's currently selected app language.
 * No API key required. Limit: ~5000 words/day per IP.
 */
export function useTranslate(): TranslateResult {
  const { language } = useI18n();
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    async (text: string, sourceLang = "auto"): Promise<string | null> => {
      if (!text.trim()) return null;

      const targetLang = LANG_MAP[language] ?? "en";

      // If source and target are the same, skip the API call
      if (sourceLang !== "auto" && sourceLang === targetLang) {
        setTranslatedText(text);
        return text;
      }

      setIsLoading(true);
      setError(null);

      try {
        const langPair =
          sourceLang === "auto"
            ? `autodetect|${targetLang}`
            : `${sourceLang}|${targetLang}`;

        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (data.responseStatus !== 200) {
          throw new Error(data.responseDetails || "Translation failed");
        }

        const result: string = data.responseData.translatedText;
        setTranslatedText(result);
        return result;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Çeviri başarısız";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [language],
  );

  const reset = useCallback(() => {
    setTranslatedText("");
    setError(null);
  }, []);

  return { translatedText, isLoading, error, translate, reset };
}
