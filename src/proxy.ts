// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ✅ Normaliza /app/app/... -> /app/...
  if (pathname === "/app/app" || pathname.startsWith("/app/app/")) {
    const normalized = pathname.replace(/^\/app\/app(\/|$)/, "/app$1");
    const url = req.nextUrl.clone();
    url.pathname = normalized;
    url.search = search; // preserva querystring
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/app/:path*", "/app/app"],
};
