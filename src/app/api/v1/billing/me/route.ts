import { NextResponse } from "next/server";

function getBackendBaseUrl(): string {
  // ✅ Prioridade 1 (Vercel/PRD atual): BACKEND_URL
  const backendUrl = (process.env.BACKEND_URL || "").trim();
  if (backendUrl) return backendUrl;

  // ✅ Prioridade 2 (se você preferir separar no futuro): BACKEND_URL_PRD
  const prd = (process.env.BACKEND_URL_PRD || "").trim();
  if (prd) return prd;

  // ✅ Dev local
  const local = (process.env.BACKEND_URL_LOCAL || "http://127.0.0.1:4100").trim();

  // ✅ Evita PRD cair em localhost e mascarar o erro com 502
  if (process.env.VERCEL === "1") {
    throw new Error("Missing BACKEND_URL (or BACKEND_URL_PRD) in Vercel environment");
  }

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

    if (upstream.status === 401) {
      const msg =
        (typeof data === "object" && data ? extractMessage(data) : null) ||
        "Unauthorized (token/cookie ausente ou inválido).";
      return NextResponse.json(
        {
          ok: false,
          message: msg,
          __debug: {
            backendBase,
            url,
            hasCookie: Boolean(cookie),
            hasAuthorization: Boolean(authorization),
          },
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
