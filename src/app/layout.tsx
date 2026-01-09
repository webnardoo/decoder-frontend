import "./globals.css";
import type { Metadata } from "next";
import { TopNav } from "@/components/top-nav";
import { TutorialPopupsGate } from "@/components/tutorial-popups-gate";
import { AppFooter } from "@/components/app-footer";

export const metadata: Metadata = {
  title: "Hitch.ai",
  description: "Análise comportamental de conversas — rápida, simples e confortável.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>
        <div className="min-h-dvh flex flex-col h-app-bg text-[var(--h-text)]">
          <TopNav />
          <TutorialPopupsGate />

          <main className="app-main w-full">
            <div className="mx-auto w-full max-w-5xl px-4 py-10 flex-1 flex flex-col">
              {children}
            </div>
          </main>

          <AppFooter />
        </div>
      </body>
    </html>
  );
}
