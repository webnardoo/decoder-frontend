"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { TutorialPopupsGate } from "@/components/tutorial-popups-gate";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  // ✅ Admin tools não deve ser bloqueado por onboarding gate nem poluir network com /status
  if (isAdminRoute) {
    return <main className="mx-auto w-full max-w-5xl px-4 py-10">{children}</main>;
  }

  return (
    <>
      <TopNav />
      <TutorialPopupsGate />
      <main className="mx-auto w-full max-w-5xl px-4 py-10">{children}</main>
    </>
  );
}
