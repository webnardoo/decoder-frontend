// src/app/api/auth/resend-email-code/route.ts
import { NextRequest, NextResponse } from "next/server";

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

export async function POST(req: NextRequest) {
  try {
    const backend = ensureApiV1(getBackendBaseUrl());
    const bodyText = await req.text();

    let email = "";
    let password = "";

    try {
      const obj = JSON.parse(bodyText || "{}");
      email = typeof obj?.email === "string" ? obj.email : "";
      password = typeof obj?.password === "string" ? obj.password : "";
    } catch {}

    const upstream = await fetch(`${backend}/auth/signup/request-otp`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": req.headers.get("content-type") ?? "application/json",
      },
      body: JSON.stringify({ email, password }),
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

    return NextResponse.json(data ?? {}, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json(
      {
        message: "Falha ao reenviar OTP (proxy).",
        error: String(e?.message ?? e),
      },
      { status: 502 },
    );
  }
}
