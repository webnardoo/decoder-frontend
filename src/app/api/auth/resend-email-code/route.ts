import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

export async function POST(req: NextRequest) {
  // ✅ no OTP-first, "resend" é o próprio request-otp (gera novo código)
  // ⚠️ backend exige password junto; se não vier, bloqueia aqui com erro claro.
  const raw = await req.text();
  let body: any = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email) {
    return NextResponse.json({ message: "E-mail é obrigatório." }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json(
      { message: "PASSWORD_REQUIRED" },
      { status: 400 },
    );
  }

  const url = `${BACKEND_URL}/api/v1/auth/signup/request-otp`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  const payload: any = contentType.includes("application/json")
    ? await upstream.json().catch(() => null)
    : await upstream.text().catch(() => "");

  if (!upstream.ok) {
    return NextResponse.json(
      typeof payload === "string"
        ? { message: payload }
        : payload ?? { message: "request-otp (resend) falhou" },
      { status: upstream.status },
    );
  }

  return NextResponse.json(payload, { status: upstream.status });
}
