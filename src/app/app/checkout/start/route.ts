import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL não definido");
  return base.replace(/\/+$/, "");
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

export async function POST(req: NextRequest) {
  try {
    const base = getBackendBaseUrl();

    const cookieStore = await cookies();
    const token =
      extractJwtFromCookieValue(cookieStore.get("decoder_auth")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("token")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("accessToken")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("jwt")?.value || "");

    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized", statusCode: 401 },
        { status: 401 },
      );
    }

    // lê body e repassa como está (sem inventar contrato)
    const text = await req.text();
    const body = text && text.length > 0 ? text : "{}";

    // BACK canônico
    const url = `${base}/billing/stripe/checkout-session`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });

    const ct = upstream.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const json = await upstream.json().catch(() => ({}));
      return NextResponse.json(json, { status: upstream.status });
    }

    const raw = await upstream.text();
    return new NextResponse(raw, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        message: "Falha ao iniciar checkout (proxy).",
        hint: "Verifique NEXT_PUBLIC_API_BASE_URL no Vercel (deve ser https://SEU_BACKEND/api/v1).",
      },
      { status: 502 },
    );
  }
}
