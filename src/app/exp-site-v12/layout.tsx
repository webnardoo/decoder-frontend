// src/app/exp-site-v12/layout.tsx
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./site.css";
import "./exp.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

export default function ExpSiteV12Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
