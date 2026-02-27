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

function extractTokenFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("decoder_auth="));

  if (!match) return null;

  const raw = match.split("=")[1];
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function pickHeaders(req: Request): HeadersInit {
  const accept = req.headers.get("accept") || "application/json";
  const token = extractTokenFromCookie(req);

  const h: Record<string, string> = {
    Accept: accept,
  };

  if (token) {
    h.Authorization = `Bearer ${token}`;
  }

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

    const contentType =
      res.headers.get("content-type") || "application/json; charset=utf-8";

    const headers = new Headers();
    headers.set("content-type", contentType);
    headers.set("cache-control", "no-store");
    headers.set("x-debug-step", "passthrough");
    headers.set("x-debug-base", safeBaseForDebug(base));
    headers.set("x-debug-base-source", source);

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
      msg.includes("aborted") ||
      msg.includes("timeout") ||
      String(e).includes("AbortError");

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