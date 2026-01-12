import type { ReactNode } from "react";
import { TopNav } from "@/components/top-nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <TopNav />

      <main className="app-main w-full flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
