import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemeMode } from "../theme";

const NEXT: Record<ThemeMode, ThemeMode> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<ThemeMode, string> = { light: "claro", dark: "oscuro", system: "del sistema" };

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <Button
      type="button"
      variant="ghost"
      className="size-11"
      aria-label={`Cambiar tema (actual: ${LABEL[mode]})`}
      title={`Tema ${LABEL[mode]}`}
      onClick={() => setMode(NEXT[mode])}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
