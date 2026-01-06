import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

function isProd() {
  return process.env.NODE_ENV === "production";
}

export async function POST(req: NextRequest) {
  const url = `${BACKEND_URL}/api/v1/auth/login`;

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

  // Se deu erro, só repassa
  if (!upstream.ok) {
    return NextResponse.json(
      typeof payload === "string" ? { message: payload } : payload ?? { message: "Login falhou" },
      { status: upstream.status },
    );
  }

  // Espera accessToken no payload do backend
  const accessToken: string | undefined =
    (payload && typeof payload === "object" && (payload.accessToken || payload.token)) || undefined;

  // Se o backend mudou contrato e não retornou token, falha explícita (para não mascarar)
  if (!accessToken) {
    return NextResponse.json(
      {
        message: "Login não retornou token (accessToken/token).",
        debug: payload ?? null,
      },
      { status: 500 },
    );
  }

  // ✅ PADRÃO CANÔNICO DO PROJETO: cookie HttpOnly decoder_auth
  const jar = await cookies();

  // Remove cookie antigo (se existir) pra não confundir
  jar.set({
    name: "accessToken",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    maxAge: 0,
  });

  jar.set({
    name: "decoder_auth",
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: isProd(),
    path: "/",
    // sessão longa para dev; em prod você pode ajustar depois
    maxAge: 60 * 60 * 24 * 30,
  });

  // ✅ Retorna o mesmo payload do backend (inclui accessToken), pra tela não quebrar
  return NextResponse.json(payload, { status: 200 });
}
