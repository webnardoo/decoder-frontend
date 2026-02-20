/*src/components/top-nav.tsx*/
"use client";

import Link from "next/link";
import Image from "next/image";
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
      document.documentElement.style.colorScheme = current === "dark" ? "dark" : "light";
    } catch {
      setTheme("light");
      document.documentElement.style.colorScheme = "light";
    }
  }, []);

  function onSetTheme(next: ThemeMode) {
    setTheme(next);
    applyThemeToDom(next);
  }

  const themeLabel = useMemo(() => (theme === "light" ? "Light" : "Dark"), [theme]);

  return (
    <header className="appTopHeader">
      <div className="appContainer">
        <div className="appTopHeaderInner">
          {/* ✅ Agora aponta para a raiz do site MKT */}
          <Link className="appBrand" href="/" aria-label="Hitch.ai">
            <Image
              src="/logo-hitchai.png"
              alt="Hitch.ai"
              width={34}
              height={34}
              priority
              style={{ display: "block" }}
            />
            <span>Hitch.ai</span>
          </Link>

          <nav className="appNavRight" aria-label="Navegação do app">
            <div className="themeToggle" role="tablist" aria-label={`Tema atual: ${themeLabel}`}>
              <button
                type="button"
                className={`themePill ${theme === "light" ? "themePillActive" : ""}`}
                onClick={() => onSetTheme("light")}
                role="tab"
                aria-selected={theme === "light"}
              >
                Light
              </button>
              <button
                type="button"
                className={`themePill ${theme === "dark" ? "themePillActive" : ""}`}
                onClick={() => onSetTheme("dark")}
                role="tab"
                aria-selected={theme === "dark"}
              >
                Dark
              </button>
            </div>

            <Link className="appNavPill appNavPillEmph" href="/app/conta">
              Conta
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
