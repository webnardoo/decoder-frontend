import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function normalizeBaseUrl(raw: string) {
  return String(raw || "").trim().replace(/\/+$/, "");
}

function pickBackendBaseUrl() {
  // Ordem: server-only > fallback local
  const base =
    process.env.BACKEND_URL || // ✅ teu setup local usa isso
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4100"; // ✅ fallback dev

  return normalizeBaseUrl(base);
}

function ensureApiV1(base: string) {
  if (!base) return "";
  if (base.endsWith("/api/v1")) return base;
  return `${base}/api/v1`;
}

async function getAuthTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  const token =
    jar.get("decoder_auth")?.value ||
    jar.get("accessToken")?.value ||
    jar.get("token")?.value ||
    jar.get("hint_access_token")?.value ||
    null;

  return token ? String(token).trim() : null;
}

async function handler(req: Request) {
  try {
    const token = await getAuthTokenFromCookies();
    if (!token) {
      return NextResponse.json(
        { message: "UNAUTHORIZED: missing auth cookie" },
        { status: 401 },
      );
    }

    const payload = await req.json().catch(() => ({}));
    const raw =
      typeof (payload as any)?.dialogueNickname === "string"
        ? (payload as any).dialogueNickname
        : typeof (payload as any)?.nickname === "string"
          ? (payload as any).nickname
          : "";

    const dialogueNickname = String(raw).trim();
    if (!dialogueNickname) {
      return NextResponse.json(
        { message: "dialogueNickname é obrigatório" },
        { status: 400 },
      );
    }

    const base = pickBackendBaseUrl();
    const api = ensureApiV1(base);

    const res = await fetch(`${api}/onboarding/dialogue-nickname`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ dialogueNickname }),
      cache: "no-store",
    });

    const ct = res.headers.get("content-type") ?? "";
    const body = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    return NextResponse.json(body as any, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      {
        message: "SIGNUP_DIALOGUE_NICKNAME_PROXY_FAILED",
        detail: typeof e?.message === "string" ? e.message : "unknown",
      },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  return handler(req);
}

export async function PATCH(req: Request) {
  return handler(req);
}
