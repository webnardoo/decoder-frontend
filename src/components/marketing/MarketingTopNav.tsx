/*src/components/marketing/MarketingTopNav.tsx*/
"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type ThemeMode = "light" | "dark";
type TopNavVariant = "default" | "planos";
type NavMode = "marketing" | "app" | "minimal";

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
  kind?: string | null;
};

type Props = {
  logoSrc?: string;
  onPaidPlansClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  variant?: TopNavVariant;

  /**
   * modos:
   * - marketing: Assinar + Entrar
   * - app: Comprar crédito + Conta
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
  buyCreditsHref?: string;
  buyCreditsLabel?: string;

  // ✅ flags de visibilidade (para você controlar por layout)
  showBuyCredits?: boolean;
  showAccount?: boolean;

  // ✅ destaque/sonar do CTA (quando saldo baixo)
  buyCreditsPulse?: boolean;

  // ✅ notificações
  showNotifications?: boolean;
  notificationsHref?: string;
  notificationsUnreadCount?: number;
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

function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean
) {
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

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(!!m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}

function timeAgo(iso?: string | null) {
  try {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (!Number.isFinite(diff) || diff < 0) return "";
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const days = Math.floor(h / 24);
    return `${days}d`;
  } catch {
    return "";
  }
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
  buyCreditsHref = "/app/billing/credits",
  buyCreditsLabel = "Comprar crédito",

  // ✅ defaults
  showBuyCredits = true,
  showAccount = true,

  // ✅ pulse
  buyCreditsPulse = false,

  // ✅ notifications
  showNotifications = true,
  notificationsHref = "/app/notifications",
  notificationsUnreadCount = 0,
}: Props) {
  const router = useRouter();
  const pathnameRaw = usePathname() || "/";
  const pathname = stripQuery(pathnameRaw);
  const inferredMode: NavMode = mode ? mode : inferModeFromPath(pathname);

  const [theme, setTheme] = useState<ThemeMode>("light");
  const [menuOpen, setMenuOpen] = useState(false);

  // ✅ notifications UI state
  const isDesktop = useMediaQuery("(min-width: 820px)");
  const [notifOpenDesktop, setNotifOpenDesktop] = useState(false);
  const [notifOpenMobile, setNotifOpenMobile] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifItems, setNotifItems] = useState<NotificationItem[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(menuRef, () => setMenuOpen(false), menuOpen);

  const notifRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    notifRef,
    () => {
      if (notifOpenDesktop) setNotifOpenDesktop(false);
    },
    notifOpenDesktop
  );

  useEffect(() => {
    const t = readTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  // ✅ se trocar breakpoint enquanto aberto, fecha o outro
  useEffect(() => {
    if (isDesktop) {
      setNotifOpenMobile(false);
    } else {
      setNotifOpenDesktop(false);
    }
  }, [isDesktop]);

  const themeLabel = useMemo(() => (theme === "light" ? "Light" : "Dark"), [theme]);

  function onSetTheme(t: ThemeMode) {
    setTheme(t);
    applyTheme(t);
  }

  const entrarHref = secondaryCtaHref ?? loginHref;
  const headerClass = variant === "planos" ? "hTopNav hTopNav--planos" : "hTopNav";

  const showBurger = inferredMode !== "minimal";
  const showDesktopActions = inferredMode !== "minimal";

  // ✅ regra: na página pública /planos não faz sentido ter CTA "Assinar" duplicado no TopNav
  const hideMarketingPrimaryCta =
    inferredMode === "marketing" && (variant === "planos" || pathname === "/planos");

  const unread = Number.isFinite(Number(notificationsUnreadCount))
    ? Math.max(0, Math.floor(Number(notificationsUnreadCount)))
    : 0;

  async function loadNotifications(limit: number) {
    setNotifLoading(true);
    setNotifError(null);

    try {
      const qs = `?limit=${encodeURIComponent(String(limit))}`;
      const res = await fetch(`/api/notifications${qs}`, { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";

      if (!res.ok) {
        let msg = `Falha ao carregar notificações (${res.status}).`;
        if (ct.includes("application/json")) {
          const j = await res.json().catch(() => null);
          if (j?.message) msg = String(j.message);
        }
        setNotifError(msg);
        setNotifItems([]);
        return;
      }

      if (!ct.includes("application/json")) {
        // evita cair naquele HTML/404
        setNotifError("Resposta inválida do servidor (não-JSON).");
        setNotifItems([]);
        return;
      }

      const data = (await res.json().catch(() => null)) as any;
      const list: NotificationItem[] =
        Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

      setNotifItems(list);
    } catch {
      setNotifError("Falha ao carregar notificações.");
      setNotifItems([]);
    } finally {
      setNotifLoading(false);
    }
  }

  function onClickBell() {
    if (isDesktop) {
      const next = !notifOpenDesktop;
      setNotifOpenDesktop(next);
      if (next) loadNotifications(5);
      return;
    }

    // 📱 mobile: overlay full-screen com slide da direita
    const next = !notifOpenMobile;
    setNotifOpenMobile(next);
    if (next) loadNotifications(50); // “todas” (scroll), sem paginação por enquanto
  }

  // Itens do menu mobile
  const menuItems = useMemo(() => {
    if (inferredMode === "app") {
      const items: { label: string; href: string }[] = [];
      if (showNotifications) items.push({ label: "Notificações", href: notificationsHref });
      if (showBuyCredits) items.push({ label: buyCreditsLabel, href: buyCreditsHref });
      if (showAccount) items.push({ label: accountLabel, href: accountHref });
      return items;
    }

    if (inferredMode === "marketing") {
      const items: any[] = [];
      if (!hideMarketingPrimaryCta) {
        items.push({ label: primaryCtaLabel, href: primaryCtaHref, onClick: onPaidPlansClick });
      }
      items.push({ label: secondaryCtaLabel, href: entrarHref });
      return items;
    }

    return [];
  }, [
    inferredMode,
    showNotifications,
    notificationsHref,
    showBuyCredits,
    showAccount,
    buyCreditsLabel,
    buyCreditsHref,
    accountLabel,
    accountHref,
    primaryCtaLabel,
    primaryCtaHref,
    secondaryCtaLabel,
    entrarHref,
    onPaidPlansClick,
    hideMarketingPrimaryCta,
  ]);

  const buyBtnClass = [
    "hTopNav__btn",
    "hTopNav__btn--ghost",
    buyCreditsPulse ? "hTopNav__btn--pulse" : "",
  ]
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
            {/* Toggle tema (Stripe/Linear: segmented, sutil) */}
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

            {/* Desktop actions (>= 820px) */}
            {showDesktopActions ? (
              <div className="hTopNav__actions">
                {inferredMode === "app" ? (
                  <>
                    {showNotifications ? (
                      <div className="hTopNav__notifWrap" ref={notifRef}>
                        <button
                          type="button"
                          className="hTopNav__iconBtn"
                          aria-label="Notificações"
                          title="Notificações"
                          onClick={onClickBell}
                        >
                          <span className="hTopNav__bell" aria-hidden="true">
                            🔔
                          </span>
                          {unread > 0 ? (
                            <span className="hTopNav__badge" aria-label={`${unread} não lidas`}>
                              {unread > 99 ? "99+" : unread}
                            </span>
                          ) : null}
                        </button>

                        {/* 🖥 dropdown desktop */}
                        {notifOpenDesktop ? (
                          <div className="hNotifDrop" role="dialog" aria-label="Notificações">
                            <div className="hNotifDrop__head">
                              <div className="hNotifDrop__title">Notificações</div>
                              <Link className="hNotifDrop__allBtn" href={notificationsHref}>
                                Ver todas
                              </Link>
                            </div>

                            {notifLoading ? (
                              <div className="hNotifDrop__state">Carregando…</div>
                            ) : notifError ? (
                              <div className="hNotifDrop__state hNotifDrop__state--err">
                                {notifError}
                              </div>
                            ) : notifItems.length === 0 ? (
                              <div className="hNotifDrop__state">Sem notificações.</div>
                            ) : (
                              <div className="hNotifDrop__list">
                                {notifItems.slice(0, 5).map((n) => (
                                  <div key={n.id} className="hNotifDrop__item">
                                    <div className="hNotifDrop__itemTop">
                                      <div className="hNotifDrop__itemTitle">
                                        {n.title || "Notificação"}
                                      </div>
                                      <div className="hNotifDrop__itemTime">
                                        {timeAgo(n.createdAt)}
                                      </div>
                                    </div>
                                    {n.message ? (
                                      <div className="hNotifDrop__itemMsg">{n.message}</div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {showBuyCredits ? (
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
                ) : inferredMode === "marketing" ? (
                  <>
                    {!hideMarketingPrimaryCta ? (
                      <a
                        className="hTopNav__btn hTopNav__btn--primary"
                        href={primaryCtaHref}
                        onClick={onPaidPlansClick}
                      >
                        {primaryCtaLabel}
                      </a>
                    ) : null}

                    <Link className="hTopNav__btn hTopNav__btn--ghost" href={entrarHref}>
                      {secondaryCtaLabel}
                    </Link>
                  </>
                ) : null}
              </div>
            ) : null}

            {/* Mobile: burger (<= 819px) */}
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
                          {inferredMode === "app" &&
                          showNotifications &&
                          it.href === notificationsHref &&
                          unread > 0 ? (
                            <span className="hTopNav__menuBadge">{unread > 99 ? "99+" : unread}</span>
                          ) : null}
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

      {/* 📱 overlay mobile: camada por cima (slide da direita) */}
      {inferredMode === "app" && showNotifications && notifOpenMobile ? (
        <div className="hNotifLayer" role="dialog" aria-label="Notificações (mobile)">
          <div className="hNotifLayer__sheet">
            <div className="hNotifLayer__top">
              <button
                type="button"
                className="hNotifLayer__back"
                onClick={() => setNotifOpenMobile(false)}
                aria-label="Voltar"
                title="Voltar"
              >
                ‹
              </button>
              <div className="hNotifLayer__title">Notificações</div>
              <button
                type="button"
                className="hNotifLayer__close"
                onClick={() => setNotifOpenMobile(false)}
                aria-label="Fechar"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="hNotifLayer__body">
              {notifLoading ? (
                <div className="hNotifLayer__state">Carregando…</div>
              ) : notifError ? (
                <div className="hNotifLayer__state hNotifLayer__state--err">{notifError}</div>
              ) : notifItems.length === 0 ? (
                <div className="hNotifLayer__state">Sem notificações.</div>
              ) : (
                <div className="hNotifLayer__list">
                  {notifItems.map((n) => (
                    <div key={n.id} className="hNotifLayer__item">
                      <div className="hNotifLayer__itemTop">
                        <div className="hNotifLayer__itemTitle">{n.title || "Notificação"}</div>
                        <div className="hNotifLayer__itemTime">{timeAgo(n.createdAt)}</div>
                      </div>
                      {n.message ? <div className="hNotifLayer__itemMsg">{n.message}</div> : null}
                    </div>
                  ))}
                </div>
              )}

              {/* “Ver todas” no mobile é opcional, mas mantém como fallback */}
              <div className="hNotifLayer__footer">
                <button
                  type="button"
                  className="hNotifLayer__all"
                  onClick={() => {
                    setNotifOpenMobile(false);
                    router.push(notificationsHref);
                  }}
                >
                  Ver todas
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="hNotifLayer__backdrop"
            aria-label="Fechar"
            onClick={() => setNotifOpenMobile(false)}
          />
        </div>
      ) : null}

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
          transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease,
            border-color 140ms ease;
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

        /* ✅ Ícone de notificação + badge */
        .hTopNav__notifWrap {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .hTopNav__iconBtn {
          position: relative;
          height: 36px;
          width: 40px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(2, 6, 23, 0.12);
          background: rgba(255, 255, 255, 0.62);
          text-decoration: none;
          transition: transform 140ms ease, background 140ms ease, border-color 140ms ease;
          cursor: pointer;
        }
        .hTopNav__iconBtn:hover {
          border-color: rgba(108, 99, 255, 0.55);
          background: rgba(108, 99, 255, 0.06);
          transform: translateY(-1px);
        }
        html[data-theme="dark"] .hTopNav__iconBtn {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
        }
        html[data-theme="dark"] .hTopNav__iconBtn:hover {
          border-color: rgba(108, 99, 255, 0.5);
          background: rgba(255, 255, 255, 0.09);
        }

        .hTopNav__bell {
          font-size: 16px;
          line-height: 1;
          color: rgba(2, 6, 23, 0.86);
        }
        html[data-theme="dark"] .hTopNav__bell {
          color: rgba(255, 255, 255, 0.92);
        }

        .hTopNav__badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.01em;
          color: rgba(255, 255, 255, 0.98);
          background: rgba(108, 99, 255, 0.92);
          box-shadow: 0 10px 26px rgba(108, 99, 255, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        html[data-theme="dark"] .hTopNav__badge {
          border: 1px solid rgba(255, 255, 255, 0.22);
        }

        /* 🖥 Dropdown desktop */
        .hNotifDrop {
          position: absolute;
          right: 0;
          top: calc(100% + 10px);
          width: 360px;
          max-width: 82vw;
          border-radius: 18px;
          border: 1px solid rgba(2, 6, 23, 0.08);
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 28px 72px rgba(2, 6, 23, 0.16);
          backdrop-filter: blur(16px);
          overflow: hidden;
          z-index: 80;
        }
        html[data-theme="dark"] .hNotifDrop {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(18, 18, 22, 0.92);
          box-shadow: 0 28px 72px rgba(0, 0, 0, 0.62);
        }

        .hNotifDrop__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 14px 10px 14px;
          border-bottom: 1px solid rgba(2, 6, 23, 0.06);
        }
        html[data-theme="dark"] .hNotifDrop__head {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hNotifDrop__title {
          font-size: 14px;
          font-weight: 800;
          color: rgba(2, 6, 23, 0.9);
        }
        html[data-theme="dark"] .hNotifDrop__title {
          color: rgba(255, 255, 255, 0.92);
        }

        .hNotifDrop__allBtn {
          height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(108, 99, 255, 0.35);
          background: rgba(108, 99, 255, 0.08);
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          color: rgba(2, 6, 23, 0.86);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        html[data-theme="dark"] .hNotifDrop__allBtn {
          color: rgba(255, 255, 255, 0.92);
          border-color: rgba(108, 99, 255, 0.28);
          background: rgba(255, 255, 255, 0.08);
        }

        .hNotifDrop__state {
          padding: 14px;
          font-size: 13px;
          font-weight: 700;
          color: rgba(2, 6, 23, 0.68);
        }
        .hNotifDrop__state--err {
          color: rgba(220, 38, 38, 0.95);
        }
        html[data-theme="dark"] .hNotifDrop__state {
          color: rgba(255, 255, 255, 0.72);
        }
        html[data-theme="dark"] .hNotifDrop__state--err {
          color: rgba(248, 113, 113, 0.95);
        }

        .hNotifDrop__list {
          padding: 10px 12px 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hNotifDrop__item {
          border-radius: 14px;
          border: 1px solid rgba(2, 6, 23, 0.08);
          background: rgba(255, 255, 255, 0.7);
          padding: 10px 12px;
        }
        html[data-theme="dark"] .hNotifDrop__item {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }

        .hNotifDrop__itemTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 4px;
        }

        .hNotifDrop__itemTitle {
          font-size: 13px;
          font-weight: 900;
          color: rgba(2, 6, 23, 0.9);
        }
        html[data-theme="dark"] .hNotifDrop__itemTitle {
          color: rgba(255, 255, 255, 0.92);
        }

        .hNotifDrop__itemTime {
          font-size: 12px;
          font-weight: 800;
          color: rgba(2, 6, 23, 0.55);
        }
        html[data-theme="dark"] .hNotifDrop__itemTime {
          color: rgba(255, 255, 255, 0.58);
        }

        .hNotifDrop__itemMsg {
          font-size: 13px;
          font-weight: 700;
          color: rgba(2, 6, 23, 0.72);
          line-height: 1.25;
        }
        html[data-theme="dark"] .hNotifDrop__itemMsg {
          color: rgba(255, 255, 255, 0.74);
        }

        /* Mobile menu */
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
          justify-content: space-between;
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

        .hTopNav__menuBadge {
          min-width: 18px;
          height: 18px;
          padding: 0 6px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.98);
          background: rgba(108, 99, 255, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }
        html[data-theme="dark"] .hTopNav__menuBadge {
          border: 1px solid rgba(255, 255, 255, 0.22);
        }

        /* 📱 Layer mobile (slide da direita) */
        .hNotifLayer {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: block;
        }

        .hNotifLayer__backdrop {
          position: absolute;
          inset: 0;
          background: rgba(2, 6, 23, 0.28);
          border: 0;
          padding: 0;
          margin: 0;
          cursor: pointer;
        }
        html[data-theme="dark"] .hNotifLayer__backdrop {
          background: rgba(0, 0, 0, 0.5);
        }

        .hNotifLayer__sheet {
          position: absolute;
          inset: 0;
          background: rgba(255, 255, 255, 0.98);
          transform: translateX(100%);
          animation: hitchSlideInRight 220ms ease-out forwards;
          box-shadow: -18px 0 64px rgba(2, 6, 23, 0.18);
        }
        html[data-theme="dark"] .hNotifLayer__sheet {
          background: rgba(18, 18, 22, 0.98);
          box-shadow: -18px 0 72px rgba(0, 0, 0, 0.62);
        }

        @keyframes hitchSlideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0%);
          }
        }

        .hNotifLayer__top {
          height: 56px;
          display: grid;
          grid-template-columns: 44px 1fr 44px;
          align-items: center;
          padding: 0 10px;
          border-bottom: 1px solid rgba(2, 6, 23, 0.06);
        }
        html[data-theme="dark"] .hNotifLayer__top {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hNotifLayer__back,
        .hNotifLayer__close {
          height: 40px;
          width: 40px;
          border-radius: 999px;
          border: 1px solid rgba(2, 6, 23, 0.12);
          background: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 18px;
          font-weight: 900;
          color: rgba(2, 6, 23, 0.82);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        html[data-theme="dark"] .hNotifLayer__back,
        html[data-theme="dark"] .hNotifLayer__close {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
        }

        .hNotifLayer__title {
          font-size: 15px;
          font-weight: 900;
          color: rgba(2, 6, 23, 0.9);
          text-align: center;
        }
        html[data-theme="dark"] .hNotifLayer__title {
          color: rgba(255, 255, 255, 0.92);
        }

        .hNotifLayer__body {
          height: calc(100% - 56px);
          display: flex;
          flex-direction: column;
        }

        .hNotifLayer__state {
          padding: 16px;
          font-size: 14px;
          font-weight: 800;
          color: rgba(2, 6, 23, 0.68);
        }
        .hNotifLayer__state--err {
          color: rgba(220, 38, 38, 0.95);
        }
        html[data-theme="dark"] .hNotifLayer__state {
          color: rgba(255, 255, 255, 0.72);
        }
        html[data-theme="dark"] .hNotifLayer__state--err {
          color: rgba(248, 113, 113, 0.95);
        }

        .hNotifLayer__list {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          flex: 1;
        }

        .hNotifLayer__item {
          border-radius: 16px;
          border: 1px solid rgba(2, 6, 23, 0.08);
          background: rgba(255, 255, 255, 0.7);
          padding: 12px 12px;
        }
        html[data-theme="dark"] .hNotifLayer__item {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }

        .hNotifLayer__itemTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }

        .hNotifLayer__itemTitle {
          font-size: 14px;
          font-weight: 900;
          color: rgba(2, 6, 23, 0.9);
        }
        html[data-theme="dark"] .hNotifLayer__itemTitle {
          color: rgba(255, 255, 255, 0.92);
        }

        .hNotifLayer__itemTime {
          font-size: 12px;
          font-weight: 900;
          color: rgba(2, 6, 23, 0.55);
        }
        html[data-theme="dark"] .hNotifLayer__itemTime {
          color: rgba(255, 255, 255, 0.58);
        }

        .hNotifLayer__itemMsg {
          font-size: 13px;
          font-weight: 750;
          color: rgba(2, 6, 23, 0.72);
          line-height: 1.28;
        }
        html[data-theme="dark"] .hNotifLayer__itemMsg {
          color: rgba(255, 255, 255, 0.74);
        }

        .hNotifLayer__footer {
          padding: 12px 14px 16px 14px;
          border-top: 1px solid rgba(2, 6, 23, 0.06);
        }
        html[data-theme="dark"] .hNotifLayer__footer {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hNotifLayer__all {
          width: 100%;
          height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(108, 99, 255, 0.35);
          background: rgba(108, 99, 255, 0.08);
          font-size: 14px;
          font-weight: 900;
          color: rgba(2, 6, 23, 0.88);
          cursor: pointer;
        }
        html[data-theme="dark"] .hNotifLayer__all {
          color: rgba(255, 255, 255, 0.92);
          border-color: rgba(108, 99, 255, 0.28);
          background: rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </>
  );
}