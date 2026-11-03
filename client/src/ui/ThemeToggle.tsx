import { Button } from "@/components/ui/button";
import { useTheme, type ThemeMode } from "../theme";

const NEXT: Record<ThemeMode, ThemeMode> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<ThemeMode, string> = { light: "claro", dark: "oscuro", system: "del sistema" };
const SHORT: Record<ThemeMode, string> = { light: "Claro", dark: "Oscuro", system: "Auto" };

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 px-3 font-mono text-xs tracking-wide uppercase"
      aria-label={`Cambiar tema (actual: ${LABEL[mode]})`}
      title={`Tema ${LABEL[mode]}`}
      onClick={() => setMode(NEXT[mode])}
    >
      {SHORT[mode]}
    </Button>
  );
}
