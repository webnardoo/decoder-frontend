// src/app/api/auth/verify-email-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendBaseUrl() {
  return (
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4100"
  );
}

function ensureApiV1(baseUrl: string) {
  const cleaned = String(baseUrl || "").replace(/\/+$/, "");
  if (cleaned.endsWith("/api/v1")) return cleaned;
  return `${cleaned}/api/v1`;
}

function isProd() {
  return process.env.NODE_ENV === "production";
}

export async function POST(req: NextRequest) {
  try {
    const backend = ensureApiV1(getBackendBaseUrl());
    const bodyText = await req.text();

    // Mantém compat com payload { email, code }
    let email = "";
    let code = "";

    try {
      const obj = JSON.parse(bodyText || "{}");
      email = typeof obj?.email === "string" ? obj.email : "";
      code = typeof obj?.code === "string" ? obj.code : "";
    } catch {
      // Se não for JSON, deixa upstream validar
    }

    const upstream = await fetch(`${backend}/auth/signup/verify-otp`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": req.headers.get("content-type") ?? "application/json",
      },
      body: JSON.stringify({ email, code }),
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        { message: "Resposta inválida do backend (não-JSON).", raw: text || null },
        { status: 502 },
      );
    }

    if (!upstream.ok) {
      return NextResponse.json(data ?? { message: "Falha ao validar código." }, {
        status: upstream.status,
      });
    }

    // Backend retorna accessToken
    const token =
      (typeof data?.accessToken === "string" && data.accessToken.trim()) ? data.accessToken.trim() :
      (typeof data?.token === "string" && data.token.trim()) ? data.token.trim() :
      "";

    if (!token) {
      return NextResponse.json(
        { ...data, message: data?.message ?? "Código validado, mas token ausente." },
        { status: 200 },
      );
    }

    const jar = await cookies();

    const cookieBase = {
      httpOnly: true as const,
      secure: isProd(),
      sameSite: "lax" as const,
      path: "/",
    };

    jar.set("decoder_auth", token, cookieBase);
    jar.set("accessToken", token, cookieBase);

    return NextResponse.json(
      { ...data, accessToken: undefined, token: undefined },
      { status: 200 },
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        message: "Falha ao validar OTP (proxy).",
        error: String(e?.message ?? e),
      },
      { status: 502 },
    );
  }
}
