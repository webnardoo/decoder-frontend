import { apiError, ApiError } from "./analyze-client";

/**
 * Shape usado na UI (conversa/[id]/page.tsx):
 * - deep: análise profunda (DeepAnalysisV2)
 * - creditsUsed / creditsBalanceAfter
 * - deepMonthly: { limit, used, remaining, cycleRef }
 */
export type DeepAnalyzeSuccessV11 = {
  deep: any;
  creditsUsed: number;
  creditsBalanceAfter: number;
  deepMonthly: {
    limit: number;
    used: number;
    remaining: number;
    cycleRef: string;
  };
};

/**
 * Contract: chama API Route do Next que faz proxy pro backend real.
 * Observação: esta rota precisa existir no Front:
 *   POST /api/conversas/[id]/deep
 */
export async function fetchDeepAnalysis(
  conversationId: string
): Promise<DeepAnalyzeSuccessV11> {
  const res = await fetch(`/api/conversas/${conversationId}/deep`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    // Padroniza em ApiError e joga no catch da UI
    const backendCode = (payload as any)?.code as any;

    if (res.status === 401) {
      throw apiError("UNAUTHORIZED", "Não autorizado.", 401, payload);
    }

    if (res.status === 403) {
      // pode ser créditos insuficientes
      if (backendCode === "INSUFFICIENT_CREDITS") {
        throw apiError(
          "INSUFFICIENT_CREDITS",
          "Créditos insuficientes.",
          403,
          payload
        );
      }
      throw apiError("FORBIDDEN", "Acesso negado.", 403, payload);
    }

    if (res.status === 429) {
      // limite mensal DEEP
      if (backendCode === "DEEP_MONTHLY_LIMIT_REACHED") {
        throw apiError(
          "DEEP_MONTHLY_LIMIT_REACHED",
          "Limite mensal de análises profundas atingido.",
          429,
          payload
        );
      }
      throw apiError("RATE_LIMITED", "Muitas requisições.", 429, payload);
    }

    throw apiError(
      "BACKEND_ERROR",
      "Falha ao executar análise profunda.",
      res.status,
      payload
    );
  }

  return payload as DeepAnalyzeSuccessV11;
}

/**
 * Compat: mantém o nome antigo usado em outras telas que eu mesmo introduzi.
 * Retorna ApiError no union (não lança).
 */
type DeepSuccess = { data: DeepAnalyzeSuccessV11 };

export async function runDeepAnalysis(
  conversationId: string
): Promise<DeepSuccess | ApiError> {
  try {
    const data = await fetchDeepAnalysis(conversationId);
    return { data };
  } catch (e: any) {
    // fetchDeepAnalysis lança ApiError via apiError(...)
    if (e && typeof e === "object" && typeof e.code === "string") {
      return e as ApiError;
    }

    return apiError(
      "INTERNAL_ERROR",
      "Erro inesperado ao executar análise profunda.",
      500,
      e?.message ?? String(e)
    );
  }
}
