import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4100";

function buildAuthHeaders(req: Request, cookieValue?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const auth = req.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  // Mantém compatibilidade com JwtStrategy (cookie extractor)
  if (cookieValue) headers["Cookie"] = `decoder_auth=${encodeURIComponent(cookieValue)}`;

  return headers;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const cookieStore = await cookies();
    const decoderAuth = cookieStore.get("decoder_auth")?.value;

    // ✅ NOVO alvo do MVP (Stripe Checkout Session)
    const res = await fetch(`${BACKEND_URL}/api/v1/billing/stripe/checkout-session`, {
      method: "POST",
      headers: buildAuthHeaders(req, decoderAuth),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { message: "Falha ao iniciar checkout no Stripe." },
        { status: res.status }
      );
    }

    // esperado: { url: "https://checkout.stripe.com/..." }
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Erro interno ao iniciar checkout." },
      { status: 500 }
    );
  }
}
