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

function normalizeBody(bodyText: string, contentType: string) {
  const ct = (contentType || "").toLowerCase();
  if (!ct.includes("application/json")) return bodyText;

  try {
    const obj = JSON.parse(bodyText || "{}");

    // Aceita ambos e normaliza para o contrato do BACK (onboarding)
    const dialogueNickname =
      (typeof obj?.dialogueNickname === "string" ? obj.dialogueNickname : "") ||
      (typeof obj?.nickname === "string" ? obj.nickname : "");

    return JSON.stringify({ dialogueNickname });
  } catch {
    return bodyText;
  }
}

async function forward(
  url: string,
  method: "PATCH" | "POST",
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

async function proxy(req: NextRequest, method: "POST" | "PATCH") {
  const backendBase = ensureApiV1(getBackendBaseUrl());

  // ✅ Endpoint correto para a jornada
  const url = `${backendBase}/onboarding/dialogue-nickname`;

  const contentType = req.headers.get("content-type") ?? "application/json";
  const authorization = req.headers.get("authorization") ?? "";
  const cookie = req.headers.get("cookie") ?? "";

  const rawBody = await req.text();
  const body = normalizeBody(rawBody, contentType);

  const upstream = await forward(url, method, body, contentType, authorization, cookie);
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
