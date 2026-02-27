// src/app/api/v1/billing/addons/asaas/pix/[paymentId]/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeBaseForDebug(base: string): string {
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return base;
  }
}

function getBackendBaseUrl(): {
  base: string;
  source: "BACKEND_URL" | "NEXT_PUBLIC_API_BASE_URL" | "fallback";
} {
  const aRaw = String(process.env.BACKEND_URL || "").trim();
  const bRaw = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

  const a = aRaw.replace(/\/$/, "");
  const b = bRaw.replace(/\/$/, "");

  if (a) return { base: a, source: "BACKEND_URL" };
  if (b) return { base: b, source: "NEXT_PUBLIC_API_BASE_URL" };

  return { base: "http://localhost:4100", source: "fallback" };
}

function pickHeaders(req: Request): HeadersInit {
  const cookie = req.headers.get("cookie") || "";
  const accept = req.headers.get("accept") || "application/json";
  const authorization = req.headers.get("authorization") || "";

  const h: Record<string, string> = { Accept: accept };
  if (cookie) h.Cookie = cookie;
  if (authorization) h.Authorization = authorization;
  return h;
}

function jsonError(
  status: number,
  payload: Record<string, any>,
  debugHeaders?: Record<string, string>
) {
  return NextResponse.json(
    { ok: false, ...payload },
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        ...(debugHeaders || {}),
      },
    }
  );
}

export async function GET(
  req: Request,
  ctx: { params: { paymentId: string } }
) {
  const { base, source } = getBackendBaseUrl();

  // timeout curto pra não “pendurar” function
  const controller = new AbortController();
  const timeoutMs = 10_000;
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const paymentId = String(ctx?.params?.paymentId || "").trim();
    if (!paymentId) {
      return jsonError(
        400,
        { error: "paymentId_required" },
        { "x-debug-step": "validate_params" }
      );
    }

    const url = `${base}/api/v1/billing/asaas/pix/${encodeURIComponent(paymentId)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: pickHeaders(req),
      cache: "no-store",
      signal: controller.signal,
    });

    // ✅ PASS-THROUGH (stream) — não ler body, não parsear, não re-serializar
    const contentType = res.headers.get("content-type") || "application/json; charset=utf-8";

    // repassa apenas headers essenciais (evita conflito de encoding/length)
    const headers = new Headers();
    headers.set("content-type", contentType);
    headers.set("cache-control", "no-store");
    headers.set("x-debug-step", "passthrough");
    headers.set("x-debug-base", safeBaseForDebug(base));
    headers.set("x-debug-base-source", source);

    // IMPORTANTE: res.body pode ser null em alguns casos
    if (!res.body) {
      const raw = await res.text().catch(() => "");
      return new NextResponse(raw, { status: res.status, headers });
    }

    return new NextResponse(res.body, {
      status: res.status,
      headers,
    });
  } catch (e: any) {
    const msg = String(e?.message || e || "unknown");
    const aborted =
      msg.includes("aborted") || msg.includes("timeout") || String(e).includes("AbortError");

    return jsonError(
      aborted ? 504 : 502,
      {
        error: aborted ? "proxy_timeout" : "proxy_failed",
        message: msg,
        baseHost: safeBaseForDebug(base),
        baseSource: source,
        nodeEnv: String(process.env.NODE_ENV || ""),
      },
      {
        "x-debug-step": "catch",
        "x-debug-base": safeBaseForDebug(base),
        "x-debug-base-source": source,
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}