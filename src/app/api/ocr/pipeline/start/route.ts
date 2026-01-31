import { NextResponse } from "next/server";
import { cookies } from "next/headers";

type QuickMode = "RESUMO" | "RESPONDER" | "resumo" | "responder";

function normalizeQuickMode(mode?: string): "RESUMO" | "RESPONDER" | null {
  const v = String(mode ?? "").trim().toUpperCase();
  if (v === "RESUMO") return "RESUMO";
  if (v === "RESPONDER") return "RESPONDER";
  return null;
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

  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

function join(base: string, path: string) {
  const clean = path.replace(/^\/+/, "");
  return `${base}/${clean}`;
}

/**
 * Regra técnica (proxy):
 * - Front manda: quickMode (RESUMO/RESPONDER)
 * - Backend pipeline hoje valida: actionType (ex.: ANALYZE)
 * - Então mapeamos:
 *   RESUMO     -> ANALYZE
 *   RESPONDER  -> ANALYZE   (por enquanto, até existir actionType específico no backend)
 *
 * Importante: isso elimina o erro "actionType inválido" causado por enviar RESUMO.
 */
function mapQuickModeToActionType(qm: "RESUMO" | "RESPONDER") {
  // Se no backend existir um actionType futuro (ex: REPLY), eu ajusto aqui.
  return "ANALYZE";
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    const token =
      extractJwtFromCookieValue(cookieStore.get("decoder_auth")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("token")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("accessToken")?.value || "") ||
      extractJwtFromCookieValue(cookieStore.get("jwt")?.value || "");

    if (!token) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const incoming = await req.formData();

    // Campos obrigatórios
    const relationshipType = String(incoming.get("relationshipType") ?? "").trim();
    const quickModeRaw = String(incoming.get("quickMode") ?? "").trim();
    const quickMode = normalizeQuickMode(quickModeRaw);

    // files pode vir como 1..3 (o Insomnia manda 1 por linha, o browser manda múltiplos)
    const files = incoming.getAll("files").filter(Boolean);

    if (!files.length) {
      return NextResponse.json({ error: "Payload inválido: files é obrigatório." }, { status: 400 });
    }
    if (!relationshipType) {
      return NextResponse.json({ error: "Payload inválido: relationshipType é obrigatório." }, { status: 400 });
    }
    if (!quickMode) {
      return NextResponse.json({ error: "Payload inválido: quickMode é obrigatório (RESUMO/RESPONDER)." }, { status: 400 });
    }

    // Monta FormData para o backend (com actionType válido)
    const upstreamForm = new FormData();

    for (const f of files) {
      // Mantém o File/Blob como veio
      upstreamForm.append("files", f as any);
    }

    upstreamForm.append("relationshipType", relationshipType);
    upstreamForm.append("actionType", mapQuickModeToActionType(quickMode));

    const apiV1Base = getBackendApiV1BaseUrl();
    const url = join(apiV1Base, "ocr/pipeline/start");

    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // NÃO setar Content-Type manualmente em multipart
      },
      body: upstreamForm,
      cache: "no-store",
    });

    const contentType = upstream.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const data = isJson ? await upstream.json() : await upstream.text();

    // Repassa status + payload do backend
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
