/* src/app/app/layout.tsx */
import type { ReactNode } from "react";
import { headers } from "next/headers";

import "@/app/exp-site-v12/site.css";
import "@/app/exp-site-v12/exp.css";

import MarketingTopNav from "@/components/marketing/MarketingTopNav";
import { AppFooter } from "@/components/app-footer";
import { OnboardingRouteGuard } from "@/components/onboarding/OnboardingRouteGuard";

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

export default async function AppLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const nextUrl = h.get("next-url") || "";
  const pathname = stripQuery(nextUrl);

  const onAuth = isPublicAuthPath(pathname);

  const chrome = (
    <div className="min-h-dvh flex flex-col">
      {/* ✅ site.css é escopado em .mkt */}
      <div className="mkt">
        <MarketingTopNav
          mode={onAuth ? "minimal" : "app"}
          /* app */
          accountHref="/app/conta"
          accountLabel="Conta"
          buyCreditsHref="/app/billing/plan"
          buyCreditsLabel="Comprar Crédito"
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