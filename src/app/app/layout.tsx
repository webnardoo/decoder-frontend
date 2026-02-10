// src/app/app/layout.tsx
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { OnboardingRouteGuard } from "@/components/onboarding/OnboardingRouteGuard";
import Script from "next/script";

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

  // ✅ Pixel via ENV pública (Vercel). Se estiver vazio, não injeta nada (fail-safe).
  const pixelId = String(process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();

  const content = (
    <>
      {pixelId ? (
        <>
          {/* Meta Pixel (base) */}
          <Script
            id="meta-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
              `,
            }}
          />

          {/* Meta Pixel (noscript fallback) */}
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${encodeURIComponent(
                pixelId,
              )}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      ) : null}

      <div className="flex flex-col flex-1">
        <main className="app-main w-full flex-1 flex">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-1 flex-col">
            {children}
          </div>
        </main>
      </div>
    </>
  );

  if (isPublicAuthPath(pathname)) return content;

  return <OnboardingRouteGuard>{content}</OnboardingRouteGuard>;
}
