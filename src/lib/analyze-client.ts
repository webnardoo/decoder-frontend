import type { RelationshipType } from "@/lib/relationships";

export type QuickAnalyzeRequest = {
  conversation: string;
  relationshipType: RelationshipType;
};

export type QuickAnalyzeSuccess = {
  // resultado funcional do QUICK (mantém o que você já usa)
  score: { value: number; label: string };
  insights: Array<{ title: string; description: string }>;
  redFlags: Array<{ title: string; description: string }>;
  replySuggestion: string | null;
  meta: {
    messageCountApprox: number;
  };

  // contrato v1.1 (pós-consumo)
  creditsUsed: number;
  creditsBalanceAfter: number;
};

export type ApiErrorCode = "INSUFFICIENT_CREDITS" | "DEEP_MONTHLY_LIMIT_REACHED";

export class ApiError extends Error {
  status: number;
  code?: ApiErrorCode;
  payload?: any;

  constructor(args: { status: number; message: string; code?: ApiErrorCode; payload?: any }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    this.payload = args.payload;
  }
}

async function safeJson(res: Response): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Lê `mock` da URL atual (ex: /?mock=403) e repassa para a API route.
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

export async function analyzeConversation(
  input: QuickAnalyzeRequest,
): Promise<QuickAnalyzeSuccess> {
  const mockQs = getMockQueryFromBrowser();

  const res = await fetch(`/api/analyze${mockQs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (res.ok) {
    return (await res.json()) as QuickAnalyzeSuccess;
  }

  // contrato: status + payload.code
  const data = await safeJson(res);
  const code = typeof data?.code === "string" ? (data.code as ApiErrorCode) : undefined;

  if (res.status === 401) {
    throw new ApiError({
      status: 401,
      message: "Não autenticado.",
      payload: data,
    });
  }

  if (res.status === 403 && code === "INSUFFICIENT_CREDITS") {
    throw new ApiError({
      status: 403,
      code,
      message: "Créditos insuficientes.",
      payload: data,
    });
  }

  // QUICK não usa 429 por contrato, mas fallback geral existe
  throw new ApiError({
    status: res.status,
    code,
    message: "Algo não saiu como esperado. Tente novamente em instantes.",
    payload: data,
  });
}
