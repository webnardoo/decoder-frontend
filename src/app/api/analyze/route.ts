import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type QuickMode = "RESUMO" | "RESPONDER" | "resumo" | "responder";

type AnalyzeRequestBody = {
  text?: string;
  relationshipType?: string;
  quickMode?: QuickMode;
};

function getBackendBaseUrl() {
  return (
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    "http://localhost:4100"
  );
}

function normalizeQuickMode(mode?: QuickMode) {
  if (typeof mode !== "string") return "resumo";
  const v = mode.trim().toLowerCase();
  return v === "responder" ? "responder" : "resumo";
}

function extractJwtFromCookieValue(v: string) {
  // cookie já pode ser o JWT puro
  const raw = (v || "").trim();
  if (!raw) return "";

  // se vier como "Bearer xxx"
  if (raw.toLowerCase().startsWith("bearer ")) return raw.slice(7).trim();

  // se vier como "token=xxx" ou algo parecido
  const eq = raw.indexOf("=");
  if (eq > -1 && raw.slice(0, eq).toLowerCase().includes("token")) {
    return raw.slice(eq + 1).trim();
  }

  return raw;
}

/**
 * MVP RULE (HARD):
 * - QUICK REPLY (responder) NÃO pode devolver "analysis" para o front.
 * Isso garante que nenhum componente consiga renderizar Análise no modo responder,
 * mesmo que a IA/backend ainda enviem esse campo.
 */
function stripAnalysisForResponder(payload: unknown, quickMode: "resumo" | "responder") {
  if (quickMode !== "responder") return payload;

  if (!payload || typeof payload !== "object") return payload;

  // mantém a referência segura (clona raso)
  const obj = Array.isArray(payload) ? payload : { ...(payload as Record<string, unknown>) };

  if (!Array.isArray(obj)) {
    delete (obj as any).analysis;
  }

  return obj;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeRequestBody;

    const text = String(body?.text ?? "").trim();
    const relationshipType = String(body?.relationshipType ?? "").trim();
    const quickMode = normalizeQuickMode(body?.quickMode);

    if (!text) {
      return NextResponse.json(
        { error: "Payload inválido: text é obrigatório." },
        { status: 400 }
      );
    }

    if (!relationshipType) {
      return NextResponse.json(
        { error: "Payload inválido: relationshipType é obrigatório." },
        { status: 400 }
      );
    }

    // Next (versões novas) -> cookies() é async
    const cookieStore = await cookies();

    // ✅ FIX: o login seta decoder_auth (print do Set-Cookie)
    const token =
      extractJwtFromCookieValue(cookieStore.get("decoder_auth")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("token")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("accessToken")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("jwt")?.value || "");

    if (!token) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const backendBaseUrl = getBackendBaseUrl();

    const upstream = await fetch(`${backendBaseUrl}/api/v1/quick-analysis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversation: text,
        relationshipType,
        quickMode, // "resumo" | "responder"
      }),
    });

    const contentType = upstream.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await upstream.json() : await upstream.text();

    // MVP: remove analysis no modo responder antes de retornar ao front
    const patched = isJson ? stripAnalysisForResponder(data, quickMode) : data;

    return NextResponse.json(patched, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { error: "Falha ao processar requisição." },
      { status: 500 }
    );
  }
}
