import { NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizeBaseUrl(raw: string): string {
  return String(raw || "").trim().replace(/\/+$/, "");
}

function buildBillingMeUrl(backendBaseRaw: string): string {
  const base = normalizeBaseUrl(backendBaseRaw);

  // Se o BACKEND_URL já vier com /api/v1 no final, NÃO duplica.
  if (base.endsWith("/api/v1")) return `${base}/billing/me`;

  // Se vier com /api (sem /v1), completa.
  if (base.endsWith("/api")) return `${base}/v1/billing/me`;

  // Caso normal: base raiz
  return `${base}/api/v1/billing/me`;
}

function getBackendBaseUrl(): string {
  // ✅ PRD (Vercel) geralmente usa BACKEND_URL
  const prdGeneric = normalizeBaseUrl(process.env.BACKEND_URL || "");
  if (prdGeneric) return prdGeneric;

  // fallback legado
  const prd = normalizeBaseUrl(process.env.BACKEND_URL_PRD || "");
  if (prd) return prd;

  // local
  const local = normalizeBaseUrl(process.env.BACKEND_URL_LOCAL || "http://127.0.0.1:4100");
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
  const url = buildBillingMeUrl(backendBase);

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
