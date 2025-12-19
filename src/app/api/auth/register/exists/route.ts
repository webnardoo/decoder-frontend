import { NextResponse } from "next/server";

export async function GET() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl || typeof baseUrl !== "string") {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/auth/register`;

    // OPTIONS costuma retornar 404 quando a rota não existe.
    const res = await fetch(url, { method: "OPTIONS", cache: "no-store" });

    // Heurística mínima (sem inferência de regra): 404 => não existe; qualquer outro => existe
    if (res.status === 404) return NextResponse.json({ exists: false }, { status: 200 });
    return NextResponse.json({ exists: true }, { status: 200 });
  } catch {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}
