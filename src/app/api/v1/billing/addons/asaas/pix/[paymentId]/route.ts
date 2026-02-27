// src/app/api/billing/asaas/pix/[paymentId]/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getBackendBaseUrl(): string {
  // prioridade: BACKEND_URL (padrão do repo), fallback para NEXT_PUBLIC_API_BASE_URL
  const a = String(process.env.BACKEND_URL || "").trim();
  const b = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  const base = a || b;

  if (!base) return "http://localhost:4100";
  return base.replace(/\/$/, "");
}

function pickHeaders(req: Request): HeadersInit {
  // repassa cookie pra manter auth (JWT cookie/session)
  const cookie = req.headers.get("cookie") || "";
  const accept = req.headers.get("accept") || "application/json";

  const h: Record<string, string> = { Accept: accept };
  if (cookie) h.Cookie = cookie;
  return h;
}

export async function GET(req: Request, ctx: { params: Promise<{ paymentId: string }> }) {
  try {
    const { paymentId } = await ctx.params;
    const pid = String(paymentId || "").trim();
    if (!pid) {
      return NextResponse.json({ ok: false, error: "paymentId_required" }, { status: 400 });
    }

    const base = getBackendBaseUrl();
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
    return NextResponse.json(
      { ok: false, error: "proxy_failed", message: String(e?.message || e || "unknown") },
      { status: 500 }
    );
  }
}