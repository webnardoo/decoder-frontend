import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type QuickMode = "RESUMO" | "RESPONDER" | "resumo" | "responder";

type AnalyzeRequestBody = {
  text?: string;
  relationshipType?: string;
  quickMode?: QuickMode;
};

function normalizeQuickMode(mode?: QuickMode) {
  if (typeof mode !== "string") return "resumo";
  const v = mode.trim().toLowerCase();
  return v === "responder" ? "responder" : "resumo";
}

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

/**
 * Base CANÔNICA (PRD):
 * - usa NEXT_PUBLIC_API_BASE_URL quando existir (normalmente termina em /api/v1)
 * - senão cai nos fallbacks legados
 * - garante que SEMPRE termina em /api/v1 (uma vez só)
 */
function getBackendApiV1BaseUrl() {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4100";

  const base = String(raw || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("Backend base URL não definido");

  // Se já termina com /api/v1, ok. Se não, adiciona.
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

function join(base: string, path: string) {
  const clean = path.replace(/^\/+/, "");
  return `${base}/${clean}`;
}

/**
 * MVP RULE (HARD):
 * - QUICK REPLY (responder) NÃO pode devolver "analysis" para o front.
 */
function stripAnalysisForResponder(payload: unknown, quickMode: "resumo" | "responder") {
  if (quickMode !== "responder") return payload;
  if (!payload || typeof payload !== "object") return payload;

  const obj = Array.isArray(payload) ? payload : { ...(payload as Record<string, unknown>) };
  if (!Array.isArray(obj)) delete (obj as any).analysis;

  return obj;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeRequestBody;

    const text = String(body?.text ?? "").trim();
    const relationshipType = String(body?.relationshipType ?? "").trim();
    const quickMode = normalizeQuickMode(body?.quickMode);

    if (!text) return NextResponse.json({ error: "Payload inválido: text é obrigatório." }, { status: 400 });
    if (!relationshipType)
      return NextResponse.json({ error: "Payload inválido: relationshipType é obrigatório." }, { status: 400 });

    const cookieStore = await cookies();

    const token =
      extractJwtFromCookieValue(cookieStore.get("decoder_auth")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("token")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("accessToken")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("jwt")?.value || "");

    if (!token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const apiV1Base = getBackendApiV1BaseUrl();
    const url = join(apiV1Base, "quick-analysis");

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversation: text,
        relationshipType,
        quickMode,
      }),
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await upstream.json() : await upstream.text();

    const patched = isJson ? stripAnalysisForResponder(data, quickMode) : data;

    return NextResponse.json(patched, { status: upstream.status });
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
