"use client";

import { QuickResultCard } from "@/components/quick-analysis/QuickResultCard";

/* ================================
 * Types
 * ================================ */

export type QuickModeUI = "RESUMO" | "RESPONDER";

export type ReplyIntent = "apaziguar" | "explicar" | "neutro" | "afirmar_limite";

export type ReplySuggestionObject = {
  intent: ReplyIntent;
  text: string;
};

export type QuickAnalysisResponseV11 = {
  score?: { value?: number; label?: string };

  scoreExplanation?: string;
  labelExplanation?: string;

  analysis?: string;

  insights?: string[];

  redFlags?: string[];

  replySuggestions?: Array<string | ReplySuggestionObject>;

  creditsUsed?: number;
  creditsBalanceAfter?: number;

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
  if (s === "afirmar_limite" || s === "afirmar") return "afirmar_limite";

  return "neutro";
}

function normalizeReplySuggestions(
  raw: Array<string | ReplySuggestionObject>
): ReplySuggestionObject[] {
  return raw
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

  const canRenderQuickCard =
    scoreLabel.length > 0 &&
    scoreExplanation.length > 0 &&
    labelExplanation.length > 0;

  const analysis = isNonEmptyString(data?.analysis) ? data.analysis.trim() : "";

  const insights = Array.isArray(data?.insights) ? data.insights : [];
  const redFlags = Array.isArray(data?.redFlags) ? data.redFlags : [];

  const replySuggestionsRaw = Array.isArray(data?.replySuggestions)
    ? data.replySuggestions
    : [];
  const replySuggestions = normalizeReplySuggestions(replySuggestionsRaw);

  const isResumo = quickMode === "RESUMO";
  const isResponder = quickMode === "RESPONDER";

  return (
    <div className="space-y-4">
      {/* CARD RESULTADO — invariável entre modos */}
      {canRenderQuickCard && (
        <QuickResultCard
          scoreValue={scoreValue}
          scoreLabel={scoreLabel}
          scoreExplanation={scoreExplanation}
          labelExplanation={labelExplanation}
        />
      )}

      {/* RESUMO */}
      {isResumo && analysis.length > 0 && (
        <div className="rounded-2xl border p-4 space-y-2">
          <div className="text-sm font-medium">Análise</div>
          <div className="text-sm leading-relaxed whitespace-pre-line">
            {analysis}
          </div>
        </div>
      )}

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

      {/* RESPONDER: Insights devem vir ANTES das sugestões */}
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

      {isResponder && replySuggestions.length > 0 && (
        <div className="rounded-2xl border p-4 space-y-3">
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
          {data?.creditsUsed !== undefined && (
            <span>Créditos usados: {data.creditsUsed}</span>
          )}
          {data?.creditsBalanceAfter !== undefined && (
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
