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
  | "LOADING_DEEP"
  | "SUCCESS_DEEP"
  | "BLOCKED_DEEP_LIMIT"
  | "BLOCKED_INSUFFICIENT"
  | "UNAUTH"
  | "ERROR";

const KEY_DEEP_PREFIX = "decoder.deep.v1.";
const DEEP_INTENT_KEY_PREFIX = "decoder.deep.intent.v1.";

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

function consumeDeepIntent(conversaId: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    const k = `${DEEP_INTENT_KEY_PREFIX}${conversaId}`;
    const v = sessionStorage.getItem(k);
    if (v === "1") {
      sessionStorage.removeItem(k);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export default function ProfundaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [planContext, setPlanContext] = useState<PlanContext | null>(null);

  const [state, setState] = useState<DeepState>("IDLE");
  const [loading, setLoading] = useState<boolean>(false);

  const [payload, setPayload] = useState<DeepAnalyzeSuccessV11 | null>(null);
  const [deep, setDeep] = useState<DeepAnalysisV2 | null>(null);

  const [limitPayload, setLimitPayload] = useState<{ cycleRef: string } | null>(null);
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

  // Ao abrir: mostra última DEEP persistida (se existir). Não executa nova sem intenção explícita.
  useEffect(() => {
    const last = loadLastDeep(id);
    if (last) {
      setPayload(last);
      setDeep(last.deep);
      setState("SUCCESS_DEEP");
    } else {
      setState("IDLE");
    }
  }, [id]);

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

      saveLastDeep(id, data);
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

  // ✅ Execução automática SOMENTE se houve intenção explícita do usuário (CTA)
  useEffect(() => {
    const intent = consumeDeepIntent(id);
    if (!intent) return;
    runDeep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
            <div className="text-xs text-zinc-500">Confiança</div>
            <div className="text-sm font-semibold text-zinc-200">{confidence}/100</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" type="button" onClick={runDeep} disabled={loading}>
            Recalcular
          </button>
          <Link className="btn" href={`/conversas/${id}`}>
            Voltar para esta conversa
          </Link>
        </div>

        {/* saldo/limites pós-consumo (se vier payload) */}
        {payload && (
          <div className="mt-3 text-sm text-zinc-300">
            {isUnlimited ? (
              <>Plano ilimitado: créditos não são consumidos.</>
            ) : (
              <>
                Consumiu{" "}
                <span className="font-semibold text-zinc-50">{payload.creditsUsed}</span>{" "}
                crédito(s). Saldo após:{" "}
                <span className="font-semibold text-zinc-50">{payload.creditsBalanceAfter}</span>.{" "}
                <span className="text-zinc-400">
                  (DEEP mensal: {payload.deepMonthly.used}/{payload.deepMonthly.limit} • restante{" "}
                  {payload.deepMonthly.remaining} • ciclo {payload.deepMonthly.cycleRef})
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* IDLE (estado vazio: sem DEEP persistida) */}
      {state === "IDLE" && (
        <div className="card p-5 space-y-2">
          <div className="text-sm text-zinc-400">Nenhuma análise profunda ainda.</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={runDeep} disabled={loading}>
              Fazer Análise Profunda
            </button>
            <Link className="btn" href={`/conversas/${id}`}>
              Voltar
            </Link>
          </div>
        </div>
      )}

      {/* LOADING */}
      {state === "LOADING_DEEP" && (
        <div className="card p-5">
          <div className="text-sm text-zinc-400">Gerando análise profunda…</div>
        </div>
      )}

      {/* BLOCKED: INSUFFICIENT */}
      {state === "BLOCKED_INSUFFICIENT" && (
        <div className="card p-5 space-y-2">
          <div className="text-sm font-semibold">Créditos insuficientes</div>
          <div className="text-sm text-zinc-400">
            Você não tem saldo para concluir a análise profunda agora.
          </div>
          <div className="flex gap-2">
            <Link className="btn btn-primary" href="/account/credits">
              Ver créditos
            </Link>
            <Link className="btn" href={`/conversas/${id}`}>
              Voltar
            </Link>
          </div>
        </div>
      )}

      {/* BLOCKED: DEEP LIMIT */}
      {state === "BLOCKED_DEEP_LIMIT" && (
        <div className="card p-5 space-y-2">
          <div className="text-sm font-semibold">Limite mensal atingido</div>
          <div className="text-sm text-zinc-400">
            Você atingiu o limite mensal de análises profundas.
          </div>
          {limitPayload?.cycleRef && (
            <div className="text-xs text-zinc-500">Ciclo: {limitPayload.cycleRef}</div>
          )}
          <div className="flex gap-2">
            <Link className="btn btn-primary" href="/account/subscription">
              Ver plano
            </Link>
            <Link className="btn" href={`/conversas/${id}`}>
              Voltar
            </Link>
          </div>
        </div>
      )}

      {/* ERROR */}
      {state === "ERROR" && (
        <div className="card p-5 space-y-2">
          <div className="text-sm font-semibold">Falha ao gerar análise</div>
          <div className="text-sm text-zinc-400">{error ?? "Erro inesperado."}</div>
          <div className="flex gap-2">
            <button className="btn btn-primary" type="button" onClick={runDeep} disabled={loading}>
              Tentar novamente
            </button>
            <Link className="btn" href={`/conversas/${id}`}>
              Voltar
            </Link>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {state === "SUCCESS_DEEP" && deep && (
        <div className="space-y-4">
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
            <button className="btn btn-primary" type="button" onClick={runDeep} disabled={loading}>
              Recalcular
            </button>
            <Link className="btn" href={`/conversas/${id}`}>
              Voltar
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
