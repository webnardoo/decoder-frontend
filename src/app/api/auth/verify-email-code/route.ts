import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

export async function POST(req: NextRequest) {
  // ✅ novo fluxo: verify otp (cria user + retorna accessToken)
  const url = `${BACKEND_URL}/api/v1/auth/signup/verify-otp`;

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

  if (!upstream.ok) {
    return NextResponse.json(
      typeof payload === "string"
        ? { message: payload }
        : payload ?? { message: "verify-otp falhou" },
      { status: upstream.status },
    );
  }

  // ✅ se o backend retornou token, já seta cookie (evita depender de /login)
  const accessToken = typeof payload?.accessToken === "string" ? payload.accessToken : null;

  const res = NextResponse.json(payload, { status: upstream.status });

  if (accessToken) {
    const isProd = process.env.NODE_ENV === "production";
    res.cookies.set("decoder_auth", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
    });
  }

  return res;
}
