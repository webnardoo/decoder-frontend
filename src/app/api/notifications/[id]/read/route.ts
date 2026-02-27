// src/app/api/notifications/[id]/read/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendBaseUrl() {
  return (
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4100"
  ).replace(/\/+$/, "");
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

function normalizeJourney(v: any): string | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "TRIAL") return "TRIAL";
  return null;
}

/**
 * Fonte de verdade do ID: path da request.
 * Ex.: /api/notifications/<id>/read  -> id = <id>
 */
function extractIdFromPath(reqUrl: string): string {
  try {
    const url = new URL(reqUrl);
    const parts = url.pathname.split("/").filter(Boolean);

    // esperamos: ["api","notifications", "<id>", "read"]
    const idx = parts.indexOf("notifications");
    if (idx === -1) return "";

    const maybeId = parts[idx + 1] ?? "";
    const maybeRead = parts[idx + 2] ?? "";

    if (maybeRead !== "read") return "";
    return String(maybeId || "").trim();
  } catch {
    return "";
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    const token = await getAuthTokenFromCookies();

    if (!token) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    // 1) tenta params (quando o Next resolver corretamente)
    // 2) fallback determinístico: extrai do path real da request
    const rawIdFromParams = String(params?.id ?? "").trim();
    const rawIdFromPath = extractIdFromPath(req.url);

    const rawId = rawIdFromParams || rawIdFromPath;

    if (!rawId) {
      return NextResponse.json({ message: "ID de notificação inválido." }, { status: 400 });
    }

    const jar = await cookies();
    const cookieJourney = normalizeJourney(jar.get("hitch_journey")?.value);

    const id = encodeURIComponent(rawId);
    const upstreamUrl = `${backendBaseUrl}/api/v1/notifications/${id}/read`;

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        Cookie: `decoder_auth=${token}`,
        ...(cookieJourney ? { "x-journey": cookieJourney } : {}),
      },
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "PROXY_NOTIFICATION_READ_FAILED",
        message: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}