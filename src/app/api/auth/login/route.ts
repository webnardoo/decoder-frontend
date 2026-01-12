// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend/base-url";

type Body = {
  email?: string;
  password?: string;
};

function isPrd(): boolean {
  const vercelEnv = String(process.env.VERCEL_ENV || "").trim().toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || "").trim().toLowerCase();
  const appEnv = String(process.env.APP_ENV || "").trim().toLowerCase();
  const nextPublicAppEnv = String(process.env.NEXT_PUBLIC_APP_ENV || "")
    .trim()
    .toLowerCase();
  return (
    vercelEnv === "production" ||
    nodeEnv === "production" ||
    appEnv === "prd" ||
    nextPublicAppEnv === "prd"
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = String(body.email || "").trim();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "email e password são obrigatórios" },
        { status: 400 }
      );
    }

    const base = getBackendBaseUrl();
    const url = `${base}/api/v1/auth/login`;

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email, password }),
    });

    const data = await upstream.json().catch(() => ({} as any));
    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: upstream.status,
          error: data?.message || data?.error || "Falha no login (backend).",
        },
        { status: upstream.status }
      );
    }

    const accessToken = String(data?.accessToken || "").trim();
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Backend não retornou accessToken." },
        { status: 502 }
      );
    }

    // ✅ Cookie do APP setado pelo Vercel (domínio correto automaticamente)
    const cookieStore = await cookies();
    cookieStore.set("decoder_auth", accessToken, {
      httpOnly: true,
      secure: isPrd(),
      sameSite: "lax",
      path: "/",
      // NÃO definir domain aqui. Em Vercel, deixa o browser usar o domínio atual (hitchai.online).
    });

    return NextResponse.json(
      { ok: true, user: data?.user ?? null },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erro interno (login route)." },
      { status: 500 }
    );
  }
}
