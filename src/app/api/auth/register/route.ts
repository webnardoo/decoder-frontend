/*src/app/api/auth/register/route.ts*/
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeBaseUrl(raw?: string) {
  const v = (raw ?? "").trim();
  if (!v) return null;
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

function getBaseUrl() {
  const prd = normalizeBaseUrl(process.env.BACKEND_URL);
  if (prd) return prd;

  const dev =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_HITCH_BACKEND_BASE_URL);

  if (dev) return dev;

  return "http://localhost:4100";
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

function parseTrackCookie(raw?: string) {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

function getClientIp(req: NextRequest) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() ?? "";
  return req.headers.get("x-real-ip")?.trim() ?? "";
}

function getMetaPixelId() {
  // Preferimos server env, mas mantemos compat com seu setup atual no Vercel
  return (
    (process.env.META_PIXEL_ID ?? "").trim() ||
    (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim() ||
    null
  );
}

function getMetaCapiToken() {
  // Preferimos META_CAPI_ACCESS_TOKEN (o que você já tem),
  // mas aceitamos META_CAPI_TOKEN por compatibilidade
  return (
    (process.env.META_CAPI_ACCESS_TOKEN ?? "").trim() ||
    (process.env.META_CAPI_TOKEN ?? "").trim() ||
    null
  );
}

function getMetaTestEventCode() {
  const v = (process.env.META_CAPI_TEST_EVENT_CODE ?? "").trim();
  return v || null;
}

async function sendLeadEvent({
  email,
  track,
  req,
}: {
  email: string;
  track: any;
  req: NextRequest;
}) {
  const PIXEL_ID = getMetaPixelId();
  const TOKEN = getMetaCapiToken();
  const TEST_EVENT_CODE = getMetaTestEventCode();

  if (!PIXEL_ID || !TOKEN) {
    console.warn("[CAPI] env ausente", {
      hasPixelId: !!PIXEL_ID,
      hasToken: !!TOKEN,
      hasTestEventCode: !!TEST_EVENT_CODE,
    });
    return;
  }

  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? "";

  const eventId = crypto.randomUUID();

  const payload: any = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: track?.landing_url ?? "",
        user_data: {
          em: [sha256(email)],
          client_ip_address: ip,
          client_user_agent: ua,
          fbp: track?.fbp ?? undefined,
          fbc: track?.fbc ?? undefined,
        },
        custom_data: {
          utm_source: track?.utm_source ?? undefined,
          utm_medium: track?.utm_medium ?? undefined,
          utm_campaign: track?.utm_campaign ?? undefined,
          utm_content: track?.utm_content ?? undefined,
          utm_term: track?.utm_term ?? undefined,
        },
      },
    ],
  };

  if (TEST_EVENT_CODE) {
    payload.test_event_code = TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(
    TOKEN
  )}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      console.error("[CAPI] Lead send failed", {
        status: res.status,
        body: text,
      });
      return;
    }

    // Log mínimo para debug em HML sem vazar dados sensíveis
    console.log("[CAPI] Lead sent", {
      eventId,
      hasTrack: !!track,
      hasFbp: !!track?.fbp,
      hasFbc: !!track?.fbc,
      hasTestEventCode: !!TEST_EVENT_CODE,
    });
  } catch (err) {
    console.error("[CAPI] Lead send failed (network/runtime)", err);
  }
}

export async function POST(req: NextRequest) {
  const baseUrl = getBaseUrl();

  const isProd = process.env.NODE_ENV === "production";
  if (isProd && !normalizeBaseUrl(process.env.BACKEND_URL)) {
    console.error("[/api/auth/register] BACKEND_URL ausente em runtime (production).");
    return NextResponse.json(
      { message: "Configuração ausente: BACKEND_URL não está definida em PRD." },
      { status: 500 }
    );
  }

  if (!/^https?:\/\//i.test(baseUrl)) {
    console.error("[/api/auth/register] BACKEND_URL inválida:", baseUrl);
    return NextResponse.json(
      { message: "Configuração inválida: BACKEND_URL deve começar com http(s)://." },
      { status: 500 }
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
        { status: upstream.status }
      );
    }

    /**
     * ======================================
     * DISPARO DO LEAD (Meta CAPI)
     * ======================================
     */
    try {
      const body = JSON.parse(bodyText || "{}");
      const email = body?.email;

      const trackRaw = req.cookies.get("hitch_track")?.value;
      const track = parseTrackCookie(trackRaw);

      if (email) {
        await sendLeadEvent({ email, track, req });
      }
    } catch (err) {
      console.warn("[CAPI] Lead skipped", err);
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
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}