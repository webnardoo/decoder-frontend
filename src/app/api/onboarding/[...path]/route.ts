import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (!base) throw new Error("NEXT_PUBLIC_API_BASE_URL não definido");
  return base.replace(/\/+$/, "");
}

function withPath(base: string, path: string) {
  const clean = path.replace(/^\/+/, "");
  return `${base}/${clean}`;
}

async function proxy(req: NextRequest, methodOverride?: string) {
  const base = getBackendBaseUrl();

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
  // Seu env já é http://localhost:4100/api/v1
  const url = withPath(base, `onboarding/${tail}`);

  // Regra crítica: o BACK usa PATCH para dialogue-nickname
  let backendMethod = (methodOverride || req.method).toUpperCase();
  if (backendMethod === "POST" && tail === "dialogue-nickname") {
    backendMethod = "PATCH";
  }

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Cookie", `decoder_auth=${decoderAuth}`);
  headers.set("Accept", "application/json");

  let body: string | undefined = undefined;
  if (backendMethod !== "GET" && backendMethod !== "HEAD") {
    // Evita explodir em body vazio
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
