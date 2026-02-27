/*src/app/app/layout.tsx*/
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import "@/app/exp-site-v12/site.css";
import "@/app/exp-site-v12/exp.css";

// ✅ CSS global do modal (App Router exige importar em layout/page)
import "@/components/billing/pix/PixDetailsModal.css";

import MarketingTopNav from "@/components/marketing/MarketingTopNav";
import { AppFooter } from "@/components/app-footer";
import { OnboardingRouteGuard } from "@/components/onboarding/OnboardingRouteGuard";

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

  useEffect(() => {
    let alive = true;

    async function load() {
      if (onAuth) {
        if (alive) {
          setShowBuyCredits(false);
          setUnreadCount(0);
        }
        return;
      }

      try {
        const [onbRes, unreadRes] = await Promise.all([
          fetch("/api/onboarding/status", { cache: "no-store" }).catch(() => null),
          fetch("/api/notifications/unread-count", { cache: "no-store" }).catch(() => null),
        ]);

        if (!onbRes || !onbRes.ok) {
          if (alive) setShowBuyCredits(false);
        } else {
          const data = (await onbRes.json()) as OnboardingStatus;
          const bal = typeof data?.creditsBalance === "number" ? data.creditsBalance : null;
          const should = typeof bal === "number" && bal < 10;
          if (alive) setShowBuyCredits(should);
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
            {children}
          </div>
        </main>
      </div>

      <AppFooter />
    </div>
  );

  if (onAuth) return chrome;

  return <OnboardingRouteGuard>{chrome}</OnboardingRouteGuard>;
}