"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TopNav() {
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? "";

  // ✅ Home (marketing) tem header próprio. Evita header duplicado.
  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl text-white font-black shadow-sm"
            style={{ backgroundColor: "rgb(31, 14, 55)" }}
          >
            H
          </span>
          <span className="text-sm font-semibold tracking-wide">Hitch.ai</span>
        </Link>
      </div>
    </header>
  );
}
