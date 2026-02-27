// src/components/marketing/topnav/MarketingTopNav.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { inferModeFromPath, NavMode } from "./navigation/useNavMode";
import { useTheme } from "./theme/useTheme";
import { useNotifications } from "./notifications/useNotifications";

import NotificationsDesktop from "./notifications/NotificationsDesktop";
import NotificationsMobileLayer from "./notifications/NotificationsMobileLayer";
import NotificationsPanel from "./notifications/NotificationsPanel";
import NotificationsToastTray from "./notifications/NotificationsToastTray";

import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import PixDetailsModal from "@/components/billing/pix/PixDetailsModal";

import "./MarketingTopNav.css";

export type Props = {
  logoSrc?: string;

  onPaidPlansClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;

  mode?: NavMode;

  // marketing
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;

  // app (compat)
  accountHref?: string;
  accountLabel?: string;
  buyCreditsHref?: string;
  buyCreditsLabel?: string;
  showBuyCredits?: boolean;
  buyCreditsPulse?: boolean;
  showAccount?: boolean;

  // notifications
  showNotifications?: boolean;
  notificationsHref?: string;
  notificationsUnreadCount?: number;
};

type ToastItem = {
  id: string;
  title: string;
  message?: string | null;
  severity?: string | null;
  createdAt?: string | null;
};

const TOAST_TTL_MS = 6000;
const TOAST_MAX = 3;

