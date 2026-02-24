
/*src/app/layout.tsx*/
import type { ReactNode } from "react";
import "./globals.css";

import Script from "next/script";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // ✅ Pixel via ENV pública (Vercel). Se estiver vazio, não injeta nada (fail-safe).
  const pixelId = String(process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();

  return (
    <html lang="pt-BR" suppressHydrationWarning data-theme="light">
      <head>
        {/* ✅ Theme bootstrap (default = light). Define data-theme antes do app renderizar. */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var key = "hitch_theme";
    var saved = null;
    try { saved = localStorage.getItem(key); } catch (e) {}

    // ✅ default: light (e só aceita "light"|"dark" quando salvo)
    var theme = (saved === "dark" || saved === "light") ? saved : "light";

    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    // ✅ fallback seguro: light (NUNCA force dark aqui)
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
            `,
          }}
        />
      </head>

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

        {/* ✅ ROOT não injeta nav/footer. Cada segmento cuida do seu chrome. */}
        {children}
      </body>
    </html>
  );
}