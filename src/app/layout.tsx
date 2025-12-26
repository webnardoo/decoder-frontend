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
        <div className="min-h-dvh bg-zinc-950 text-zinc-50">
          <TopNav />
          <TutorialPopupsGate />
          <main className="mx-auto w-full max-w-5xl px-4 py-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
