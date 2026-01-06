import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function normalizeBaseUrl(raw: string) {
  return String(raw || "").trim().replace(/\/+$/, "");
}

function getBackendBaseUrl() {
  const base =
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4100";

  return normalizeBaseUrl(base);
}

function ensureApiV1(base: string) {
  if (base.endsWith("/api/v1")) return base;
  if (base.endsWith("/api/v1/")) return base.replace(/\/+$/, "");
  return `${base}/api/v1`;
}

async function getAuthTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();

  const token =
    jar.get("accessToken")?.value ||
    jar.get("token")?.value ||
    jar.get("hint_access_token")?.value ||
    jar.get("decoder_auth")?.value ||
    null;

  return token ? String(token).trim() : null;
}

export async function POST(req: Request) {
  try {
    const token = await getAuthTokenFromCookies();
    const payload = await req.json().catch(() => ({}));

    const raw =
      typeof (payload as any)?.dialogueNickname === "string"
        ? (payload as any).dialogueNickname
        : typeof (payload as any)?.nickname === "string"
          ? (payload as any).nickname
          : "";

    const dialogueNickname = String(raw).trim();

    const backendBaseUrl = ensureApiV1(getBackendBaseUrl());

    const res = await fetch(
      `${backendBaseUrl}/onboarding/dialogue-nickname`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ dialogueNickname }),
        cache: "no-store",
      },
    );

    const contentType = res.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      {
        message: "Falha ao salvar nickname (proxy).",
        hint:
          "Verifique variáveis no Vercel: DECODER_BACKEND_BASE_URL (recomendado) ou BACKEND_URL.",
      },
      { status: 502 },
    );
  }
}
