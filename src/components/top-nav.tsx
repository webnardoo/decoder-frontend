"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? "";

  const active = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`text-sm transition ${
        active ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {label}
    </Link>
  );
};

export function TopNav() {
  const { status, loading } = useOnboardingStatus();
  const isReady = !loading && status?.onboardingStage === "READY";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white font-black shadow-sm"
            style={{ backgroundColor: "rgb(31, 14, 55)" }}
          >
            H
          </span>
          <span className="text-sm font-semibold tracking-wide">Hitch.ai</span>
        </Link>

        {isReady && (
          <nav className="flex items-center gap-5">
            <NavLink href="/" label="Home" />
            <NavLink href="/conta" label="Conta" />
            <NavLink href="/admin/credit-v2" label="Admin" />
          </nav>
        )}
      </div>
    </header>
  );
}
