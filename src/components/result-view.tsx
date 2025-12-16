"use client";

import Link from "next/link";

type Item = { title: string; description: string };
type Score = { value: number; label: string };

function safeArray(v: any): Item[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(Boolean)
    .map((x) => ({
      title: String(x?.title ?? ""),
      description: String(x?.description ?? ""),
    }))
    .filter((x) => x.title || x.description);
}

type ResultViewProps = {
  result: any;
  /**
   * Contrato UX v1.1:
   * - isUnlimited === true => NÃO exibir saldo/consumo, exibir "Plano ilimitado ativo"
   * - isUnlimited === false => exibir consumo e saldo
   *
   * Este valor deve vir do GET /api/v1/subscriptions/context (sem inferência por nome de plano).
   */
  isUnlimited?: boolean;
};

export function ResultView({ result, isUnlimited }: ResultViewProps) {
  const score: Score | null =
    typeof result?.score?.value === "number"
      ? { value: result.score.value, label: String(result.score.label ?? "") }
      : null;

  const insights = safeArray(result?.insights);
  const redFlags = safeArray(result?.redFlags);

  const replySuggestion = String(result?.replySuggestion ?? "");

  const msgApprox = result?.meta?.messageCountApprox;
  const scoreValue = score?.value ?? 0;

  const creditsUsed =
    typeof result?.creditsUsed === "number" ? result.creditsUsed : null;

  const creditsBalanceAfter =
    typeof result?.creditsBalanceAfter === "number"
      ? result.creditsBalanceAfter
      : null;

  return (
    <section className="card p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-lg font-semibold tracking-tight">Resultado</div>
          <div className="text-xs text-zinc-500">
            {typeof msgApprox === "number" ? `msgs aprox.: ${msgApprox}` : ""}
          </div>
        </div>

        {score && (
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">{scoreValue}</div>
            <div className="text-xs text-zinc-400">{score.label}</div>
          </div>
        )}
      </div>

      {/* Pós-consumo (Contrato UX v1.1) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-1">
        {isUnlimited === true ? (
          <div className="text-sm text-zinc-300">Plano ilimitado ativo</div>
        ) : (
          <>
            <div className="text-sm text-zinc-300">
              Créditos utilizados: {creditsUsed ?? "—"}
            </div>
            <div className="text-sm text-zinc-300">
              Saldo atual: {creditsBalanceAfter ?? "—"} créditos
            </div>
          </>
        )}
      </div>

      {score && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-yellow-400/70"
              style={{ width: `${Math.max(0, Math.min(100, scoreValue))}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="text-sm font-medium text-zinc-200">Tabela de insights</div>
          <div className="mt-3 space-y-3">
            {insights.length === 0 && (
              <div className="text-sm text-zinc-500">Sem insights no recorte.</div>
            )}
            {insights.map((it, idx) => (
              <div key={idx}>
                <div className="text-sm font-medium text-zinc-200">{it.title}</div>
                <div className="text-sm text-zinc-400">{it.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
          <div className="text-sm font-medium text-zinc-200">Red flags</div>
          <div className="mt-3 space-y-3">
            {redFlags.length === 0 && (
              <div className="text-sm text-zinc-500">
                Nenhuma red flag forte detectada.
              </div>
            )}
            {redFlags.map((it, idx) => (
              <div key={idx}>
                <div className="text-sm font-medium text-zinc-200">{it.title}</div>
                <div className="text-sm text-zinc-400">{it.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-2">
        <div className="text-sm font-medium text-zinc-200">Sugestão de resposta</div>
        <div className="text-sm text-zinc-300 whitespace-pre-wrap">
          {replySuggestion || "—"}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-primary" href="/account/subscription">
          Assinar
        </Link>
        <Link className="btn" href="/account/credits">
          Comprar créditos
        </Link>
        <Link className="btn" href="/account/history">
          Ver histórico
        </Link>
      </div>
    </section>
  );
}
