import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeBaseUrl(raw?: string) {
  const v = (raw ?? "").trim();
  if (!v) return null;
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

function getBaseUrl() {
  // 1) PRD canônico (server env)
  const prd = normalizeBaseUrl(process.env.BACKEND_URL);
  if (prd) return prd;

  // 2) DEV (mantém compatível com o padrão do front)
  const dev =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_HITCH_BACKEND_BASE_URL);

  if (dev) return dev;

  // 3) fallback local
  return "http://localhost:4100";
}

export async function POST(req: NextRequest) {
  const baseUrl = getBaseUrl();

  // Protege PRD: se estiver em produção e BACKEND_URL não existir, não deixa cair em localhost.
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !normalizeBaseUrl(process.env.BACKEND_URL)) {
    console.error("[/api/auth/register] BACKEND_URL ausente em runtime (production).");
    return NextResponse.json(
      { message: "Configuração ausente: BACKEND_URL não está definida em PRD." },
      { status: 500 },
    );
  }

  if (!/^https?:\/\//i.test(baseUrl)) {
    console.error("[/api/auth/register] BACKEND_URL inválida:", baseUrl);
    return NextResponse.json(
      { message: "Configuração inválida: BACKEND_URL deve começar com http(s)://." },
      { status: 500 },
    );
  }

  const url = `${baseUrl}/api/v1/auth/signup/request-otp`;

  const bodyText = await req.text();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("content-type") ?? "application/json",
        Accept: "application/json",
      },
      body: bodyText,
      cache: "no-store",
      signal: controller.signal,
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const payload: any = contentType.includes("application/json")
      ? await upstream.json().catch(() => null)
      : await upstream.text().catch(() => "");

    if (!upstream.ok) {
      console.error("[/api/auth/register] Upstream FAIL", {
        url,
        status: upstream.status,
        payload,
      });

      return NextResponse.json(
        typeof payload === "string"
          ? { message: payload || "request-otp falhou" }
          : payload ?? { message: "request-otp falhou" },
        { status: upstream.status },
      );
    }

    return NextResponse.json(payload, { status: upstream.status });
  } catch (err: any) {
    const isAbort = err?.name === "AbortError";
    console.error("[/api/auth/register] Fetch ERROR", {
      url,
      reason: isAbort ? "timeout" : "network/runtime error",
      message: err?.message ?? String(err),
    });

    return NextResponse.json(
      {
        message: isAbort
          ? "Falha ao chamar o backend (timeout)."
          : "Falha ao chamar o backend (erro de rede/runtime).",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
