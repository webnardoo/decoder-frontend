"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchDeepAnalysis, type DeepAnalyzeSuccessV11 } from "@/lib/deep-analysis-client";
import type { DeepAnalysisV2 } from "@/lib/deep-analysis-contract";
import { ApiError } from "@/lib/analyze-client";
import { fetchPlanContext, type PlanContext } from "@/lib/subscriptions-context";

type ImpactItem = DeepAnalysisV2["messageImpacts"][number];
type PatternItem = DeepAnalysisV2["patterns"][number];
type RiskItem = DeepAnalysisV2["risks"][number];
type RecItem = DeepAnalysisV2["recommendations"][number];

type DeepState =
  | "IDLE"
  | "CONFIRM_COST_DEEP"
  | "LOADING_DEEP"
  | "SUCCESS_DEEP"
  | "BLOCKED_DEEP_LIMIT"
  | "BLOCKED_INSUFFICIENT"
  | "UNAUTH"
  | "ERROR";

export default function ProfundaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [planContext, setPlanContext] = useState<PlanContext | null>(null);

  const [state, setState] = useState<DeepState>("IDLE");
  const [loading, setLoading] = useState<boolean>(false);

  const [payload, setPayload] = useState<DeepAnalyzeSuccessV11 | null>(null);
  const [deep, setDeep] = useState<DeepAnalysisV2 | null>(null);

  const [limitPayload, setLimitPayload] = useState<{
    cycleRef: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  const headerTitle = useMemo(() => "Leitura Profunda", []);

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

  function openConfirm() {
    if (loading) return;
    setError(null);
    setPayload(null);
    setDeep(null);
    setLimitPayload(null);
    setState("CONFIRM_COST_DEEP");
  }

  async function runDeep() {
    if (loading) return;

    setState("LOADING_DEEP");
    setLoading(true);
    setError(null);
    setPayload(null);
    setDeep(null);
    setLimitPayload(null);

    try {
      const data = await fetchDeepAnalysis(id);
      setPayload(data);
      setDeep(data.deep);
      setState("SUCCESS_DEEP");
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          setState("UNAUTH");
          router.push("/login");
          return;
        }

        if (e.status === 403 && e.code === "INSUFFICIENT_CREDITS") {
          setState("BLOCKED_INSUFFICIENT");
          return;
        }

        if (e.status === 429 && e.code === "DEEP_MONTHLY_LIMIT_REACHED") {
          const cycleRef =
            typeof e.payload?.cycleRef === "string" ? e.payload.cycleRef : "";
          setLimitPayload({ cycleRef });
          setState("BLOCKED_DEEP_LIMIT");
          return;
        }
      }

      setState("ERROR");
      setError("Algo não saiu como esperado. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  const isUnlimited = planContext?.isUnlimited === true;

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
      {/* HEADER */}
      <div className="card p-5 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-zinc-500">{headerTitle}</div>
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
            <div className="text-xs text-zinc-500">Confianca</div>
            <div className="text-sm font-semibold text-zinc-200">
              {confidence}/100
            </div>
          </div>
        </div>

        {/* ACTION (IDLE) */}
        {state === "IDLE" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={openConfirm}>
              Iniciar análise profunda
            </button>
            <Link className="btn" href={`/conversas/${id}`}>
              Voltar para esta conversa
            </Link>
          </div>
        )}
      </div>

      {/* CONFIRM MODAL */}
      {state === "CONFIRM_COST_DEEP" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-lg p-5 space-y-4">
            <div className="text-sm font-semibold">
              Esta análise utilizará 1 análise profunda do seu plano e créditos do seu saldo.
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                className="btn"
                onClick={() => setState("IDLE")}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={runDeep}
                disabled={loading}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOADING (microcopy oficial) */}
      {state === "LOADING_DEEP" && (
        <div className="card p-5">
          <div className="text-sm text-zinc-400">Executando análise profunda…</div>
        </div>
      )}

      {/* BLOCKED: INSUFFICIENT */}
      {state === "BLOCKED_INSUFFICIENT" && (
        <div className="card p-5 space-y-3">
          <div className="text-sm font-semibold">Créditos insuficientes</div>
          <div className="text-sm text-zinc-300">
            Você não tem créditos suficientes para concluir esta análise.
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/account/credits">
              Ver planos e créditos
            </Link>
            <Link className="btn" href={`/conversas/${id}`}>
              Voltar
            </Link>
          </div>
        </div>
      )}

      {/* BLOCKED: DEEP LIMIT (sem retry) */}
      {state === "BLOCKED_DEEP_LIMIT" && (
        <div className="card p-5 space-y-3">
          <div className="text-sm font-semibold">Limite mensal atingido</div>
          <div className="text-sm text-zinc-300">
            Você já utilizou todas as análises profundas do seu plano neste ciclo.
          </div>
          <div className="text-sm text-zinc-300">
            Renovação em {limitPayload?.cycleRef || "—"}.
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn btn-primary" href="/account/subscription">
              Gerenciar plano
            </Link>
            <Link className="btn" href={`/conversas/${id}`}>
              Voltar
            </Link>
          </div>
        </div>
      )}

      {/* ERROR */}
      {state === "ERROR" && !loading && (
        <div className="card p-5 space-y-3">
          <div className="text-sm text-zinc-300">
            Algo não saiu como esperado. Tente novamente em instantes.
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={openConfirm}>
              Tentar novamente
            </button>
            <Link className="btn" href="/conversas">
              Voltar para lista de conversas
            </Link>
          </div>
        </div>
      )}

      {/* SUCCESS (201) */}
      {state === "SUCCESS_DEEP" && payload && deep && (
        <div className="space-y-4">
          <div className="card p-5 space-y-2">
            <div className="text-sm font-semibold">Análise profunda concluída</div>

            {isUnlimited ? (
              <div className="text-sm text-zinc-300">Plano ilimitado ativo</div>
            ) : (
              <div className="text-sm text-zinc-300 space-y-1">
                <div>Créditos utilizados: {payload.creditsUsed}</div>
                <div>Saldo atual: {payload.creditsBalanceAfter} créditos</div>
              </div>
            )}

            <div className="text-sm text-zinc-300">
              Análises profundas restantes neste ciclo:{" "}
              {payload.deepMonthly?.remaining ?? "—"}
            </div>
          </div>

          {/* SCORE STRIP */}
          <div className="card p-5 space-y-2">
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-xs text-zinc-500">Score anterior</div>
                <div className="text-xl font-semibold">{scorePrev}</div>
              </div>

              <div className={`rounded-2xl border p-4 ${deltaClass}`}>
                <div className="text-xs opacity-80">Variacao</div>
                <div className="text-xl font-semibold">{deltaBadge}</div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-xs text-zinc-500">Score atual</div>
                <div className="text-xl font-semibold">{scoreCur}</div>
              </div>
            </div>

            {deep?.summary?.headline && (
              <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="text-sm text-zinc-200 font-medium">
                  {deep.summary.headline}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Status: {deep.summary.statusLabel}
                </div>
              </div>
            )}
          </div>

          {/* DASHBOARD */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* IMPACTO */}
            <div className="card p-5 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Impacto por evento</div>
                  <div className="text-xs text-zinc-500">
                    Quanto cada evento contribuiu para a variacao desta leitura.
                  </div>
                </div>
                <div className="text-xs text-zinc-500">
                  Eventos: {deep.snapshot.eventCount}
                </div>
              </div>

              <div className="space-y-2">
                {deep.messageImpacts.map((m: ImpactItem) => {
                  const d = m.delta;
                  const badge = d > 0 ? `+${d}` : d < 0 ? `${d}` : "0";

                  const badgeClass =
                    d > 0
                      ? "bg-emerald-950/30 border-emerald-800/40 text-emerald-200"
                      : d < 0
                      ? "bg-red-950/30 border-red-800/40 text-red-200"
                      : "bg-zinc-900/40 border-zinc-800 text-zinc-200";

                  return (
                    <div
                      key={m.eventId}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-zinc-200">
                            {m.eventLabel}
                          </div>
                          <div className="text-xs text-zinc-500">{m.rationale}</div>
                        </div>

                        <div
                          className={`shrink-0 rounded-xl border px-3 py-1 text-sm font-semibold ${badgeClass}`}
                          title="Impacto deste evento na variacao"
                        >
                          {badge}
                        </div>
                      </div>

                      <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-zinc-200"
                          style={{
                            width: `${Math.min(100, Math.max(8, Math.abs(d) * 12))}%`,
                            opacity: d === 0 ? 0.3 : 0.9,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                {deep.messageImpacts.length === 0 && (
                  <div className="text-sm text-zinc-400">
                    Ainda nao ha eventos suficientes para detalhar impacto.
                  </div>
                )}
              </div>
            </div>

            {/* PADROES */}
            <div className="card p-5 space-y-3">
              <div className="text-sm font-semibold">Padroes detectados</div>

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

            {/* RISCOS */}
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
                        ? "🟠 Medio"
                        : "🟡 Baixo"}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{r.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECOMENDACOES */}
            <div className="card p-5 space-y-3 md:col-span-2">
              <div className="text-sm font-semibold">Proximos passos</div>

              <div className="grid gap-2 md:grid-cols-2">
                {deep.recommendations
                  .slice()
                  .sort((a: RecItem, b: RecItem) => a.priority - b.priority)
                  .map((rec: RecItem, i: number) => (
                    <div
                      key={`${rec.priority}-${i}`}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
                    >
                      <div className="text-xs text-zinc-500">
                        Prioridade {rec.priority}
                      </div>
                      <div className="text-sm text-zinc-200 mt-1">{rec.text}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* ACOES */}
            <div className="card p-5 flex flex-wrap gap-2 md:col-span-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => router.push(`/conversas/${id}`)}
              >
                Voltar para esta conversa
              </button>

              <button
                className="btn"
                type="button"
                onClick={() => router.push(`/conversas/${id}/analisar`)}
              >
                Fazer nova analise
              </button>

              <Link className="btn" href="/conversas">
                Ver lista de conversas
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
