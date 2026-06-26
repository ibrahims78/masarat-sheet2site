import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={theme === "dark" ? "الوضع النهاري" : "الوضع الليلي"}
      className="rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
      data-testid="button-theme-toggle"
    >
      {theme === "dark"
        ? <Sun  className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        : <Moon className="h-4.5 w-4.5 h-[18px] w-[18px]" />}
    </Button>
  );
}
