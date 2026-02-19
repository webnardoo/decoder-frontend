"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";

function readThemeFromDom(): ThemeMode {
  const v = document?.documentElement?.getAttribute("data-theme");
  return v === "dark" ? "dark" : "light";
}

function applyThemeToDom(next: ThemeMode) {
  document.documentElement.setAttribute("data-theme", next);
  document.documentElement.style.colorScheme = next === "dark" ? "dark" : "light";
  try {
    localStorage.setItem("hitch_theme", next);
  } catch {}
}

export function TopNav() {
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? "";

  // ✅ TopNav global SOMENTE para o APP (evita duplicar nos sites de marketing)
  const isApp = pathname === "/app" || pathname.startsWith("/app/");
  if (!isApp) return null;

  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    try {
      const current = readThemeFromDom();
      setTheme(current);
      document.documentElement.style.colorScheme =
        current === "dark" ? "dark" : "light";
    } catch {
      setTheme("light");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  const toggleLabel = useMemo(() => {
    return theme === "dark" ? "Modo claro" : "Modo escuro";
  }, [theme]);

  function onToggleTheme() {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyThemeToDom(next);
  }

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{
        background: "var(--h-topnav-bg, rgba(10,10,14,0.6))",
        borderColor: "var(--h-border, rgba(255,255,255,0.10))",
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/app" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl font-black shadow-sm"
            style={{
              backgroundColor: "var(--h-brand, rgb(31, 14, 55))",
              color: "var(--h-brand-contrast, #fff)",
            }}
          >
            H
          </span>
          <span className="text-sm font-semibold tracking-wide">Hitch.ai</span>
        </Link>

        <button
          type="button"
          className="btn"
          onClick={onToggleTheme}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
