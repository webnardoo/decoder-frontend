"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname();
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
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-yellow-400 text-zinc-950 font-black">
            H
          </span>
          <span className="text-sm font-semibold tracking-wide">HINT</span>
        </Link>

        <nav className="flex items-center gap-5">
          <NavLink href="/" label="Home" />
          <NavLink href="/conversas" label="Conversas" />
          <NavLink href="/account" label="Conta" />
        </nav>
      </div>
    </header>
  );
}
