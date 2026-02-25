// src/components/marketing/topnav/theme/useTheme.ts
"use client";

import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark";

function readTheme(): ThemeMode {
  try {
    if (typeof window === "undefined") return "light";

    const keys = ["hitch_theme", "hitch-theme", "theme"];
    for (const k of keys) {
      const v = window.localStorage.getItem(k);
      if (v === "light" || v === "dark") return v;
    }

    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") return attr;

    return "light";
  } catch {
    return "light";
  }
}

function applyTheme(t: ThemeMode) {
  try {
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.style.colorScheme = t === "dark" ? "dark" : "light";
    window.localStorage.setItem("hitch_theme", t);
    window.localStorage.setItem("hitch-theme", t);
    window.localStorage.setItem("theme", t);
  } catch {}
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  function setThemeMode(t: ThemeMode) {
    setTheme(t);
    applyTheme(t);
  }

  const themeLabel = useMemo(() => (theme === "light" ? "Light" : "Dark"), [theme]);

  return {
    theme,
    themeLabel,
    setThemeMode,
  };
}