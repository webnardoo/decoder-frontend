import { NextResponse } from "next/server";

type PlanContext = {
  plan: "FREE" | "BASIC" | "PRO" | "UNLIMITED";
  isUnlimited: boolean;
};

async function proxyToBackend(): Promise<{ status: number; data: any } | null> {
  const base = process.env.DECODER_BACKEND_URL;
  if (!base) return null;

  const url = `${base.replace(/\/$/, "")}/api/v1/subscriptions/context`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  } catch {
    return null;
  }
}

export async function GET() {
  // 1) Fonte real: backend
  const backend = await proxyToBackend();
  if (backend) {
    if (!backend.data) {
      return NextResponse.json(
        { message: "Algo não saiu como esperado. Tente novamente em instantes." },
        { status: 500 },
      );
    }

    return NextResponse.json(backend.data as PlanContext, {
      status: backend.status,
    });
  }

  // 2) DEV local (mock controlado, contrato v1.1)
  const mock: PlanContext = {
    plan: "PRO",
    isUnlimited: false,
  };

  return NextResponse.json(mock, { status: 200 });
}
