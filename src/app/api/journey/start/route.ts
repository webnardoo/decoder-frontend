import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Journey = "PAID" | "TRIAL";

function normalizeJourney(v: any): Journey | null {
  const s = String(v ?? "")
    .trim()
    .toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "TRIAL") return "TRIAL";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qsJourney = url.searchParams.get("journey");

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const j = normalizeJourney(body?.journey ?? qsJourney);
    if (!j) {
      return NextResponse.json(
        { ok: false, message: "journey inválida. Use PAID ou TRIAL." },
        { status: 400 },
      );
    }

    const res = NextResponse.json({ ok: true, journey: j });

    // cookie acessível no client (para a UI conseguir ler/bypassar)
    res.cookies.set("hitch_journey", j, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return res;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Falha ao iniciar jornada." },
      { status: 500 },
    );
  }
}
