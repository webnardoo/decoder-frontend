import type { ReactNode } from "react";
import "@/app/globals.css";

import {TopNav} from "@/components/top-nav";
import { AppFooter } from "@/components/app-footer";

export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="h-app-bg min-h-screen flex flex-col">
      {/* Header */}
      <TopNav />

      {/* Área principal do app */}
      <main className="app-main w-full flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-24">
          {children}
        </div>
      </main>

      {/* Footer */}
      <AppFooter />
    </div>
  );
}
