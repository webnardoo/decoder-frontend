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

export function apiError(code: string, message: string, status?: number, payload?: any): ApiError {
  return { code, message, status, payload };
}

function normalizeMessage(payload: any, status: number) {
  return (
    payload?.message ??
    payload?.payload?.message ??
    payload?.error?.message ??
    payload?.error ??
    `Falha ao analisar. Status ${status}`
  );
}

export async function analyzeConversation(input: AnalyzeConversationInput) {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: input.text,
        relationshipType: input.relationshipType,
        quickMode: input.quickMode ?? "RESUMO",
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
        return apiError("UNAUTHORIZED", String(msg), 401, payload);
      }

      if (res.status === 429) {
        return apiError("RATE_LIMIT", String(msg), 429, payload);
      }

      if (res.status >= 500) {
        return apiError("SERVER_ERROR", String(msg), res.status, payload);
      }

      return apiError("ANALYZE_FAILED", String(msg), res.status, payload);
    }

    return payload as QuickAnalysisResponseV11;
  } catch (e: any) {
    return apiError("ANALYZE_NETWORK_ERROR", "Não foi possível conectar ao servidor.", 0, {
      detail: e?.message ?? String(e),
    });
  }
}
