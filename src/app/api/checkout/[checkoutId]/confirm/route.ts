import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4100";

function buildAuthHeaders(req: Request, cookieValue?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const auth = req.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  if (cookieValue) headers["Cookie"] = `decoder_auth=${encodeURIComponent(cookieValue)}`;

  return headers;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ checkoutId: string }> }
) {
  try {
    const { checkoutId } = await ctx.params;
    const body = await req.json().catch(() => ({}));

    const cookieStore = await cookies();
    const decoderAuth = cookieStore.get("decoder_auth")?.value;

    const res = await fetch(`${BACKEND_URL}/api/v1/checkout/${checkoutId}/confirm`, {
      method: "POST",
      headers: buildAuthHeaders(req, decoderAuth),
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        data ?? { message: "Falha ao confirmar pagamento." },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Erro interno ao confirmar pagamento." },
      { status: 500 }
    );
  }
}
