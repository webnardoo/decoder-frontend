import type { ReactNode } from "react";
import "./globals.css";

import Script from "next/script";
import { AppFooter } from "@/components/app-footer";
import { TopNav } from "@/components/top-nav";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // ✅ Pixel via ENV pública (Vercel). Se estiver vazio, não injeta nada (fail-safe).
  const pixelId = String(process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();

  return (
    <html lang="pt-BR">
      <body className="min-h-dvh h-app-bg">
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

        <div className="min-h-dvh flex flex-col">
          <TopNav />
          <main className="flex-1 flex flex-col">{children}</main>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
