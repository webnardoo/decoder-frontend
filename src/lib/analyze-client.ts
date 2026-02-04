import type { RelationshipType } from "@/lib/relationships";
import type { QuickAnalysisResponseV11 } from "@/components/result-view";

export type { RelationshipType };
export type { QuickAnalysisResponseV11 };

export type QuickMode = "RESUMO" | "RESPONDER";

export type AnalyzeConversationInput = {
  text: string;
  relationshipType: RelationshipType;
  quickMode?: QuickMode; // default RESUMO
};

export type ApiError = {
  code: string;
  message: string;
  status?: number;
  payload?: any;
};

export function apiError(
  code: string,
  message: string,
  status?: number,
  payload?: any,
): ApiError {
  return { code, message, status, payload };
}

// ✅ Mensagem neutra (nunca mencionar IA, modelo, etc.)
const GENERIC_ANALYZE_FAIL = "Não foi possível concluir sua análise. Tente novamente.";

function normalizeMessage(payload: any, status: number) {
  return (
    payload?.message ??
    payload?.payload?.message ??
    payload?.error?.message ??
    payload?.error ??
    `Falha ao analisar. Status ${status}`
  );
}

/**
 * MVP RULE (HARD):
 * - Em RESPONDER (QUICK REPLY), NÃO renderizamos análise.
 * - Para garantir isso mesmo com componentes duplicados/bugs de UI,
 *   removemos `analysis` do payload no ponto de entrada (client).
 */
function stripAnalysisForReply(
  payload: QuickAnalysisResponseV11,
  quickMode: QuickMode,
): QuickAnalysisResponseV11 {
  if (quickMode !== "RESPONDER") return payload;

  const cloned: QuickAnalysisResponseV11 = { ...payload };
  delete (cloned as any).analysis;
  return cloned;
}

export async function analyzeConversation(input: AnalyzeConversationInput) {
  try {
    const quickMode: QuickMode = input.quickMode ?? "RESUMO";

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: input.text,
        relationshipType: input.relationshipType,
        quickMode,
      }),
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await res.json().catch(() => null) : await res.text();

    if (!res.ok) {
      const msg = normalizeMessage(payload, res.status);

      if (
        res.status === 403 &&
        typeof msg === "string" &&
        msg.toLowerCase().includes("créditos insuficientes")
      ) {
        return apiError("INSUFFICIENT_CREDITS", "Créditos insuficientes.", 403, payload);
      }

      if (res.status === 401) {
        // ✅ sessão expirada pode aparecer
        return apiError("UNAUTHORIZED", "Sessão expirada. Faça login novamente.", 401, payload);
      }

      if (res.status === 429) {
        return apiError("RATE_LIMIT", "Muitas tentativas. Tente novamente em instantes.", 429, payload);
      }

      if (res.status >= 500) {
        // ✅ sempre genérico
        return apiError("SERVER_ERROR", "Erro temporário do sistema. Tente novamente.", res.status, payload);
      }

      // ✅ qualquer 4xx restante: nunca mostrar msg cru do backend
      return apiError("ANALYZE_FAILED", GENERIC_ANALYZE_FAIL, res.status, payload);
    }

    const typed = payload as QuickAnalysisResponseV11;

    // MVP: RESPONDER não pode exibir análise (strip no client)
    return stripAnalysisForReply(typed, quickMode);
  } catch (e: any) {
    return apiError("ANALYZE_NETWORK_ERROR", "Não foi possível conectar ao servidor.", 0, {
      detail: e?.message ?? String(e),
    });
  }
}
