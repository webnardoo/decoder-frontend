import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendUrl() {
  const url =
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.HITCH_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_HITCH_BACKEND_BASE_URL ||
    process.env.BACKEND_URL ||
    "";

  // Em PRD, se não tiver env, melhor falhar explícito do que cair em localhost.
  if (!url) return "";

  return url.replace(/\/+$/, "");
}

function stripBearer(raw?: string | null): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  return v.toLowerCase().startsWith("bearer ") ? v.slice(7).trim() : v;
}

export async function GET() {
  try {
    const BACKEND_URL = getBackendUrl();
    if (!BACKEND_URL) {
      return NextResponse.json(
        { message: "BACKEND_BASE_URL_NOT_CONFIGURED" },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();

    const raw =
      cookieStore.get("decoder_auth")?.value ||
      cookieStore.get("accessToken")?.value ||
      cookieStore.get("token")?.value ||
      cookieStore.get("hint_access_token")?.value ||
      null;

    const token = stripBearer(raw);

    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const upstream = await fetch(`${BACKEND_URL}/api/v1/credits/balance`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || "", {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ||
          "application/json; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "CREDITS_BALANCE_PROXY_FAILED" },
      { status: 500 },
    );
  }
}
