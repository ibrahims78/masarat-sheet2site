import { useLang } from "@/context/LanguageContext";
import { Button } from "@/components/ui/button";

export function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
        className="rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 px-2.5 h-9"
      data-testid="button-language-toggle"
    >
      {lang === "ar" ? "EN" : "عر"}
    </Button>
  );
}
