/*src/app/app/layout.tsx*/
"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import "@/app/exp-site-v12/site.css";
import "@/app/exp-site-v12/exp.css";

// ✅ CSS global do modal (App Router exige importar em layout/page)
import "@/components/billing/pix/PixDetailsModal.css";

import MarketingTopNav from "@/components/marketing/MarketingTopNav";
import { AppFooter } from "@/components/app-footer";
import { OnboardingRouteGuard } from "@/components/onboarding/OnboardingRouteGuard";

import { useNotifications } from "@/components/marketing/topnav/notifications/useNotifications";
import { CreditsBalanceRealtimeProvider } from "@/lib/credits-balance-realtime";

type OnboardingStatus = {
  creditsBalance?: number;
  journey?: string;
  onboardingStage?: string;
};

type UnreadCountResponse = {
  unreadCount?: number;
};

function stripQuery(nextUrl: string): string {
  const raw = String(nextUrl || "");
  const q = raw.indexOf("?");
  return q >= 0 ? raw.slice(0, q) : raw;
}

function isPublicAuthPath(pathnameWithMaybeQuery: string): boolean {
  const pathname = stripQuery(pathnameWithMaybeQuery);

  return (
    pathname === "/app/login" ||
    pathname === "/app/register" ||
    pathname === "/app/forgot-password" ||
    pathname === "/app/reset-password"
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathnameRaw = usePathname() || "";
  const pathname = stripQuery(pathnameRaw);

  const onAuth = isPublicAuthPath(pathname);

  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // ✅ NOVO: saldo resolvido em memória (fonte única pro app todo)
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  // ✅ SSE notifications (liga stream e expõe creditsBalance realtime)
  const { onCreditsBalance } = useNotifications(!onAuth);

  // ✅ evita re-registrar listener em re-renders
  const unsubCreditsRef = useRef<null | (() => void)>(null);

  // ✅ Listener: atualiza saldo e derivados (ex.: CTA)
  useEffect(() => {
    if (onAuth) {
      if (unsubCreditsRef.current) {
        unsubCreditsRef.current();
        unsubCreditsRef.current = null;
      }
      setCreditsBalance(null);
      return;
    }

    if (!onCreditsBalance) return;

    if (unsubCreditsRef.current) {
      unsubCreditsRef.current();
      unsubCreditsRef.current = null;
    }

    unsubCreditsRef.current = onCreditsBalance(({ creditsBalance }) => {
      const bal = typeof creditsBalance === "number" && Number.isFinite(creditsBalance) ? creditsBalance : null;

      setCreditsBalance(bal);

      const should = typeof bal === "number" && bal < 10;
      setShowBuyCredits(should);
    });

    return () => {
      if (unsubCreditsRef.current) {
        unsubCreditsRef.current();
        unsubCreditsRef.current = null;
      }
    };
  }, [onAuth, onCreditsBalance]);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (onAuth) {
        if (alive) {
          setShowBuyCredits(false);
          setUnreadCount(0);
          setCreditsBalance(null);
        }
        return;
      }

      try {
        const [onbRes, unreadRes] = await Promise.all([
          fetch("/api/onboarding/status", { cache: "no-store" }).catch(() => null),
          fetch("/api/notifications/unread-count", { cache: "no-store" }).catch(() => null),
        ]);

        if (!onbRes || !onbRes.ok) {
          if (alive) {
            setShowBuyCredits(false);
            setCreditsBalance(null);
          }
        } else {
          const data = (await onbRes.json()) as OnboardingStatus;
          const bal = typeof data?.creditsBalance === "number" ? data.creditsBalance : null;
          const should = typeof bal === "number" && bal < 10;

          if (alive) {
            setShowBuyCredits(should);
            setCreditsBalance(bal);
          }
        }

        if (!unreadRes || !unreadRes.ok) {
          if (alive) setUnreadCount(0);
        } else {
          const data = (await unreadRes.json()) as UnreadCountResponse;
          const n = typeof data?.unreadCount === "number" ? data.unreadCount : 0;
          if (alive) setUnreadCount(Math.max(0, Math.floor(n)));
        }
      } catch {
        if (alive) {
          setShowBuyCredits(false);
          setUnreadCount(0);
          setCreditsBalance(null);
        }
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [onAuth, pathname]);

  const chrome = (
    <div className="min-h-dvh flex flex-col">
      <div className="mkt">
        <MarketingTopNav
          mode={onAuth ? "minimal" : "app"}
          accountHref="/app/conta"
          accountLabel="Conta"
          buyCreditsHref="/app/billing/plan"
          buyCreditsLabel="Comprar Crédito"
          showBuyCredits={showBuyCredits}
          buyCreditsPulse={showBuyCredits}
          showAccount={true}
          showNotifications={true}
          notificationsHref="/app/notifications"
          notificationsUnreadCount={unreadCount}
        />
      </div>

      <div className="flex flex-col flex-1">
        <main className="app-main w-full flex-1 flex">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-1 flex-col">
            <CreditsBalanceRealtimeProvider value={{ creditsBalance }}>
              {children}
            </CreditsBalanceRealtimeProvider>
          </div>
        </main>
      </div>

      <AppFooter />
    </div>
  );

  if (onAuth) return chrome;

  return <OnboardingRouteGuard>{chrome}</OnboardingRouteGuard>;
}