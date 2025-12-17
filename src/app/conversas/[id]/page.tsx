"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getConversa,
  listConversaAnalyses,
  computeTrend,
  sumCreditsUsed,
  type ConversaAnalysis,
} from "@/lib/conversas";
import { getStateLabel } from "@/lib/objectives";

import { fetchDeepAnalysis, type DeepAnalyzeSuccessV11 } from "@/lib/deep-analysis-client";
import type { DeepAnalysisV2 } from "@/lib/deep-analysis-contract";
import { ApiError } from "@/lib/analyze-client";
import { fetchPlanContext, type PlanContext } from "@/lib/subscriptions-context";

const MIN_ANALYSES_FOR_DEEP = 5;
const HISTORY_LIMIT = 5; // usado só para decidir se ativa scroll interno

// mesma chave usada na página /profunda (reuso do storage)
const KEY_DEEP_PREFIX = "decoder.deep.v1.";

function saveLastDeep(conversaId: string, payload: DeepAnalyzeSuccessV11) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${KEY_DEEP_PREFIX}${conversaId}`, JSON.stringify(payload));
  } catch {
    // silencioso
  }
}

function loadLastDeep(conversaId: string): DeepAnalyzeSuccessV11 | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(`${KEY_DEEP_PREFIX}${conversaId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeepAnalyzeSuccessV11;
    if (!parsed?.deep) return null;
    return parsed;
  } catch {
    return null;
  }
}

type DeepState =
  | "IDLE"
  | "LOADING_DEEP"
  | "SUCCESS_DEEP"
  | "BLOCKED_DEEP_LIMIT"
  | "BLOCKED_INSUFFICIENT"
  | "UNAUTH"
  | "ERROR";

type ImpactItem = DeepAnalysisV2["messageImpacts"][number];
type PatternItem = DeepAnalysisV2["patterns"][number];
type RiskItem = DeepAnalysisV2["risks"][number];
type RecItem = DeepAnalysisV2["recommendations"][number];

