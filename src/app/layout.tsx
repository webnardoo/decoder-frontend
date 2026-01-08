import "./globals.css";
import type { Metadata } from "next";
import { TopNav } from "@/components/top-nav";
import { TutorialPopupsGate } from "@/components/tutorial-popups-gate";

export const metadata: Metadata = {
  title: "HINT",
  description: "Análise comportamental de conversas — rápida, simples e confortável.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        {/* Background do app inteiro (preto + glow roxo central controlado por CSS vars) */}
        <div className="min-h-dvh bg-[var(--h-app-bg)] text-[var(--h-text)]">
          <TopNav />
          <TutorialPopupsGate />
          <main className="mx-auto w-full max-w-5xl px-4 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
