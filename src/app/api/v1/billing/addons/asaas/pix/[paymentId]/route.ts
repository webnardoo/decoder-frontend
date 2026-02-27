// src/app/api/v1/billing/addons/asaas/pix/[paymentId]/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function safeBaseForDebug(base: string): string {
  // não expõe query, headers, tokens; só host/base
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return base;
  }
}

function getBackendBaseUrl(): { base: string; source: "BACKEND_URL" | "NEXT_PUBLIC_API_BASE_URL" | "fallback" } {
  const aRaw = String(process.env.BACKEND_URL || "").trim();
  const bRaw = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

  const a = aRaw.replace(/\/$/, "");
  const b = bRaw.replace(/\/$/, "");

  const base = a || b;
  if (a) return { base: a, source: "BACKEND_URL" };
  if (b) return { base: b, source: "NEXT_PUBLIC_API_BASE_URL" };

  return { base: "http://localhost:4100", source: "fallback" };
}

function pickHeaders(req: Request): HeadersInit {
  const cookie = req.headers.get("cookie") || "";
  const accept = req.headers.get("accept") || "application/json";

  const h: Record<string, string> = { Accept: accept };
  if (cookie) h.Cookie = cookie;
  return h;
}

export async function GET(req: Request, ctx: { params: Promise<{ paymentId: string }> }) {
  const { base, source } = getBackendBaseUrl();

  try {
    const { paymentId } = await ctx.params;
    const pid = String(paymentId || "").trim();
    if (!pid) {
      return NextResponse.json({ ok: false, error: "paymentId_required" }, { status: 400 });
    }

    const url = `${base}/api/v1/billing/asaas/pix/${encodeURIComponent(pid)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: pickHeaders(req),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    const status = res.status;

    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      return NextResponse.json(data, { status });
    }

    const text = await res.text().catch(() => "");
    return new NextResponse(text, {
      status,
      headers: { "content-type": contentType || "text/plain; charset=utf-8" },
    });
  } catch (e: any) {
    // ✅ diagnóstico seguro (não vaza secrets)
    return NextResponse.json(
      {
        ok: false,
        error: "proxy_failed",
        message: String(e?.message || e || "unknown"),
        debug: {
          baseHost: safeBaseForDebug(base),
          baseSource: source,
          nodeEnv: String(process.env.NODE_ENV || ""),
        },
      },
      { status: 502 }
    );
  }
}