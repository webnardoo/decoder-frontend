"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type ThemeMode = "light" | "dark";
type TopNavVariant = "default" | "planos";
type NavMode = "marketing" | "app" | "minimal";

type Props = {
  logoSrc?: string;
  onPaidPlansClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;

  /** controla o visual do header via CSS modifier */
  variant?: TopNavVariant;

  /**
   * ✅ modos:
   * - marketing: Assinar + Entrar
   * - app: Conta
   * - minimal: apenas toggle de tema (auth/signup)
   */
  mode?: NavMode;

  loginHref?: string;

  // marketing
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;

  // app
  accountHref?: string;
  accountLabel?: string;
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

function inferModeFromPath(pathname: string): NavMode {
  // ✅ Auth/signup: minimal
  if (
    pathname === "/app/login" ||
    pathname === "/app/register" ||
    pathname === "/app/forgot-password" ||
    pathname === "/app/reset-password" ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/")
  ) {
    return "minimal";
  }

  // ✅ App
  if (pathname === "/app" || pathname.startsWith("/app/")) return "app";

  // ✅ Marketing
  return "marketing";
}

export default function MarketingTopNav({
  logoSrc = "/logo-hitchai.png",
  onPaidPlansClick,
  variant = "default",
  mode,

  loginHref = "/app/login",

  // marketing defaults
  primaryCtaLabel = "Assinar",
  primaryCtaHref = "/planos",
  secondaryCtaLabel = "Entrar",
  secondaryCtaHref,

  // app defaults
  accountHref = "/app/conta",
  accountLabel = "Conta",
}: Props) {
  const pathname = usePathname() || "/";
  const inferredMode: NavMode = mode ? mode : inferModeFromPath(pathname);

  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const themeLabel = useMemo(
    () => (theme === "light" ? "Light" : "Dark"),
    [theme],
  );

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
            <div
              className="themeToggle"
              role="tablist"
              aria-label={`Tema atual: ${themeLabel}`}
            >
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

            {inferredMode === "minimal" ? null : inferredMode === "app" ? (
              <Link className="navLink navPill navPillEmph" href={accountHref}>
                {accountLabel}
              </Link>
            ) : (
              <>
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
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}