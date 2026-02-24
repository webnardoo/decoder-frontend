// src/app/app/layout.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import "@/app/exp-site-v12/site.css";
import "@/app/exp-site-v12/exp.css";

import MarketingTopNav from "@/components/marketing/MarketingTopNav";
import { AppFooter } from "@/components/app-footer";
import { OnboardingRouteGuard } from "@/components/onboarding/OnboardingRouteGuard";

type OnboardingStatus = {
  creditsBalance?: number;
  journey?: string;
  onboardingStage?: string;
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

  // ✅ condição do CTA "Comprar crédito" (TopNav)
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  useEffect(() => {
    let alive = true;

    async function load() {
      // Em telas públicas/auth: nunca mostrar
      if (onAuth) {
        if (alive) setShowBuyCredits(false);
        return;
      }

      try {
        const res = await fetch("/api/onboarding/status", { cache: "no-store" });
        if (!res.ok) {
          if (alive) setShowBuyCredits(false);
          return;
        }
        const data = (await res.json()) as OnboardingStatus;

        const bal = typeof data?.creditsBalance === "number" ? data.creditsBalance : null;
        const should = typeof bal === "number" && bal < 10;

        if (alive) setShowBuyCredits(should);
      } catch {
        if (alive) setShowBuyCredits(false);
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
        />
      </div>

      <div className="flex flex-col flex-1">
        <main className="app-main w-full flex-1 flex">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-1 flex-col">{children}</div>
        </main>
      </div>

      <AppFooter />
    </div>
  );

  if (onAuth) return chrome;

  return <OnboardingRouteGuard>{chrome}</OnboardingRouteGuard>;
}