// src/app/api/v1/billing/addons/asaas/pix/[paymentId]/route.ts
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
  context: { params: { paymentId: string } }
) {
  try {
    const { paymentId } = context.params;

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

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const backendRes = await fetch(
      `${base}/api/v1/billing/asaas/pix/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers: {
        "content-type":
          backendRes.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "proxy_failed",
        message: String(err?.message || err),
      },
      { status: 500 }
    );
  }
}