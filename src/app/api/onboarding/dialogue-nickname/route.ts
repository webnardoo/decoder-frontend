import { NextRequest, NextResponse } from "next/server";

function ensureApiV1(baseUrl: string) {
  const cleaned = baseUrl.replace(/\/+$/, "");
  if (cleaned.endsWith("/api/v1")) return cleaned;
  return `${cleaned}/api/v1`;
}

function getBackendBaseUrl() {
  const decoder = process.env.DECODER_BACKEND_BASE_URL?.trim();
  if (decoder) return decoder;

  const backendUrl = process.env.BACKEND_URL?.trim();
  if (backendUrl) return backendUrl;

  // DEV fallback
  return "http://localhost:4100";
}

async function forward(
  req: NextRequest,
  url: string,
  method: "PATCH" | "PUT",
  body: string,
  contentType: string,
  authorization: string,
  cookie: string
) {
  return fetch(url, {
    method,
    headers: {
      "content-type": contentType,
      ...(authorization ? { authorization } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body,
    cache: "no-store",
  });
}

async function proxy(req: NextRequest, _method: "POST" | "PATCH") {
  const backendBase = ensureApiV1(getBackendBaseUrl());

  // ✅ FIX: endpoint correto no backend é profile/dialogue-nickname (não onboarding/dialogue-nickname)
  const url = `${backendBase}/profile/dialogue-nickname`;

  const contentType = req.headers.get("content-type") ?? "application/json";
  const authorization = req.headers.get("authorization") ?? "";
  const cookie = req.headers.get("cookie") ?? "";

  const body = await req.text();

  // O front antigo chama POST/PATCH; o backend pode estar em PATCH ou PUT.
  // Fazemos tentativa PATCH primeiro e, se 404/405, tentamos PUT.
  let upstream = await forward(req, url, "PATCH", body, contentType, authorization, cookie);

  if (upstream.status === 404 || upstream.status === 405) {
    upstream = await forward(req, url, "PUT", body, contentType, authorization, cookie);
  }

  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    return await proxy(req, "POST");
  } catch (e: any) {
    return NextResponse.json(
      {
        message: "Falha ao encaminhar dialogue-nickname para o backend (POST).",
        error: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    return await proxy(req, "PATCH");
  } catch (e: any) {
    return NextResponse.json(
      {
        message: "Falha ao encaminhar dialogue-nickname para o backend (PATCH).",
        error: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}
