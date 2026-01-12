import { NextResponse } from "next/server";

function normalizeEmail(input: unknown): string {
  const v = typeof input === "string" ? input.trim() : "";
  return v.toLowerCase();
}

// Contrato:
// POST { email: string } -> 200 { exists: boolean }
// 405 para GET (pra não vazar comportamento)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail((body as any)?.email);

    if (!email) {
      return NextResponse.json(
        { message: "EMAIL_REQUIRED" },
        { status: 400 },
      );
    }

    // IMPORTANTE:
    // Aqui a gente só responde "exists" baseado no backend real quando você plugar.
    // Se já existe uma rota/backend pra isso, você adapta este trecho para proxyar pro backend.
    // Por enquanto, devolve false (e o fluxo deve levar pro registro).
    return NextResponse.json({ exists: false }, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "REGISTER_EXISTS_FAILED" },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "METHOD_NOT_ALLOWED" },
    { status: 405 },
  );
}
