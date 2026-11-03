import { useCallback, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export const THEME_KEY = "pqr-theme";
const EVENT = "pqr-theme-change";

function isMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function readStored(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return isMode(value) ? value : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(mode: ThemeMode): "light" | "dark" {
  const resolved = mode === "system" ? (systemPrefersDark() ? "dark" : "light") : mode;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
  return resolved;
}

export function useTheme(): {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
} {
  const [mode, setModeState] = useState<ThemeMode>(readStored);
  const [resolved, setResolved] = useState<"light" | "dark">(() => applyTheme(mode));

  useEffect(() => {
    setResolved(applyTheme(mode));
    if (mode !== "system" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  useEffect(() => {
    const onEvent = (event: Event) => {
      const next = (event as CustomEvent<ThemeMode>).detail;
      if (isMode(next)) setModeState(next);
    };
    window.addEventListener(EVENT, onEvent);
    return () => window.removeEventListener(EVENT, onEvent);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    setTimeout(() => root.classList.remove("theme-switching"), 320);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // storage unavailable: the choice lasts for this session only
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  }, []);

  return { mode, resolved, setMode };
}
