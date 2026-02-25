// src/components/marketing/topnav/MarketingTopNav.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { inferModeFromPath, NavMode } from "./navigation/useNavMode";
import { useTheme } from "./theme/useTheme";
import { useNotifications } from "./notifications/useNotifications";

import NotificationsDesktop from "./notifications/NotificationsDesktop";
import NotificationsMobile from "./notifications/NotificationsMobile";
import NotificationsPanel from "./notifications/NotificationsPanel";

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
  const router = useRouter();
  const pathname = usePathname() || "/";
  const inferredMode: NavMode = mode ?? inferModeFromPath(pathname);

  const { theme, setThemeMode } = useTheme();

  const { items, unread, loading, error, load, markAllAsRead, markOneAndNavigate, markReadOnly } =
    useNotifications(inferredMode === "app" && showNotifications);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  async function openDropdownDesktop() {
    await load(5);
    setDropdownOpen(true);
  }

  async function openMobileLayer() {
    await load(50);
    setMobileOpen(true);
    setDropdownOpen(false);
  }

  async function openPanelAll() {
    await load(50);
    setPanelOpen(true);
    setDropdownOpen(false);
    setMobileOpen(false);
  }

  async function handleClickItem(n: any) {
    await markOneAndNavigate(n, router);
    setDropdownOpen(false);
    setMobileOpen(false);
    setPanelOpen(false);
  }

  function closeDropdown() {
    setDropdownOpen(false);
  }

  return (
    <>
      <header className="hTopNav" data-topnav="NEW_TOPNAV_MODULE">
        <div className="hTopNav__inner">
          <Link href="/" className="hTopNav__brand" aria-label="Hitch.ai">
            <Image src={logoSrc} alt="Hitch.ai" width={32} height={32} />
            <span>Hitch.ai</span>
          </Link>

          <div className="hTopNav__right">
            {/* Theme Toggle */}
            <div className="hTopNav__theme" role="tablist" aria-label={`Tema atual: ${theme}`}>
              <button
                type="button"
                onClick={() => setThemeMode("light")}
                aria-selected={theme === "light"}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setThemeMode("dark")}
                aria-selected={theme === "dark"}
              >
                Dark
              </button>
            </div>

            {/* APP MODE */}
            {inferredMode === "app" ? (
              <>
                {showAccount ? (
                  <Link className="hTopNav__cta" href={accountHref}>
                    {accountLabel}
                  </Link>
                ) : null}

                {showNotifications ? (
                  <div className="hTopNav__notif">
                    <button
                      type="button"
                      aria-label="Notificações"
                      onClick={async () => {
                        if (typeof window !== "undefined" && window.innerWidth < 820) {
                          await openMobileLayer();
                        } else {
                          if (dropdownOpen) {
                            closeDropdown();
                          } else {
                            await openDropdownDesktop();
                          }
                        }
                      }}
                    >
                      🔔
                      {unread > 0 ? <span className="badge">{unread}</span> : null}
                    </button>

                    {dropdownOpen ? (
                      <NotificationsDesktop
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
                      />
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}

            {/* MARKETING MODE */}
            {inferredMode === "marketing" ? (
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

      {/* Mobile Layer */}
      {mobileOpen ? (
        <NotificationsMobile
          items={items}
          unread={unread}
          loading={loading}
          error={error}
          onClose={() => setMobileOpen(false)}
          onClickItem={handleClickItem}
          onMarkAll={markAllAsRead}
        />
      ) : null}

      {/* Full Panel */}
      {panelOpen ? (
        <NotificationsPanel
          items={items}
          unread={unread}
          loading={loading}
          error={error}
          onClose={() => setPanelOpen(false)}
          onClickItem={handleClickItem}
          onMarkAll={markAllAsRead}
        />
      ) : null}
    </>
  );
}