// src/app/app/layout.tsx
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { OnboardingRouteGuard } from "@/components/onboarding/OnboardingRouteGuard";

function stripQuery(nextUrl: string): string {
  const raw = String(nextUrl || "");
  const q = raw.indexOf("?");
  return q >= 0 ? raw.slice(0, q) : raw;
}

function isPublicAuthPath(pathnameWithMaybeQuery: string): boolean {
  const pathname = stripQuery(pathnameWithMaybeQuery);

  // rotas públicas que NÃO podem chamar onboarding/status
  return (
    pathname === "/app/login" ||
    pathname === "/app/register" ||
    pathname === "/app/forgot-password" ||
    pathname === "/app/reset-password" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  );
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const nextUrl = h.get("next-url") || "";
  const pathname = stripQuery(nextUrl);

  const content = (
    <div className="flex flex-col flex-1">
      <main className="app-main w-full flex-1 flex">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-1 flex-col">
          {children}
        </div>
      </main>
    </div>
  );

  if (isPublicAuthPath(pathname)) return content;

  return <OnboardingRouteGuard>{content}</OnboardingRouteGuard>;
}
