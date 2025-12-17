import { NextResponse } from "next/server";
import { headers } from "next/headers";

type CreditsBalanceResponse = {
  userId: string;
  balance: number;
};

async function proxyToBackend(): Promise<{ status: number; data: any } | null> {
  const base = process.env.DECODER_BACKEND_URL;
  if (!base) return null;

  const url = `${base.replace(/\/$/, "")}/api/v1/credits/balance`;

  try {
    const h = await headers();
    const auth = h.get("authorization") || "";
    const cookie = h.get("cookie") || "";

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch {
    return null;
  }
}

export async function GET() {
  // 1) backend real (quando conectado)
  const backend = await proxyToBackend();
  if (backend) {
    if (!backend.data) {
      return NextResponse.json(
        { message: "Algo não saiu como esperado. Tente novamente em instantes." },
        { status: 500 },
      );
    }
    return NextResponse.json(backend.data, { status: backend.status });
  }

  // 2) mock dormente (quando NÃO há backend)
  const mock: CreditsBalanceResponse = {
    userId: "mock",
    balance: 340,
  };

  return NextResponse.json(mock, { status: 200 });
}