export default function ConversaDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [conversaName, setConversaName] = useState("");
  const [meta, setMeta] = useState("");
  const [analyses, setAnalyses] = useState<ConversaAnalysis[]>([]);

  // ---- BLOCO 2 (DEEP persistida) ----
  const [planContext, setPlanContext] = useState<PlanContext | null>(null);

  const [deepState, setDeepState] = useState<DeepState>("IDLE");
  const [deepLoading, setDeepLoading] = useState(false);

  const [deepPayload, setDeepPayload] = useState<DeepAnalyzeSuccessV11 | null>(null);
  const [deep, setDeep] = useState<DeepAnalysisV2 | null>(null);

  const [deepLimitPayload, setDeepLimitPayload] = useState<{ cycleRef: string } | null>(null);
  const [deepError, setDeepError] = useState<string | null>(null);

  useEffect(() => {
    const c = getConversa(id);
    if (!c) return;

    setConversaName(c.name);
    setMeta(
      `${c.goal.area} • ${getStateLabel(
        c.goal.area,
        c.goal.currentStateId,
        "current",
      )} → ${getStateLabel(c.goal.area, c.goal.desiredStateId, "desired")}`,
    );

    const list = listConversaAnalyses(id);
    setAnalyses(list);

    // ao entrar na conversa: reabre a última DEEP persistida (sem custo)
    const last = loadLastDeep(id);
    if (last) {
      setDeepPayload(last);
      setDeep(last.deep);
      setDeepState("SUCCESS_DEEP");
    } else {
      setDeepPayload(null);
      setDeep(null);
      setDeepState("IDLE");
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ctx = await fetchPlanContext();
        if (!alive) return;
        setPlanContext(ctx);
      } catch {
        if (!alive) return;
        setPlanContext(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const trend = useMemo(() => computeTrend(analyses), [analyses]);
  const canDeepByMin = analyses.length >= MIN_ANALYSES_FOR_DEEP;

  const trendPercentLabel =
    trend.percent == null
      ? ""
      : ` (${trend.percent > 0 ? "+" : ""}${trend.percent}%)`;

  const creditsTotal = useMemo(() => sumCreditsUsed(analyses), [analyses]);

  // ✅ ORION: exibir todas as análises; se >5, scroll interno.
  const visibleAnalyses = useMemo(() => analyses, [analyses]);
  const hasMoreThan5 = analyses.length > HISTORY_LIMIT;

  async function runDeep() {
    if (deepLoading) return;

    setDeepState("LOADING_DEEP");
    setDeepLoading(true);
    setDeepError(null);
    setDeepLimitPayload(null);

    try {
      const data = await fetchDeepAnalysis(id); // consome apenas por ação explícita
      setDeepPayload(data);
      setDeep(data.deep);
      setDeepState("SUCCESS_DEEP");
      saveLastDeep(id, data);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          setDeepState("UNAUTH");
          setDeepError("Não autenticado.");
          return;
        }

        if (e.status === 403 && e.code === "INSUFFICIENT_CREDITS") {
          setDeepState("BLOCKED_INSUFFICIENT");
          return;
        }

        if (e.status === 429 && e.code === "DEEP_MONTHLY_LIMIT_REACHED") {
          const cycleRef =
            typeof e.payload?.cycleRef === "string" ? e.payload.cycleRef : "";
          setDeepLimitPayload({ cycleRef });
          setDeepState("BLOCKED_DEEP_LIMIT");
          return;
        }
      }

      setDeepState("ERROR");
      setDeepError("Algo não saiu como esperado. Tente novamente em instantes.");
    } finally {
      setDeepLoading(false);
    }
  }

  const isUnlimited = planContext?.isUnlimited === true;

  // ---- dados derivados do DEEP (mesma UI do /profunda atual) ----
  const scorePrev = deep?.score.previous ?? 0;
  const scoreCur = deep?.score.current ?? 0;
  const scoreDelta = deep?.score.delta ?? 0;

  const deltaBadge =
    scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta < 0 ? `${scoreDelta}` : "0";

  const deltaClass =
    scoreDelta > 0
      ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-200"
      : scoreDelta < 0
      ? "bg-red-950/30 border-red-800/40 text-red-200"
      : "bg-zinc-900/40 border-zinc-800 text-zinc-200";

  const confidence = deep?.summary.confidenceLevel ?? 0;

  return (
    <div className="space-y-6">
      {/* HEADER DA CONVERSA */}
      <div className="flex justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold truncate">{conversaName}</h1>
          <p className="text-sm text-zinc-400">{meta}</p>
          <p className="text-xs text-zinc-500 mt-1">
            Créditos consumidos nesta conversa:{" "}
            <span className="text-zinc-300">
              {creditsTotal == null ? "—" : creditsTotal}
            </span>
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-lg font-semibold">{trend.arrow}</div>
          <div className="text-xs text-zinc-500">
            {trend.note}
            {trendPercentLabel}
          </div>
        </div>
      </div>

      {/* =========================================================
          BLOCO 1 — Histórico (Topo) | ORION
          - mostra só metadados
          - mostra todas as análises
          - se >5, scroll interno
      ========================================================= */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-primary" href={`/conversas/${id}/analisar`}>
            Fazer análise
          </Link>

          {canDeepByMin ? (
            <button className="btn btn-primary" type="button" onClick={runDeep} disabled={deepLoading}>
              Análise profunda
            </button>
          ) : (
            <button
              className="btn opacity-50 cursor-not-allowed"
              disabled
              title={`Disponível após ${MIN_ANALYSES_FOR_DEEP} análises`}
            >
              Análise profunda
            </button>
          )}

          <Link className="btn" href="/conversas">
            Voltar
          </Link>
        </div>

        <div
          className={
            hasMoreThan5
              ? "max-h-[260px] overflow-y-auto rounded-xl border border-zinc-800"
              : "rounded-xl border border-zinc-800"
          }
        >
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Msgs</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-left">Label</th>
                <th className="px-3 py-2 text-left">Créditos</th>
              </tr>
            </thead>
            <tbody>
              {visibleAnalyses.map((a) => (
                <tr key={a.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{a.messageCountApprox}</td>
                  <td className="px-3 py-2">{a.score ?? "—"}</td>
                  <td className="px-3 py-2">{a.label ?? "—"}</td>
                  <td className="px-3 py-2">{a.creditsUsed ?? "—"}</td>
                </tr>
              ))}

              {analyses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-zinc-500">
                    Nenhuma análise ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          BLOCO 2 — Última Análise Profunda (DEEP) | ORION
      ========================================================= */}

      {deepState === "IDLE" && (
        <div className="card p-5 space-y-2">
          <div className="text-sm text-zinc-400">Nenhuma análise profunda ainda.</div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              type="button"
              onClick={runDeep}
              disabled={deepLoading || !canDeepByMin}
              title={!canDeepByMin ? `Disponível após ${MIN_ANALYSES_FOR_DEEP} análises` : undefined}
            >
              Fazer Análise Profunda
            </button>
          </div>
        </div>
      )}

      {deepState === "LOADING_DEEP" && (
        <div className="card p-5">
          <div className="text-sm text-zinc-400">Gerando análise profunda…</div>
        </div>
      )}

      {deepState === "BLOCKED_INSUFFICIENT" && (
        <div className="card p-5 space-y-2">
          <div className="text-sm font-semibold">Créditos insuficientes</div>
          <div className="text-sm text-zinc-400">
            Você não tem saldo para concluir a análise profunda agora.
          </div>
          <div className="flex gap-2">
            <Link className="btn btn-primary" href="/account/credits">
              Ver créditos
            </Link>
          </div>
        </div>
      )}

      {deepState === "BLOCKED_DEEP_LIMIT" && (
        <div className="card p-5 space-y-2">
          <div className="text-sm font-semibold">Limite mensal atingido</div>
          <div className="text-sm text-zinc-400">
            Você atingiu o limite mensal de análises profundas.
          </div>
          {deepLimitPayload?.cycleRef && (
            <div className="text-xs text-zinc-500">Ciclo: {deepLimitPayload.cycleRef}</div>
          )}
          <div className="flex gap-2">
            <Link className="btn btn-primary" href="/account/subscription">
              Ver plano
            </Link>
          </div>
        </div>
      )}

      {deepState === "ERROR" && (
        <div className="card p-5 space-y-2">
          <div className="text-sm font-semibold">Falha ao gerar análise</div>
          <div className="text-sm text-zinc-400">{deepError ?? "Erro inesperado."}</div>
          <div className="flex gap-2">
            <button className="btn btn-primary" type="button" onClick={runDeep} disabled={deepLoading}>
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {deepState === "SUCCESS_DEEP" && deep && (
        <div className="space-y-6">
          <div className="card p-5 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs text-zinc-500">Leitura Profunda</div>
                <div className="text-sm text-zinc-400">
                  Conversa: <span className="text-zinc-200 font-medium">{id}</span>
                </div>
                {deep?.source && (
                  <div className="text-xs text-zinc-500">
                    Fonte: <span className="text-zinc-200">{deep.source}</span>
                  </div>
                )}
              </div>

              <div className="text-right space-y-1">
                <div className="text-xs text-zinc-500">Confiança</div>
                <div className="text-sm font-semibold text-zinc-200">{confidence}/100</div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={runDeep}
                disabled={deepLoading}
              >
                Recalcular
              </button>
            </div>

            {deepPayload && (
              <div className="mt-3 text-sm text-zinc-300">
                {isUnlimited ? (
                  <>Plano ilimitado: créditos não são consumidos.</>
                ) : (
                  <>
                    Consumiu{" "}
                    <span className="font-semibold text-zinc-50">{deepPayload.creditsUsed}</span>{" "}
                    crédito(s). Saldo após:{" "}
                    <span className="font-semibold text-zinc-50">{deepPayload.creditsBalanceAfter}</span>.{" "}
                    <span className="text-zinc-400">
                      (DEEP mensal: {deepPayload.deepMonthly.used}/{deepPayload.deepMonthly.limit} • restante{" "}
                      {deepPayload.deepMonthly.remaining} • ciclo {deepPayload.deepMonthly.cycleRef})
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-semibold">Evolução do objetivo</div>
                <div className="text-xs text-zinc-500">Comparação: anterior vs atual</div>
              </div>

              <div className={`rounded-2xl border px-3 py-2 text-sm font-semibold ${deltaClass}`}>
                Δ {deltaBadge}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-xs text-zinc-500">Anterior</div>
                <div className="text-lg font-semibold text-zinc-200">{scorePrev}</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-xs text-zinc-500">Atual</div>
                <div className="text-lg font-semibold text-zinc-200">{scoreCur}</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-xs text-zinc-500">Status</div>
                <div className="text-sm font-semibold text-zinc-200 mt-1">
                  {deep.summary.statusLabel}
                </div>
                <div className="text-xs text-zinc-500 mt-1">{deep.summary.headline}</div>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="text-sm font-semibold">Eventos & impactos</div>

            <div className="space-y-2">
              {deep.messageImpacts.map((it: ImpactItem, i: number) => {
                const d = it.delta ?? 0;
                const sign = d > 0 ? "+" : "";
                return (
                  <div
                    key={`${it.eventLabel}-${i}`}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-200 truncate">
                          {it.eventLabel}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">{it.rationale}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-zinc-200">
                          {sign}
                          {d}
                        </div>
                        <div className="text-xs text-zinc-500">{it.direction}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {deep.messageImpacts.length === 0 && (
                <div className="text-sm text-zinc-400">
                  Ainda não há eventos suficientes para detalhar impacto.
                </div>
              )}
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="text-sm font-semibold">Padrões detectados</div>

            <div className="space-y-2">
              {deep.patterns.map((p: PatternItem, i: number) => (
                <div
                  key={`${p.title}-${i}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <div className="text-sm font-medium text-zinc-200">
                    {p.type === "POSITIVE" ? "✅ " : "⚠️ "}
                    {p.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{p.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="text-sm font-semibold">Riscos & alertas</div>

            <div className="space-y-2">
              {deep.risks.map((r: RiskItem, i: number) => (
                <div
                  key={`${r.level}-${i}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <div className="text-sm font-medium text-zinc-200">
                    {r.level === "HIGH"
                      ? "🔴 Alto"
                      : r.level === "MEDIUM"
                      ? "🟠 Médio"
                      : "🟡 Baixo"}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{r.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <div className="text-sm font-semibold">Próximos passos</div>

            <div className="grid gap-2 md:grid-cols-2">
              {deep.recommendations
                .slice()
                .sort((a: RecItem, b: RecItem) => a.priority - b.priority)
                .map((rec: RecItem, i: number) => (
                  <div
                    key={`${rec.priority}-${i}`}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
                  >
                    <div className="text-xs text-zinc-500">Prioridade {rec.priority}</div>
                    <div className="text-sm text-zinc-200 mt-1">{rec.text}</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="card p-5 flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={runDeep} disabled={deepLoading}>
              Recalcular
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
