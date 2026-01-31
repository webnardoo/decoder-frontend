import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function extractJwtFromCookieValue(v: string) {
  const raw = (v || "").trim();
  if (!raw) return "";

  if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim();

  const eq = raw.indexOf("=");
  if (eq > -1 && raw.slice(0, eq).toLowerCase().includes("token")) {
    return raw.slice(eq + 1).trim();
  }

  return raw;
}

function getBackendApiV1BaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4100";

  const base = String(raw || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("Backend base URL não definido");

  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

function join(base: string, path: string) {
  const clean = path.replace(/^\/+/, "");
  return `${base}/${clean}`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pipelineId = String(url.searchParams.get("pipelineId") ?? "").trim();

    if (!pipelineId) {
      return NextResponse.json({ error: "pipelineId é obrigatório." }, { status: 400 });
    }

    const cookieStore = await cookies();

    const token =
      extractJwtFromCookieValue(cookieStore.get("decoder_auth")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("token")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("accessToken")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("jwt")?.value || "");

    if (!token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const apiV1Base = getBackendApiV1BaseUrl();
    const upstreamUrl = join(apiV1Base, `ocr/pipeline/${encodeURIComponent(pipelineId)}`);

    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await upstream.json() : await upstream.text();

    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Falha ao processar requisição.",
        detail: String(err?.message || err || "unknown"),
      },
      { status: 500 },
    );
  }
}
