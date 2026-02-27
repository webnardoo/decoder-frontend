// src/app/api/v1/billing/addons/asaas/pix-checkout/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backendBaseUrl() {
  const base =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL;

  if (!base) {
    throw new Error(
      "BACKEND_URL não configurado no Front (Vercel). Defina BACKEND_URL apontando para o backend (ex: https://api-hml.hitchai.online).",
    );
  }

  return String(base).replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const base = backendBaseUrl();
    const url = `${base}/api/v1/billing/addons/asaas/pix-checkout`;

    const body = await req.text();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") || "application/json",
        // repassa cookies para autenticação no backend (JWT cookie / session)
        cookie: req.headers.get("cookie") || "",
      },
      body,
      cache: "no-store",
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        message: e?.message || "Falha ao encaminhar requisição para o backend.",
      },
      { status: 502 },
    );
  }
}