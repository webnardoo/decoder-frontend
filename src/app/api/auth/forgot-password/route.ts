import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBackendBaseUrl() {
  return (
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4100"
  );
}

export async function POST(req: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl().replace(/\/+$/, "");
    const url = `${backendBaseUrl}/api/v1/auth/forgot-password`;

    const rawBody = await req.text();

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": req.headers.get("content-type") ?? "application/json",
        accept: "application/json",
      },
      body: rawBody,
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    // genérico, sem vazar detalhes
    return NextResponse.json(
      { ok: false, message: "Falha ao solicitar redefinição de senha." },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: "METHOD_NOT_ALLOWED" }, { status: 405 });
}
