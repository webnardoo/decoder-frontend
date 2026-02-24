// src/components/marketing/MarketingTopNav.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type ThemeMode = "light" | "dark";
type TopNavVariant = "default" | "planos";
type NavMode = "marketing" | "app" | "minimal";

type Props = {
  logoSrc?: string;
  onPaidPlansClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  variant?: TopNavVariant;

  /**
   * modos:
   * - marketing: Assinar + Entrar
   * - app: SOMENTE Conta (Comprar crédito fica na page/card)
   * - minimal: apenas tema (auth/signup)
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

  // (mantido por compatibilidade, mas não será exibido no modo app)
  buyCreditsHref?: string;
  buyCreditsLabel?: string;

  // flags
  showBuyCredits?: boolean;
  showAccount?: boolean;

  // destaque/sonar (mantido por compatibilidade, mas não será usado no TopNav no modo app)
  buyCreditsPulse?: boolean;
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

function stripQuery(nextUrl: string): string {
  const raw = String(nextUrl || "");
  const q = raw.indexOf("?");
  return q >= 0 ? raw.slice(0, q) : raw;
}

function inferModeFromPath(pathnameRaw: string): NavMode {
  const pathname = stripQuery(pathnameRaw);

  // auth/signup => minimal
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

  // app
  if (pathname === "/app" || pathname.startsWith("/app/")) return "app";

  // marketing
  return "marketing";
}

function useOutsideClick(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el) return;
      const t = e.target as Node | null;
      if (t && el.contains(t)) return;
      onOutside();
    };

    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("touchstart", onDown, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("touchstart", onDown, true);
    };
  }, [ref, onOutside, enabled]);
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

  // compat (não exibido no modo app)
  buyCreditsHref = "/app/billing/credits",
  buyCreditsLabel = "Comprar crédito",

  // defaults
  showBuyCredits = true,
  showAccount = true,

  // compat (não usado no modo app)
  buyCreditsPulse = false,
}: Props) {
  const pathname = usePathname() || "/";
  const inferredMode: NavMode = mode ? mode : inferModeFromPath(pathname);

  const [theme, setTheme] = useState<ThemeMode>("light");
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(menuRef, () => setMenuOpen(false), menuOpen);

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
  const headerClass = variant === "planos" ? "hTopNav hTopNav--planos" : "hTopNav";

  const showBurger = inferredMode !== "minimal";
  const showDesktopActions = inferredMode !== "minimal";

  // ✅ regra definitiva: no modo APP, NÃO renderizar comprar crédito no TopNav
  const effectiveShowBuyCredits = inferredMode === "app" ? false : showBuyCredits;

  // Itens do menu mobile
  const menuItems = useMemo(() => {
    if (inferredMode === "app") {
      const items: { label: string; href: string }[] = [];
      // comprar crédito fica na page/card — nunca aqui
      if (showAccount) items.push({ label: accountLabel, href: accountHref });
      return items;
    }

    if (inferredMode === "marketing") {
      return [
        { label: primaryCtaLabel, href: primaryCtaHref, onClick: onPaidPlansClick },
        { label: secondaryCtaLabel, href: entrarHref },
      ];
    }

    return [];
  }, [
    inferredMode,
    showAccount,
    accountLabel,
    accountHref,
    primaryCtaLabel,
    primaryCtaHref,
    secondaryCtaLabel,
    entrarHref,
    onPaidPlansClick,
  ]);

  const buyBtnClass = ["hTopNav__btn", "hTopNav__btn--ghost", buyCreditsPulse ? "hTopNav__btn--pulse" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={headerClass} role="banner">
        <div className="hTopNav__inner">
          <Link className="hTopNav__brand" href="/" aria-label="Hitch.ai">
            <Image src={logoSrc} alt="Hitch.ai" width={34} height={34} priority />
            <span className="hTopNav__brandText">Hitch.ai</span>
          </Link>

          <div className="hTopNav__right">
            <div className="hTopNav__seg" role="tablist" aria-label={`Tema atual: ${themeLabel}`}>
              <button
                type="button"
                className={`hTopNav__segBtn ${theme === "light" ? "isActive" : ""}`}
                onClick={() => onSetTheme("light")}
                role="tab"
                aria-selected={theme === "light"}
              >
                Light
              </button>
              <button
                type="button"
                className={`hTopNav__segBtn ${theme === "dark" ? "isActive" : ""}`}
                onClick={() => onSetTheme("dark")}
                role="tab"
                aria-selected={theme === "dark"}
              >
                Dark
              </button>
            </div>

            {showDesktopActions ? (
              <div className="hTopNav__actions">
                {inferredMode === "app" ? (
                  <>
                    {/* ✅ comprar crédito removido no modo app */}
                    {showAccount ? (
                      <Link className="hTopNav__btn hTopNav__btn--primary" href={accountHref}>
                        {accountLabel}
                      </Link>
                    ) : null}
                  </>
                ) : inferredMode === "marketing" ? (
                  <>
                    <a className="hTopNav__btn hTopNav__btn--primary" href={primaryCtaHref} onClick={onPaidPlansClick}>
                      {primaryCtaLabel}
                    </a>
                    <Link className="hTopNav__btn hTopNav__btn--ghost" href={entrarHref}>
                      {secondaryCtaLabel}
                    </Link>
                  </>
                ) : (
                  <>
                    {/* fallback (não deve acontecer normalmente) */}
                    {effectiveShowBuyCredits ? (
                      <Link className={buyBtnClass} href={buyCreditsHref}>
                        {buyCreditsLabel}
                      </Link>
                    ) : null}
                    {showAccount ? (
                      <Link className="hTopNav__btn hTopNav__btn--primary" href={accountHref}>
                        {accountLabel}
                      </Link>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            {showBurger ? (
              <div className="hTopNav__menuWrap" ref={menuRef}>
                <button
                  type="button"
                  className="hTopNav__burger"
                  aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <span className="hTopNav__burgerIcon" aria-hidden="true">
                    {menuOpen ? "✕" : "☰"}
                  </span>
                </button>

                {menuOpen ? (
                  <div className="hTopNav__menu" role="menu" aria-label="Menu">
                    {menuItems.map((it: any) => {
                      const key = `${it.label}-${it.href}`;
                      if (it.onClick) {
                        return (
                          <a
                            key={key}
                            href={it.href}
                            onClick={(e) => {
                              setMenuOpen(false);
                              it.onClick?.(e as any);
                            }}
                            className="hTopNav__menuItem"
                            role="menuitem"
                          >
                            {it.label}
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={key}
                          href={it.href}
                          className="hTopNav__menuItem"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          {it.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <style jsx global>{`
        .hTopNav {
          position: sticky;
          top: 0;
          z-index: 50;
          width: 100%;
          border-bottom: 1px solid rgba(2, 6, 23, 0.06);
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(14px);
        }

        html[data-theme="dark"] .hTopNav {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(18, 18, 22, 0.78);
        }

        .hTopNav__inner {
          max-width: 1200px;
          margin: 0 auto;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          gap: 14px;
        }

        @media (max-width: 640px) {
          .hTopNav__inner {
            height: 60px;
            padding: 0 14px;
          }
        }

        .hTopNav__brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
          font-weight: 700;
        }

        .hTopNav__brandText {
          font-size: 18px;
          letter-spacing: -0.02em;
        }

        .hTopNav__right {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .hTopNav__seg {
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(2, 6, 23, 0.12);
          background: rgba(2, 6, 23, 0.03);
          border-radius: 999px;
          padding: 2px;
          gap: 2px;
        }
        html[data-theme="dark"] .hTopNav__seg {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
        }

        .hTopNav__segBtn {
          height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          border: 0;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: rgba(2, 6, 23, 0.7);
          transition: background 140ms ease, color 140ms ease;
        }
        html[data-theme="dark"] .hTopNav__segBtn {
          color: rgba(255, 255, 255, 0.78);
        }

        .hTopNav__segBtn.isActive {
          background: rgba(255, 255, 255, 0.88);
          color: rgba(2, 6, 23, 0.92);
          box-shadow: 0 8px 20px rgba(2, 6, 23, 0.08);
        }
        html[data-theme="dark"] .hTopNav__segBtn.isActive {
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.92);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.45);
        }

        .hTopNav__actions {
          display: none;
          align-items: center;
          gap: 10px;
        }

        @media (min-width: 820px) {
          .hTopNav__actions {
            display: inline-flex;
          }
        }

        .hTopNav__btn {
          position: relative;
          height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.01em;
          transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border-color 140ms ease;
          user-select: none;
          white-space: nowrap;
        }

        .hTopNav__btn--ghost {
          border: 1px solid rgba(108, 99, 255, 0.32);
          background: transparent;
          color: rgba(2, 6, 23, 0.82);
        }
        .hTopNav__btn--ghost:hover {
          border-color: rgba(108, 99, 255, 0.55);
          background: rgba(108, 99, 255, 0.06);
          transform: translateY(-1px);
        }
        html[data-theme="dark"] .hTopNav__btn--ghost {
          color: rgba(255, 255, 255, 0.9);
          border-color: rgba(108, 99, 255, 0.28);
          background: rgba(255, 255, 255, 0.04);
        }
        html[data-theme="dark"] .hTopNav__btn--ghost:hover {
          border-color: rgba(108, 99, 255, 0.5);
          background: rgba(255, 255, 255, 0.08);
        }

        .hTopNav__btn--pulse::after {
          content: "";
          position: absolute;
          inset: -12px;
          border-radius: 999px;
          border: 2px solid rgba(108, 99, 255, 0.34);
          opacity: 0;
          animation: hitchBuyPulseStrong 1.05s ease-out infinite;
          z-index: -1;
          pointer-events: none;
          box-shadow: 0 0 0 0 rgba(108, 99, 255, 0);
        }

        @keyframes hitchBuyPulseStrong {
          0% {
            transform: scale(0.88);
            opacity: 0.06;
            box-shadow: 0 0 0 0 rgba(108, 99, 255, 0);
          }
          35% {
            opacity: 0.95;
            box-shadow: 0 0 48px 10px rgba(108, 99, 255, 0.18);
          }
          100% {
            transform: scale(1.18);
            opacity: 0;
            box-shadow: 0 0 72px 18px rgba(108, 99, 255, 0);
          }
        }

        html[data-theme="dark"] .hTopNav__btn--pulse::after {
          border-color: rgba(108, 99, 255, 0.26);
        }

        .hTopNav__btn--primary {
          border: 1px solid rgba(108, 99, 255, 0.55);
          background: rgba(255, 255, 255, 0.7);
          color: rgba(2, 6, 23, 0.9);
          box-shadow: 0 10px 26px rgba(108, 99, 255, 0.14);
          backdrop-filter: blur(10px);
        }
        .hTopNav__btn--primary:hover {
          border-color: rgba(108, 99, 255, 0.78);
          background: rgba(108, 99, 255, 0.07);
          box-shadow: 0 14px 34px rgba(108, 99, 255, 0.2);
          transform: translateY(-1px);
        }
        html[data-theme="dark"] .hTopNav__btn--primary {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.92);
          border-color: rgba(108, 99, 255, 0.45);
          box-shadow: 0 18px 52px rgba(0, 0, 0, 0.46);
        }
        html[data-theme="dark"] .hTopNav__btn--primary:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(108, 99, 255, 0.75);
          box-shadow: 0 22px 62px rgba(0, 0, 0, 0.55), 0 0 56px rgba(108, 99, 255, 0.16);
        }

        .hTopNav__menuWrap {
          display: inline-flex;
          position: relative;
        }

        .hTopNav__burger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          width: 44px;
          border-radius: 999px;
          border: 1px solid rgba(2, 6, 23, 0.12);
          background: rgba(255, 255, 255, 0.62);
          cursor: pointer;
          transition: background 140ms ease, border-color 140ms ease, transform 140ms ease;
        }
        .hTopNav__burger:hover {
          border-color: rgba(108, 99, 255, 0.55);
          background: rgba(108, 99, 255, 0.06);
          transform: translateY(-1px);
        }
        html[data-theme="dark"] .hTopNav__burger {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
        }
        html[data-theme="dark"] .hTopNav__burger:hover {
          border-color: rgba(108, 99, 255, 0.5);
          background: rgba(255, 255, 255, 0.09);
        }

        .hTopNav__burgerIcon {
          font-size: 16px;
          line-height: 1;
          color: rgba(2, 6, 23, 0.8);
        }
        html[data-theme="dark"] .hTopNav__burgerIcon {
          color: rgba(255, 255, 255, 0.9);
        }

        @media (min-width: 820px) {
          .hTopNav__menuWrap {
            display: none;
          }
        }

        .hTopNav__menu {
          position: absolute;
          right: 0;
          top: calc(100% + 10px);
          min-width: 220px;
          border-radius: 16px;
          border: 1px solid rgba(2, 6, 23, 0.08);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 24px 64px rgba(2, 6, 23, 0.14);
          backdrop-filter: blur(16px);
          padding: 8px;
          z-index: 60;
        }
        html[data-theme="dark"] .hTopNav__menu {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(18, 18, 22, 0.92);
          box-shadow: 0 28px 72px rgba(0, 0, 0, 0.6);
        }

        .hTopNav__menuItem {
          display: flex;
          align-items: center;
          height: 44px;
          padding: 0 12px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          color: rgba(2, 6, 23, 0.86);
          transition: background 140ms ease, color 140ms ease;
        }
        .hTopNav__menuItem:hover {
          background: rgba(108, 99, 255, 0.08);
        }
        html[data-theme="dark"] .hTopNav__menuItem {
          color: rgba(255, 255, 255, 0.92);
        }
        html[data-theme="dark"] .hTopNav__menuItem:hover {
          background: rgba(108, 99, 255, 0.14);
        }
      `}</style>
    </>
  );
}