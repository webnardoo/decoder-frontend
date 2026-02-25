// src/app/api/notifications/read-all/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendBaseUrl() {
  return (
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4100"
  ).replace(/\/+$/, "");
}

function normalizeToken(raw: string | null | undefined) {
  const v = (raw || "").trim();
  if (!v) return "";
  return v.toLowerCase().startsWith("bearer ") ? v.slice(7).trim() : v;
}

async function getAuthTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();

  const token =
    jar.get("accessToken")?.value ||
    jar.get("token")?.value ||
    jar.get("hint_access_token")?.value ||
    jar.get("decoder_auth")?.value ||
    null;

  const normalized = normalizeToken(token);
  return normalized || null;
}

function normalizeJourney(v: any): string | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "TRIAL") return "TRIAL";
  return null;
}

export async function POST() {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    const token = await getAuthTokenFromCookies();

    if (!token) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const jar = await cookies();
    const cookieJourney = normalizeJourney(jar.get("hitch_journey")?.value);

    const upstreamUrl = `${backendBaseUrl}/api/v1/notifications/read-all`;

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        Cookie: `decoder_auth=${token}`,
        ...(cookieJourney ? { "x-journey": cookieJourney } : {}),
      },
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "PROXY_NOTIFICATION_READ_ALL_FAILED",
        message: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}