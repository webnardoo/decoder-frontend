import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Journey = "PAID" | "TRIAL";

function normalizeJourney(v: any): Journey | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "TRIAL") return "TRIAL";
  return null;
}

function shouldClear(v: any): boolean {
  const s = String(v ?? "").trim().toUpperCase();
  return s === "" || s === "CLEAR" || s === "RESET" || s === "NULL";
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

    const raw = body?.journey ?? qsJourney;

    // ✅ suporte a limpeza (debug/rollback rápido)
    if (shouldClear(raw)) {
      const res = NextResponse.json({ ok: true, cleared: true });
      res.cookies.set("hitch_journey", "", {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 0,
      });
      return res;
    }

    const j = normalizeJourney(raw);
    if (!j) {
      return NextResponse.json(
        { ok: false, message: "journey inválida. Use PAID ou TRIAL." },
        { status: 400 },
      );
    }

    const res = NextResponse.json({ ok: true, journey: j });

    // cookie acessível no client (UI consegue ler/bypassar)
    // ✅ TTL curto para não “grudar” e contaminar outras entradas
    res.cookies.set("hitch_journey", j, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 2, // 2 horas
    });

    return res;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Falha ao iniciar jornada." },
      { status: 500 },
    );
  }
}
