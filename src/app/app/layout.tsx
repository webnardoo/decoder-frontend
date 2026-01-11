// src/app/app/layout.tsx
import type { ReactNode } from "react";
import { TopNav } from "@/components/top-nav";
import { AppFooter } from "@/components/app-footer";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-app-bg min-h-screen flex flex-col">
      <TopNav />

      <main className="app-main w-full flex-1 flex">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-1 flex-col">
          {children}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
