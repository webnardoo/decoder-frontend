// src/app/api/v1/billing/addons/asaas/pix/[paymentId]/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function safeBaseForDebug(base: string): string {
  try {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  } catch {
    return base;
  }
}

function getBackendBaseUrl(): {
  base: string;
  source: "BACKEND_URL" | "NEXT_PUBLIC_API_BASE_URL" | "fallback";
} {
  const aRaw = String(process.env.BACKEND_URL || "").trim();
  const bRaw = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();

  const a = aRaw.replace(/\/$/, "");
  const b = bRaw.replace(/\/$/, "");

  if (a) return { base: a, source: "BACKEND_URL" };
  if (b) return { base: b, source: "NEXT_PUBLIC_API_BASE_URL" };

  return { base: "http://localhost:4100", source: "fallback" };
}

function pickHeaders(req: Request): HeadersInit {
  const cookie = req.headers.get("cookie") || "";
  const accept = req.headers.get("accept") || "application/json";

  const h: Record<string, string> = { Accept: accept };
  if (cookie) h.Cookie = cookie;
  return h;
}

function withStep(payload: any, step: string, extra?: any) {
  return {
    ...payload,
    debug: {
      ...(payload?.debug || {}),
      step,
      ...(extra || {}),
    },
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ paymentId: string }> }
) {
  const { base, source } = getBackendBaseUrl();

  // ✅ timeout curto pra evitar “function hanging”
  const controller = new AbortController();
  const timeoutMs = 10_000;
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);

  try {
    const { paymentId } = await ctx.params;
    const pid = String(paymentId || "").trim();
    if (!pid) {
      return NextResponse.json(
        withStep({ ok: false, error: "paymentId_required" }, "validate_params"),
        { status: 400, headers: { "x-debug-step": "validate_params" } }
      );
    }

    const url = `${base}/api/v1/billing/asaas/pix/${encodeURIComponent(pid)}`;

    const res = await fetch(url, {
      method: "GET",
      headers: pickHeaders(req),
      cache: "no-store",
      signal: controller.signal,
    });

    const contentType = res.headers.get("content-type") || "";
    const status = res.status;

    // ⚠️ lê como text primeiro pra medir tamanho e evitar crashes em json()
    const raw = await res.text().catch(() => "");
    const rawBytes = raw.length;

    // se vier JSON, tenta parsear
    if (contentType.includes("application/json")) {
      const data = (() => {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      })();

      return NextResponse.json(
        data,
        {
          status,
          headers: {
            "x-debug-step": "return_json",
            "x-debug-base": safeBaseForDebug(base),
            "x-debug-base-source": source,
            "x-debug-raw-bytes": String(rawBytes),
          },
        }
      );
    }

    // fallback não-json
    return new NextResponse(raw, {
      status,
      headers: {
        "content-type": contentType || "text/plain; charset=utf-8",
        "x-debug-step": "return_text",
        "x-debug-base": safeBaseForDebug(base),
        "x-debug-base-source": source,
        "x-debug-raw-bytes": String(rawBytes),
      },
    });
  } catch (e: any) {
    const msg = String(e?.message || e || "unknown");
    const aborted = msg.includes("aborted") || msg.includes("timeout");

    return NextResponse.json(
      withStep(
        {
          ok: false,
          error: aborted ? "proxy_timeout" : "proxy_failed",
          message: msg,
          baseHost: safeBaseForDebug(base),
          baseSource: source,
          nodeEnv: String(process.env.NODE_ENV || ""),
        },
        "catch"
      ),
      {
        status: aborted ? 504 : 502,
        headers: {
          "x-debug-step": "catch",
          "x-debug-base": safeBaseForDebug(base),
          "x-debug-base-source": source,
        },
      }
    );
  } finally {
    clearTimeout(timeout);
  }
}