import { NextRequest, NextResponse } from "next/server";
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
    "";

  const normalized = normalizeBaseUrl(base);

  if (!normalized) return null;
  return normalized;
}

function ensureApiV1(base: string) {
  // Se já vier com /api/v1 no final, mantém.
  if (base.endsWith("/api/v1")) return base;
  // Se vier com /api/v1/ em algum ponto final, normaliza.
  if (base.endsWith("/api/v1/")) return base.replace(/\/+$/, "");
  // Caso padrão: adiciona /api/v1
  return `${base}/api/v1`;
}

function withPath(base: string, path: string) {
  const clean = path.replace(/^\/+/, "");
  return `${base}/${clean}`;
}

async function proxy(req: NextRequest, methodOverride?: string) {
  const baseRaw = getBackendBaseUrl();
  if (!baseRaw) {
    return NextResponse.json(
      {
        message: "Configuração inválida: backend base URL não definida no Vercel.",
        hint:
          "Defina uma destas variáveis no Vercel (Production): DECODER_BACKEND_BASE_URL ou BACKEND_URL (fallback).",
      },
      { status: 500 },
    );
  }

  const apiBase = ensureApiV1(baseRaw);

  // /api/onboarding/<...path>
  const segments = req.nextUrl.pathname.split("/").filter(Boolean);
  const onboardingIdx = segments.indexOf("onboarding");
  const rest = onboardingIdx >= 0 ? segments.slice(onboardingIdx + 1) : [];
  const tail = rest.join("/");

  const cookieStore = await cookies();
  const decoderAuth = cookieStore.get("decoder_auth")?.value;

  if (!decoderAuth) {
    return NextResponse.json(
      { message: "Unauthorized", statusCode: 401 },
      { status: 401 },
    );
  }

  // BACK CANÔNICO: /api/v1/onboarding/<tail>
  const url = withPath(apiBase, `onboarding/${tail}`);

  // Regra crítica: o BACK usa PATCH para dialogue-nickname
  let backendMethod = (methodOverride || req.method).toUpperCase();
  if (backendMethod === "POST" && tail === "dialogue-nickname") {
    backendMethod = "PATCH";
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  // Compatibilidade máxima: manda cookie E bearer
  headers.set("Cookie", `decoder_auth=${decoderAuth}`);
  headers.set("Authorization", `Bearer ${decoderAuth}`);

  let body: string | undefined = undefined;
  if (backendMethod !== "GET" && backendMethod !== "HEAD") {
    const text = await req.text();
    body = text && text.length > 0 ? text : "{}";
  }

  const resp = await fetch(url, {
    method: backendMethod,
    headers,
    body,
    cache: "no-store",
  });

  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const json = await resp.json().catch(() => ({}));
    return NextResponse.json(json, { status: resp.status });
  }

  const text = await resp.text();
  return new NextResponse(text, { status: resp.status });
}

export async function GET(req: NextRequest) {
  return proxy(req);
}

export async function POST(req: NextRequest) {
  return proxy(req);
}

export async function PATCH(req: NextRequest) {
  return proxy(req);
}
