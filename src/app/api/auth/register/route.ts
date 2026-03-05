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

function firstIpFromXff(xff?: string | null) {
  const v = (xff ?? "").trim();
  if (!v) return "";
  return v.split(",")[0]?.trim() ?? "";
}

function getEnvPixelId() {
  return (process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();
}

function getEnvAccessToken() {
  return (process.env.META_CAPI_ACCESS_TOKEN ?? process.env.META_CAPI_TOKEN ?? "").trim();
}

function getEnvTestEventCode() {
  return (process.env.META_CAPI_TEST_EVENT_CODE ?? "").trim();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function postJsonWithRetry(
  url: string,
  payload: any,
  attempts: number,
  baseDelayMs: number,
) {
  let last: any = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const traceId = res.headers.get("x-fb-trace-id") ?? res.headers.get("x-fb-debug") ?? "";
      const text = await res.text().catch(() => "");

      // sucesso
      if (res.ok) {
        return { ok: true, status: res.status, traceId, body: text };
      }

      // erro 4xx: não adianta retry (token/payload/perm)
      if (res.status >= 400 && res.status < 500) {
        return { ok: false, status: res.status, traceId, body: text };
      }

      // 5xx: retry
      last = { ok: false, status: res.status, traceId, body: text };
    } catch (err: any) {
      last = { ok: false, status: 0, traceId: "", body: err?.message ?? String(err) };
    }

    // backoff curto
    if (i < attempts - 1) {
      const delay = baseDelayMs * Math.pow(2, i);
      await sleep(delay);
    }
  }

  return last ?? { ok: false, status: 0, traceId: "", body: "unknown error" };
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
  const PIXEL_ID = getEnvPixelId();
  const TOKEN = getEnvAccessToken();
  const TEST_EVENT_CODE = getEnvTestEventCode();

  if (!PIXEL_ID || !TOKEN) {
    console.warn("[CAPI] pixel/token ausente", {
      hasPixel: !!PIXEL_ID,
      hasToken: !!TOKEN,
    });
    return;
  }

  const ip =
    firstIpFromXff(req.headers.get("x-forwarded-for")) ||
    (req.headers.get("x-real-ip") ?? "").trim();

  const ua = (req.headers.get("user-agent") ?? "").trim();

  const event = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: crypto.randomUUID(),
        action_source: "website",
        event_source_url: String(track?.landing_url ?? ""),

        user_data: {
          em: [sha256(email)],
          client_ip_address: ip || undefined,
          client_user_agent: ua || undefined,
          fbp: track?.fbp ?? undefined,
          fbc: track?.fbc ?? undefined,
        },

        custom_data: {
          utm_source: track?.utm_source ?? undefined,
          utm_medium: track?.utm_medium ?? undefined,
          utm_campaign: track?.utm_campaign ?? undefined,
          utm_content: track?.utm_content ?? undefined,
          utm_term: track?.utm_term ?? undefined,
          utm_id: track?.utm_id ?? undefined,
        },
      },
    ],

    // ✅ garante visibilidade no Events Manager (Eventos de teste)
    ...(TEST_EVENT_CODE ? { test_event_code: TEST_EVENT_CODE } : {}),
  };

  const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(
    TOKEN,
  )}`;

  const r = await postJsonWithRetry(url, event, 3, 500);

  if (!r?.ok) {
    console.error("[CAPI] Lead send failed", {
      status: r?.status,
      traceId: r?.traceId,
      body: r?.body,
    });
    return;
  }

  console.log("[CAPI] Lead sent", {
    status: r.status,
    traceId: r.traceId,
  });
}

export async function POST(req: NextRequest) {
  const baseUrl = getBaseUrl();

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

    // ======================================
    // DISPARO DO LEAD (Meta CAPI)
    // ======================================
    try {
      const body = JSON.parse(bodyText || "{}");
      const email = body?.email;

      const trackRaw = req.cookies.get("hitch_track")?.value;
      const track = parseTrackCookie(trackRaw);

      if (email) {
        await sendLeadEvent({ email, track, req });
      } else {
        console.warn("[CAPI] Lead skipped: email ausente no body");
      }
    } catch (err: any) {
      console.warn("[CAPI] Lead skipped (exception)", {
        message: err?.message ?? String(err),
      });
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