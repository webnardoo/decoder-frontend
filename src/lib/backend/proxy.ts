// src/lib/backend/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "./base-url";

function shouldUseMock(req: NextRequest): boolean {
  return req.nextUrl.searchParams.get("mock") === "1";
}

/**
 * Proxy transparente:
 * - /api/... no Front -> ... no Backend (remove o prefixo /api)
 * - Mantém status, headers e body sem inferência
 */
export async function proxyToBackend(req: NextRequest): Promise<NextResponse> {
  const baseUrl = getBackendBaseUrl();

  const incomingPath = req.nextUrl.pathname; // ex: /api/analyze
  const backendPath = incomingPath.replace(/^\/api/, ""); // ex: /analyze

  const backendUrl = `${baseUrl}${backendPath}${req.nextUrl.search}`;

  // Importante: não cria fallback, não recalcula nada, só encaminha.
  const contentType = req.headers.get("content-type") || "";

  let body: BodyInit | undefined = undefined;

  // GET/HEAD sem body
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (contentType.includes("application/json")) {
      // preserva JSON
      body = JSON.stringify(await req.json());
    } else if (contentType.includes("multipart/form-data")) {
      // NextRequest.formData() funciona no runtime node
      const form = await req.formData();
      body = form as unknown as BodyInit;
    } else {
      // fallback explícito: repassa como texto
      body = await req.text();
    }
  }

  const res = await fetch(backendUrl, {
    method: req.method,
    headers: {
      // repassa somente o essencial; evita conflitos de host/content-length
      "content-type": contentType || "application/json",
      // repasse do Authorization se existir (fonte única de verdade no backend)
      ...(req.headers.get("authorization")
        ? { authorization: req.headers.get("authorization") as string }
        : {}),
    },
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
    headers: {
      "content-type": resContentType || "text/plain; charset=utf-8",
    },
  });
}

export function routeOrMock(
  req: NextRequest,
  mockHandler: () => Promise<NextResponse> | NextResponse
): Promise<NextResponse> | NextResponse {
  // Regra restrita: mock SOMENTE quando ?mock=1
  if (shouldUseMock(req)) return mockHandler();
  return proxyToBackend(req);
}
