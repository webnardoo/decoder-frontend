import { NextResponse } from "next/server";

function getBackendBaseUrl(): string {
  const env = (process.env.APP_ENV || "local").toLowerCase().trim();

  const local = process.env.BACKEND_URL_LOCAL || "http://127.0.0.1:4100";
  const prd = process.env.BACKEND_URL_PRD || "";

  if (env === "prd" && prd) return prd;
  return local;
}

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

export async function GET(req: Request) {
  const backendBase = getBackendBaseUrl();
  const url = `${backendBase}/api/v1/billing/me`;

  try {
    // encaminha cookie + authorization (caso o backend use Bearer)
    const cookie = req.headers.get("cookie") ?? "";
    const authorization = req.headers.get("authorization") ?? "";

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
        ...(authorization ? { authorization } : {}),
      },
      cache: "no-store",
    });

    const ct = upstream.headers.get("content-type") ?? "";
    const data = ct.includes("application/json")
      ? await upstream.json().catch(() => ({}))
      : await upstream.text().catch(() => "");

    // se for 401, devolve 401 com mensagem limpa (não “endpoint inexistente”)
    if (upstream.status === 401) {
      const msg =
        (typeof data === "object" && data ? extractMessage(data) : null) ||
        "Unauthorized (token/cookie ausente ou inválido).";
      return NextResponse.json(
        {
          ok: false,
          message: msg,
          __debug: { backendBase, url, hasCookie: Boolean(cookie), hasAuthorization: Boolean(authorization) },
        },
        { status: 401 },
      );
    }

    if (!upstream.ok) {
      const msg =
        (typeof data === "object" && data ? extractMessage(data) : null) ||
        (typeof data === "string" && data ? data : null) ||
        "Falha ao consultar billing/me no backend.";
      return NextResponse.json(
        { ok: false, message: msg, __debug: { backendBase, url } },
        { status: upstream.status },
      );
    }

    // passa o payload do backend como está
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        message: "Falha de conexão com o backend.",
        detail: String(e?.message || e),
        __debug: { backendBase, url },
      },
      { status: 502 },
    );
  }
}
