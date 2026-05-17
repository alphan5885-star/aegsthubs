import { useI18n, languageOptions } from "@/lib/i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  const current = languageOptions.find((l) => l.value === language);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 font-mono text-[10px] gap-1 hover:bg-white/5 hover:text-white transition-all text-zinc-500">
          <Globe className="w-3.5 h-3.5" />
          <span>{current?.value.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {languageOptions.map((l) => (
          <DropdownMenuItem key={l.value} onClick={() => setLanguage(l.value)} className="font-mono text-xs cursor-pointer">
            <span className="mr-2">{l.flag}</span> {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
