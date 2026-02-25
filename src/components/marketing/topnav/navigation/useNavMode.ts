// src/components/marketing/topnav/navigation/useNavMode.ts
"use client";

export type NavMode = "marketing" | "app" | "minimal";

function stripQuery(nextUrl: string): string {
  const raw = String(nextUrl || "");
  const q = raw.indexOf("?");
  return q >= 0 ? raw.slice(0, q) : raw;
}

export function inferModeFromPath(pathnameRaw: string): NavMode {
  const pathname = stripQuery(pathnameRaw);

  if (
    pathname === "/app/login" ||
    pathname === "/app/register" ||
    pathname === "/app/forgot-password" ||
    pathname === "/app/reset-password" ||
    pathname === "/signup" ||
    pathname.startsWith("/signup/")
  ) {
    return "minimal";
  }

  if (pathname === "/app" || pathname.startsWith("/app/")) return "app";

  return "marketing";
}