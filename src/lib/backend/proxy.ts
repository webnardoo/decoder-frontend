// src/lib/backend/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "./base-url";

function shouldUseMock(req: NextRequest): boolean {
  return req.nextUrl.searchParams.get("mock") === "1";
}

function pickForwardHeaders(req: NextRequest): Record<string, string> {
  const h: Record<string, string> = {};

  const auth = req.headers.get("authorization");
  if (auth) h["authorization"] = auth;

  const cookie = req.headers.get("cookie");
  if (cookie) h["cookie"] = cookie;

  const ct = req.headers.get("content-type");
  if (ct) h["content-type"] = ct;

  return h;
}

/**
 * Proxy explícito para um endpoint do backend.
 * - NÃO faz inferência
 * - Repassa Authorization/Cookie
 * - Preserva status + body
 * - Nunca “morre mudo”: se houver exceção, responde JSON com diagnóstico.
 */
export async function proxyToBackendEndpoint(
  req: NextRequest,
  backendPath: string,
): Promise<NextResponse> {
  let baseUrl = "";
  try {
    baseUrl = getBackendBaseUrl();
  } catch (err: any) {
    // Erro de configuração local (ex.: env não setada)
    return NextResponse.json(
      {
        error: {
          code: "FRONTEND_BACKEND_BASE_URL_INVALID",
          message:
            "Base URL do backend real não configurada/ inválida no Frontend.",
          detail: typeof err?.message === "string" ? err.message : String(err),
          expectedEnv:
            "Defina NEXT_PUBLIC_API_BASE_URL (ex.: http://localhost:3001).",
        },
      },
      { status: 500 },
    );
  }

  const url = `${baseUrl}${backendPath}${req.nextUrl.search}`;
  const headers = pickForwardHeaders(req);
  const contentType = headers["content-type"] || "";

  let body: BodyInit | undefined = undefined;

  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      if (contentType.includes("application/json")) {
        body = JSON.stringify(await req.json());
      } else {
        body = await req.text();
      }
    } catch (err: any) {
      return NextResponse.json(
        {
          error: {
            code: "FRONTEND_REQUEST_BODY_PARSE_FAILED",
            message: "Falha ao ler o body da request no Frontend.",
            detail:
              typeof err?.message === "string" ? err.message : String(err),
          },
        },
        { status: 400 },
      );
    }
  }

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });

    const resContentType = res.headers.get("content-type") || "";

    if (resContentType.includes("application/json")) {
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": resContentType || "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "Falha ao conectar ao backend real.",
          detail: typeof err?.message === "string" ? err.message : String(err),
          target: url,
        },
      },
      { status: 502 },
    );
  }
}

export function routeOrMock(
  req: NextRequest,
  mockHandler: () => Promise<NextResponse> | NextResponse,
  backendPath: string,
): Promise<NextResponse> | NextResponse {
  if (shouldUseMock(req)) return mockHandler();
  return proxyToBackendEndpoint(req, backendPath);
}
