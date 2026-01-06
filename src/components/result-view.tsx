"use client";

import { QuickResultCard } from "@/components/quick-analysis/QuickResultCard";

/* ================================
 * Types
 * ================================ */

export type QuickModeUI = "RESUMO" | "RESPONDER";

export type ReplyIntent =
  | "apaziguar"
  | "explicar"
  | "neutro"
  | "afirmar_limite";

export type ReplySuggestionObject = {
  intent: ReplyIntent;
  text: string;
};

/**
 * Formatos aceitos (compat):
 * - Legado: Array<string | { intent, text }>
 * - Canônico (BACK): { apaziguar: string[], explicar: string[], neutro: string[], afirmar_limite: string[] }
 */
export type ReplySuggestionsPayload =
  | Array<string | ReplySuggestionObject>
  | Record<string, unknown>;

export type QuickAnalysisResponseV11 = {
  score?: { value?: number; label?: string };

  scoreExplanation?: string;
  labelExplanation?: string;

  analysis?: string;

  insights?: string[];
  redFlags?: string[];

  replySuggestions?: ReplySuggestionsPayload;

  creditsUsed?: number | null;
  creditsBalanceAfter?: number | null;

  quickId?: string;

  meta?: { messageCountApprox?: number };
};

/* ================================
 * Utils
 * ================================ */

const INTENT_LABEL: Record<ReplyIntent, string> = {
  apaziguar: "Apaziguar",
  explicar: "Explicar",
  neutro: "Neutro",
  afirmar_limite: "Afirmar limite",
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeIntent(raw: unknown): ReplyIntent {
  if (typeof raw !== "string") return "neutro";

  const s = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/__+/g, "_");

  if (s === "apaziguar") return "apaziguar";
  if (s === "explicar") return "explicar";
  if (s === "neutro" || s === "neutral") return "neutro";
  if (
    s === "afirmar_limite" ||
    s === "afirmar" ||
    s === "afirmar_limte"
  )
    return "afirmar_limite";

  return "neutro";
}

function coerceStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .filter((x) => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof v === "string") {
    const t = v.trim();
    return t ? [t] : [];
  }
  return [];
}

function normalizeReplySuggestions(
  raw: ReplySuggestionsPayload | undefined,
): ReplySuggestionObject[] {
  if (!raw) return [];

  // Caso 1: formato canônico (objeto)
  if (!Array.isArray(raw) && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;

    const intents: ReplyIntent[] = [
      "apaziguar",
      "explicar",
      "neutro",
      "afirmar_limite",
    ];

    const out: ReplySuggestionObject[] = [];

    for (const intent of intents) {
      const bucket =
        intent === "afirmar_limite"
          ? (obj["afirmar_limite"] ??
              obj["afirmar-limite"] ??
              obj["afirmarLimite"])
          : obj[intent];

      const lines = coerceStringArray(bucket);
      for (const text of lines) {
        if (text) out.push({ intent, text });
      }
    }

    return out;
  }

  // Caso 2: formato legado (array)
  const arr = raw as Array<string | ReplySuggestionObject>;

  return arr
    .map((s) => {
      if (typeof s === "string") {
        const t = s.trim();
        if (!t) return null;
        return { intent: "neutro" as ReplyIntent, text: t };
      }

      const intentNorm = normalizeIntent((s as any)?.intent);
      const text = (s as any)?.text;

      if (!isNonEmptyString(text)) return null;

      return { intent: intentNorm, text: text.trim() };
    })
    .filter(Boolean) as ReplySuggestionObject[];
}

/* ================================
 * Component
 * ================================ */

export function ResultView({
  data,
  quickMode,
}: {
  data: QuickAnalysisResponseV11;
  quickMode: QuickModeUI;
}) {
  const scoreValue = safeNumber(data?.score?.value, 0);
  const scoreLabel = isNonEmptyString(data?.score?.label)
    ? data.score!.label!.trim()
    : "";

  const scoreExplanation = isNonEmptyString(data?.scoreExplanation)
    ? data.scoreExplanation.trim()
    : "";

  const labelExplanation = isNonEmptyString(data?.labelExplanation)
    ? data.labelExplanation.trim()
    : "";

  const analysis = isNonEmptyString(data?.analysis) ? data.analysis.trim() : "";

  const insights = Array.isArray(data?.insights) ? data.insights : [];
  const redFlags = Array.isArray(data?.redFlags) ? data.redFlags : [];

  const replySuggestions = normalizeReplySuggestions(data?.replySuggestions);

  const isResumo = quickMode === "RESUMO";
  const isResponder = quickMode === "RESPONDER";

  /**
   * MVP RULE (HARD):
   * - Score aparece em RESUMO e RESPONDER
   * - Análise NÃO aparece se houver replySuggestions (kill-switch)
   * - Análise aparece APENAS em RESUMO
   */
  const canRenderScoreCard = scoreLabel.length > 0;

  const hasReplies = replySuggestions.length > 0;
  const canRenderAnalysisCard = !hasReplies && isResumo && analysis.length > 0;

  const shouldRenderResultBlock = canRenderScoreCard || canRenderAnalysisCard;

  return (
    <div className="space-y-4">
      {/* Score (RESUMO e RESPONDER) + Análise (apenas RESUMO e nunca junto com replies) */}
      {shouldRenderResultBlock && (
        <div data-tour-id="quick-result-block" className="space-y-4">
          {canRenderScoreCard && (
            <div data-tour-id="quick-score-card">
              <QuickResultCard
                scoreValue={scoreValue}
                scoreLabel={scoreLabel}
                scoreExplanation={scoreExplanation}
                labelExplanation={labelExplanation}
              />
            </div>
          )}

          {canRenderAnalysisCard && (
            <div
              className="rounded-2xl border p-4 space-y-2"
              data-tour-id="quick-analysis-card"
            >
              <div className="text-sm font-medium">Análise</div>
              <div className="text-sm leading-relaxed whitespace-pre-line">
                {analysis}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESUMO: redFlags */}
      {isResumo && redFlags.length > 0 && (
        <div className="rounded-2xl border p-4 space-y-2">
          <div className="text-sm font-medium">Red flags</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {redFlags.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* RESPONDER: insights */}
      {isResponder && insights.length > 0 && (
        <div className="rounded-2xl border p-4 space-y-2">
          <div className="text-sm font-medium">Insights</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {insights.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* RESPONDER: replySuggestions */}
      {isResponder && replySuggestions.length > 0 && (
        <div
          className="rounded-2xl border p-4 space-y-3"
          data-tour-id="quick-reply-suggestions-card"
        >
          <div className="text-sm font-medium">Sugestões de resposta</div>
          <div className="space-y-2">
            {replySuggestions.map((s, idx) => (
              <div key={idx} className="rounded-xl border p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {INTENT_LABEL[s.intent]}
                </div>
                <div className="text-sm leading-relaxed">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rodapé técnico */}
      {(data?.creditsUsed !== undefined ||
        data?.creditsBalanceAfter !== undefined ||
        data?.quickId) && (
        <div className="text-xs text-muted-foreground">
          {data?.creditsUsed !== undefined && data?.creditsUsed !== null && (
            <span>Créditos usados: {data.creditsUsed}</span>
          )}
          {data?.creditsBalanceAfter !== undefined &&
            data?.creditsBalanceAfter !== null && (
              <>
                {" · "}
                <span>Saldo: {data.creditsBalanceAfter}</span>
              </>
            )}
          {data?.quickId && (
            <>
              {" · "}
              <span>ID: {data.quickId}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ResultView;
