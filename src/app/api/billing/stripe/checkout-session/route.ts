import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendBaseUrl() {
  return (
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4100"
  );
}

function extractJwtFromCookieValue(v: string) {
  const raw = (v || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim();

  const eq = raw.indexOf("=");
  if (eq > -1 && raw.slice(0, eq).toLowerCase().includes("token")) {
    return raw.slice(eq + 1).trim();
  }

  return raw;
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const token =
      extractJwtFromCookieValue(cookieStore.get("decoder_auth")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("token")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("accessToken")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("jwt")?.value || "");

    if (!token) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const backendBaseUrl = getBackendBaseUrl();

    // Backend REAL (Railway): /billing/stripe/checkout-session
    const upstream = await fetch(`${backendBaseUrl}/billing/stripe/checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = upstream.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await upstream.json() : await upstream.text();

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "Falha ao processar requisição." },
      { status: 500 }
    );
  }
}
