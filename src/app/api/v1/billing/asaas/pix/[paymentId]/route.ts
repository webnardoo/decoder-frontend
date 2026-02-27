// src/app/api/v1/billing/asaas/pix/[paymentId]/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBackendBaseUrl(): string {
  const a = String(process.env.BACKEND_URL || "").trim().replace(/\/$/, "");
  const b = String(process.env.NEXT_PUBLIC_API_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");

  if (a) return a;
  if (b) return b;

  return "http://localhost:4100";
}

function extractTokenFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("decoder_auth="));

  if (!match) return null;

  const raw = match.split("=").slice(1).join("=");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ paymentId?: string }> | { paymentId?: string } }
) {
  try {
    const resolvedParams =
      typeof (context as any)?.params?.then === "function"
        ? await (context.params as Promise<{ paymentId?: string }>)
        : (context.params as { paymentId?: string });

    const paymentId = String(resolvedParams?.paymentId || "").trim();

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: "paymentId_required" },
        { status: 400 }
      );
    }

    const base = getBackendBaseUrl();
    const token = extractTokenFromCookie(req);

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeoutMs = 10_000;
    const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

    const backendRes = await fetch(
      `${base}/api/v1/billing/asaas/pix/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout));

    const outHeaders = new Headers();
    outHeaders.set(
      "content-type",
      backendRes.headers.get("content-type") ||
        "application/json; charset=utf-8"
    );
    outHeaders.set("cache-control", "no-store");

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