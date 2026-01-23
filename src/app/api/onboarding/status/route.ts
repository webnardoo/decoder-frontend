// src/app/api/onboarding/status/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendBaseUrl() {
  return (
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL || // fallback legado (local)
    "http://localhost:4100"
  );
}

function normalizeToken(raw: string | null | undefined) {
  const v = (raw || "").trim();
  if (!v) return "";
  return v.toLowerCase().startsWith("bearer ") ? v.slice(7).trim() : v;
}

async function getAuthTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();

  const token =
    jar.get("accessToken")?.value ||
    jar.get("token")?.value ||
    jar.get("hint_access_token")?.value ||
    jar.get("decoder_auth")?.value ||
    null;

  const normalized = normalizeToken(token);
  return normalized || null;
}

function pickJourney(data: any): string | undefined {
  const direct = data?.journey;
  if (typeof direct === "string" && direct.trim()) return direct;

  const fromUser = data?.user?.journey;
  if (typeof fromUser === "string" && fromUser.trim()) return fromUser;

  const fromMeta = data?.meta?.journey;
  if (typeof fromMeta === "string" && fromMeta.trim()) return fromMeta;

  return undefined;
}

function normalizeJourney(v: any): string | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "TRIAL") return "TRIAL";
  return null;
}

export async function GET() {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    const token = await getAuthTokenFromCookies();

    if (!token) {
      return NextResponse.json(
        { message: "Não autenticado." },
        { status: 401 }
      );
    }

    // ✅ fonte de verdade: cookie hitch_journey
    const jar = await cookies();
    const cookieJourney = normalizeJourney(
      jar.get("hitch_journey")?.value
    );

    const upstream = await fetch(
      `${backendBaseUrl}/api/v1/onboarding/status`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Cookie: `decoder_auth=${token}`,
          ...(cookieJourney ? { "x-journey": cookieJourney } : {}),
        },
        cache: "no-store",
      }
    );

    const text = await upstream.text().catch(() => "");
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return NextResponse.json(
        {
          message: "Resposta inválida do backend (não-JSON).",
          raw: text || null,
        },
        { status: 502 }
      );
    }

    // 1) tenta usar journey retornado pelo backend
    const backendJourney = pickJourney(data);

    // 2) backend > cookie
    const finalJourney =
      normalizeJourney(backendJourney) || cookieJourney;

    // promove journey sem inventar
    if (finalJourney && data && typeof data === "object") {
      data = { ...data, journey: finalJourney };
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json(
      {
        message: "Falha ao consultar onboarding status (proxy).",
        hint:
          "Verifique DECODER_BACKEND_BASE_URL / NEXT_PUBLIC_DECODER_BACKEND_BASE_URL.",
      },
      { status: 502 }
    );
  }
}
