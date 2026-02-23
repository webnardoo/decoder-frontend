// src/components/marketing/MarketingTopNav.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";
type TopNavVariant = "default" | "planos";

type Props = {
  logoSrc?: string;
  onPaidPlansClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;

  /** controla o visual do header via CSS modifier */
  variant?: TopNavVariant;

  loginHref?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
};

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

export default function MarketingTopNav({
  logoSrc = "/logo-hitchai.png",
  onPaidPlansClick,
  variant = "default",
  loginHref = "/app/login",
  primaryCtaLabel = "Assinar",
  primaryCtaHref = "/planos",
  secondaryCtaLabel = "Entrar",
  secondaryCtaHref,
}: Props) {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const themeLabel = useMemo(() => (theme === "light" ? "Light" : "Dark"), [theme]);

  function onSetTheme(t: ThemeMode) {
    setTheme(t);
    applyTheme(t);
  }

  const entrarHref = secondaryCtaHref ?? loginHref;

  const headerClass =
    variant === "planos" ? "topHeader topHeader--planos" : "topHeader";

  return (
    <header className={headerClass}>
      <div className="container">
        <div className="topHeaderInner">
          <Link className="brand" href="/" aria-label="Hitch.ai">
            <Image
              src={logoSrc}
              alt="Hitch.ai"
              width={34}
              height={34}
              priority
              style={{ display: "block" }}
            />
            <span>Hitch.ai</span>
          </Link>

          <nav className="navRight" aria-label="Navegação principal">
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

            <a
              className="navLink navPill navPillEmph"
              href={primaryCtaHref}
              onClick={onPaidPlansClick}
            >
              {primaryCtaLabel}
            </a>

            <Link className="navLink navPill navPillEmph" href={entrarHref}>
              {secondaryCtaLabel}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}