export default function MarketingTopNav({
  logoSrc = "/logo-hitchai.png",
  onPaidPlansClick,
  mode,
  primaryCtaLabel = "Assinar",
  primaryCtaHref = "/planos",
  secondaryCtaLabel = "Entrar",
  secondaryCtaHref = "/app/login",
  accountHref = "/app/account",
  accountLabel = "Conta",
  showAccount = true,
  showNotifications = true,
}: Props) {
  const pathname = usePathname() || "/";
  const inferredMode: NavMode = mode ?? inferModeFromPath(pathname);

  const { theme, setThemeMode } = useTheme();

  const { items, unread, loading, error, load, markAllAsRead, markReadOnly, onToast } =
    useNotifications(inferredMode === "app" && showNotifications);

  const isMobile = useMediaQuery("(max-width: 819px)");

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const bellBtnRef = useRef<HTMLButtonElement | null>(null);

  // ✅ Toast state
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastTimersRef = useRef<Map<string, any>>(new Map());

  // ✅ PIX modal state
  const [pixOpen, setPixOpen] = useState(false);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);

  const openPixModal = useCallback((paymentId: string) => {
    const pid = String(paymentId || "").trim();
    if (!pid) return;

    setPixPaymentId(pid);
    setPixOpen(true);

    // fecha overlays de notificação
    setDropdownOpen(false);
    setMobileOpen(false);
    setPanelOpen(false);
  }, []);

  const closePixModal = useCallback(() => {
    setPixOpen(false);
    setPixPaymentId(null);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));

    const timers = toastTimersRef.current;
    const handle = timers.get(id);
    if (handle) clearTimeout(handle);
    timers.delete(id);
  }, []);

  const scheduleDismiss = useCallback(
    (id: string) => {
      const timers = toastTimersRef.current;

      const existing = timers.get(id);
      if (existing) clearTimeout(existing);

      const handle = setTimeout(() => {
        dismissToast(id);
      }, TOAST_TTL_MS);

      timers.set(id, handle);
    },
    [dismissToast]
  );

  // ✅ assina realtime-toasts do hook
  useEffect(() => {
    if (inferredMode !== "app" || !showNotifications) return;

    const unsubscribe = onToast((t) => {
      const id = String(t?.id || "").trim();
      if (!id) return;

      setToasts((prev) => {
        const next: ToastItem = {
          id,
          title: String(t?.title || "Notificação"),
          message: t?.message ?? null,
          severity: t?.severity ?? "info",
          createdAt: new Date().toISOString(),
        };

        const without = prev.filter((x) => x.id !== id);
        const merged = [next, ...without];
        return merged.slice(0, TOAST_MAX);
      });

      scheduleDismiss(id);
    });

    return () => {
      unsubscribe?.();
    };
  }, [inferredMode, showNotifications, onToast, scheduleDismiss]);

  // cleanup timers
  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((h) => clearTimeout(h));
      toastTimersRef.current.clear();
    };
  }, []);

  // trava scroll do body enquanto qualquer overlay de notif estiver aberto
  useEffect(() => {
    const anyOverlayOpen = dropdownOpen || mobileOpen || panelOpen;
    if (!anyOverlayOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [dropdownOpen, mobileOpen, panelOpen]);

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  const openDropdownDesktop = useCallback(async () => {
    await load(5);
    setDropdownOpen(true);
    setMobileOpen(false);
    setPanelOpen(false);
  }, [load]);

  const openMobileLayer = useCallback(async () => {
    await load(50);
    setMobileOpen(true);
    setDropdownOpen(false);
    setPanelOpen(false);
  }, [load]);

  const openPanelAll = useCallback(async () => {
    await load(50);
    setPanelOpen(true);
    setDropdownOpen(false);
    setMobileOpen(false);
  }, [load]);

  // ✅ clique no item: marca como lida
  // Regras:
  // - Mobile: NÃO fecha a layer.
  // - Desktop dropdown / Panel: fecha após marcar como lida.
  const handleClickItem = useCallback(
    async (n: any) => {
      const id = String(n?.id || "").trim();
      if (id && !n?.readAt) {
        await markReadOnly(id);
      }

      // ✅ Mobile fica aberto; só o sino/backdrop/X fecham.
      if (isMobile) return;

      setDropdownOpen(false);
      setMobileOpen(false);
      setPanelOpen(false);
    },
    [markReadOnly, isMobile]
  );

  const shouldRenderApp = inferredMode === "app";
  const shouldRenderMarketing = inferredMode === "marketing";

  const showToastTray = useMemo(() => {
    return shouldRenderApp && showNotifications && toasts.length > 0;
  }, [shouldRenderApp, showNotifications, toasts.length]);

  return (
    <>
      <header className="hTopNav" data-topnav="NEW_TOPNAV_MODULE">
        <div className="hTopNav__inner">
          <Link href="/" className="hTopNav__brand" aria-label="Hitch.ai">
            <Image src={logoSrc} alt="Hitch.ai" width={32} height={32} />
            <span>Hitch.ai</span>
          </Link>

          <div className="hTopNav__right">
            <div className="hTopNav__theme" role="tablist" aria-label={`Tema atual: ${theme}`}>
              <button type="button" onClick={() => setThemeMode("light")} aria-selected={theme === "light"}>
                Light
              </button>
              <button type="button" onClick={() => setThemeMode("dark")} aria-selected={theme === "dark"}>
                Dark
              </button>
            </div>

            {shouldRenderApp ? (
              <>
                {showAccount ? (
                  <Link className="hTopNav__cta" href={accountHref}>
                    {accountLabel}
                  </Link>
                ) : null}

                {showNotifications ? (
                  <div className="hTopNav__notif">
                    <button
                      ref={bellBtnRef}
                      type="button"
                      aria-label="Notificações"
                      onClick={async () => {
                        if (isMobile) {
                          if (mobileOpen) {
                            setMobileOpen(false);
                            return;
                          }
                          await openMobileLayer();
                          return;
                        }

                        if (dropdownOpen) {
                          closeDropdown();
                        } else {
                          await openDropdownDesktop();
                        }
                      }}
                    >
                      🔔
                      {unread > 0 ? <span className="badge">{unread}</span> : null}
                    </button>

                    {dropdownOpen ? (
                      <NotificationsDesktop
                        anchorEl={bellBtnRef.current}
                        items={items}
                        unread={unread}
                        loading={loading}
                        error={error}
                        onMarkAll={markAllAsRead}
                        onClickItem={handleClickItem}
                        onRequestClose={closeDropdown}
                        onOpenAll={openPanelAll}
                        onHoverItemId={async (id) => {
                          await markReadOnly(id);
                        }}
                        onPixOpen={openPixModal}
                      />
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {shouldRenderMarketing ? (
              <>
                <a href={primaryCtaHref} onClick={onPaidPlansClick}>
                  {primaryCtaLabel}
                </a>
                <Link href={secondaryCtaHref}>{secondaryCtaLabel}</Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {showToastTray ? <NotificationsToastTray items={toasts} onDismiss={dismissToast} /> : null}

      {mobileOpen ? (
        <NotificationsMobileLayer
          items={items}
          unread={unread}
          loading={loading}
          error={error}
          onClose={() => setMobileOpen(false)}
          onClickItem={handleClickItem}
          onMarkAll={markAllAsRead}
          onPixOpen={openPixModal}
        />
      ) : null}

      {panelOpen ? (
        <NotificationsPanel
          items={items}
          unread={unread}
          loading={loading}
          error={error}
          onClose={() => setPanelOpen(false)}
          onClickItem={handleClickItem}
          onMarkAll={markAllAsRead}
          onPixOpen={openPixModal}
        />
      ) : null}

      {/* ✅ Modal PIX global */}
      <PixDetailsModal open={pixOpen} paymentId={pixPaymentId} onClose={closePixModal} />
    </>
  );
}