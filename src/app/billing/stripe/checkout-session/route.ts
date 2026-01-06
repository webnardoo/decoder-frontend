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
    const backendBaseUrl = getBackendBaseUrl();

    // lê o body original (planId, billingCycle, etc.)
    const body = await req.json().catch(() => ({}));

    // tenta repassar auth (se o backend exigir)
    const cookieStore = await cookies();
    const token =
      extractJwtFromCookieValue(cookieStore.get("decoder_auth")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("token")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("accessToken")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("jwt")?.value || "");

    // IMPORTANTE:
    // O backend do Decoder usa prefixo global /api/v1 (padrão do projeto).
    // Então a rota correta em PRD deve ser /api/v1/billing/stripe/checkout-session.
    const upstreamUrl = `${backendBaseUrl}/api/v1/billing/stripe/checkout-session`;

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const contentType = upstream.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await upstream.json() : await upstream.text();

    // Repassa status + payload
    return NextResponse.json(
      isJson ? data : { ok: false, raw: data },
      { status: upstream.status }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Falha ao criar checkout session." },
      { status: 500 }
    );
  }
}
