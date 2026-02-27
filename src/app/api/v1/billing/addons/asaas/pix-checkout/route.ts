// src/app/api/v1/billing/addons/asaas/pix-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBackendBaseUrl(): string {
  const a = String(process.env.BACKEND_URL || "").trim().replace(/\/$/, "");
  const b = String(process.env.NEXT_PUBLIC_API_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (a) return a;
  if (b) return b;

  // dev local do backend
  return "http://localhost:4100";
}

export async function POST(req: NextRequest) {
  try {
    const base = getBackendBaseUrl();
    const url = `${base}/api/v1/billing/addons/asaas/pix-checkout`;

    const body = await req.text();

    const controller = new AbortController();
    const timeoutMs = 12_000;
    const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

    const backendRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        Accept: "application/json",
        // repassa cookies para autenticação no backend
        cookie: req.headers.get("cookie") || "",
      },
      body,
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const outHeaders = new Headers();
    outHeaders.set(
      "content-type",
      backendRes.headers.get("content-type") || "application/json; charset=utf-8"
    );
    outHeaders.set("cache-control", "no-store");

    // mantém o body “streamado” quando existir
    if (!backendRes.body) {
      const raw = await backendRes.text().catch(() => "");
      return new NextResponse(raw, { status: backendRes.status, headers: outHeaders });
    }

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers: outHeaders,
    });
  } catch (err: any) {
    const msg = String(err?.message || err || "unknown");
    const aborted =
      msg.includes("aborted") || msg.includes("timeout") || msg.includes("AbortError");

    return NextResponse.json(
      {
        ok: false,
        error: aborted ? "proxy_timeout" : "proxy_failed",
        message: msg,
      },
      { status: aborted ? 504 : 502 }
    );
  }
}
