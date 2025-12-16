import type { DeepAnalysisV2 } from "@/lib/deep-analysis-contract";
import { ApiError, type ApiErrorCode } from "@/lib/analyze-client";

export type DeepMonthly = {
  limit: number;
  used: number;
  remaining: number;
  cycleRef: string; // YYYY-MM
};

export type DeepAnalyzeSuccessV11 = {
  deep: DeepAnalysisV2;

  creditsUsed: number;
  creditsBalanceAfter: number;

  deepMonthly: DeepMonthly;
};

async function safeJson(res: Response): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Lê `mock` da URL atual (ex: /conversas/ID/analisar?mock=429) e repassa para a API route.
 * Importante: só roda no browser.
 */
function getMockQueryFromBrowser(): string {
  try {
    if (typeof window === "undefined") return "";
    const v = new URLSearchParams(window.location.search).get("mock");
    if (!v) return "";
    return `?mock=${encodeURIComponent(v)}`;
  } catch {
    return "";
  }
}

/**
 * DEEP (Contrato UX v1.1)
 * POST /api/conversas/:id/deep-analysis (API route do front)
 * -> deve refletir o backend v1.3+ e devolver shape v1.1
 */
export async function fetchDeepAnalysis(conversaId: string): Promise<DeepAnalyzeSuccessV11> {
  const mockQs = getMockQueryFromBrowser();

  const res = await fetch(`/api/conversas/${conversaId}/deep-analysis${mockQs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "AUTO", forceRecompute: false }),
    cache: "no-store",
  });

  if (res.ok) {
    return (await res.json()) as DeepAnalyzeSuccessV11;
  }

  const data = await safeJson(res);
  const code = typeof data?.code === "string" ? (data.code as ApiErrorCode) : undefined;

  if (res.status === 401) {
    throw new ApiError({ status: 401, message: "Não autenticado.", payload: data });
  }

  if (res.status === 403 && code === "INSUFFICIENT_CREDITS") {
    throw new ApiError({
      status: 403,
      code,
      message: "Créditos insuficientes.",
      payload: data,
    });
  }

  if (res.status === 429 && code === "DEEP_MONTHLY_LIMIT_REACHED") {
    throw new ApiError({
      status: 429,
      code,
      message: "Limite mensal atingido.",
      payload: data,
    });
  }

  throw new ApiError({
    status: res.status,
    code,
    message: "Algo não saiu como esperado. Tente novamente em instantes.",
    payload: data,
  });
}
