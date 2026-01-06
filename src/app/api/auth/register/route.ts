import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

export async function POST(req: NextRequest) {
  const url = `${BACKEND_URL}/api/v1/auth/register`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": req.headers.get("content-type") ?? "application/json",
      Accept: "application/json",
    },
    body: await req.text(),
    cache: "no-store",
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  const payload: any = contentType.includes("application/json")
    ? await upstream.json().catch(() => null)
    : await upstream.text().catch(() => "");

  // Register não seta cookie aqui; a tela faz login depois.
  if (!upstream.ok) {
    return NextResponse.json(
      typeof payload === "string" ? { message: payload } : payload ?? { message: "Register falhou" },
      { status: upstream.status },
    );
  }

  return NextResponse.json(payload, { status: upstream.status });
}
