import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendUrl() {
  return (
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4100"
  );
}

function stripBearer(raw?: string | null): string | null {
  const v = (raw || "").trim();
  if (!v) return null;
  return v.toLowerCase().startsWith("bearer ") ? v.slice(7).trim() : v;
}

export async function GET() {
  try {
    const BACKEND_URL = getBackendUrl();
    const cookieStore = await cookies();

    const raw =
      cookieStore.get("decoder_auth")?.value ||
      cookieStore.get("accessToken")?.value ||
      cookieStore.get("token")?.value ||
      cookieStore.get("hint_access_token")?.value ||
      null;

    const token = stripBearer(raw);
    if (!token) {
      return NextResponse.json({ message: "UNAUTHENTICATED" }, { status: 401 });
    }

    const upstream = await fetch(`${BACKEND_URL}/api/v1/billing/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
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
      { message: "BILLING_ME_PROXY_FAILED" },
      { status: 500 },
    );
  }
}
