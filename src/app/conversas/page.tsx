// FRONT — src/app/conversas/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listConversas,
  deleteConversa,
  listConversaAnalyses,
  computeTrend,
  sumCreditsUsed,
  type Conversa,
} from "@/lib/conversas";
import { getStateLabel } from "@/lib/objectives";

export default function ConversasPage() {
  const [items, setItems] = useState<Conversa[]>([]);

  function refresh() {
    setItems(listConversas());
  }

  useEffect(() => {
    refresh();
  }, []);

  function onDelete(id: string) {
    deleteConversa(id);
    refresh();
  }

  function formatTrendPercent(p: number | null) {
    if (p == null) return "";
    const sign = p > 0 ? "+" : "";
    return ` • ${sign}${p}%`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Conversas</h1>
          <p className="mt-1 text-sm text-zinc-300/80">
            Cada conversa acompanha a evolução de um objetivo.
          </p>
        </div>

        <Link className="btn btn-primary w-full sm:w-auto" href="/conversas/new">
          Nova conversa
        </Link>
      </div>

      {items.length === 0 && (
        <div className="card p-6 md:p-7">
          <div className="text-base font-medium">Nenhuma conversa ainda.</div>
          <p className="mt-1 text-sm text-zinc-300/80">
            Crie uma conversa para acompanhar um objetivo e acumular análises.
          </p>
          <div className="mt-4">
            <Link className="btn btn-primary w-full sm:w-auto" href="/conversas/new">
              Criar primeira conversa
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((c) => {
          const analyses = listConversaAnalyses(c.id);
          const trend = computeTrend(analyses);
          const creditsTotal = sumCreditsUsed(analyses);

          return (
            <div key={c.id} className="card p-6 md:p-7 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <div className="text-base font-medium truncate">{c.name}</div>

                  <div className="mt-1 text-xs text-zinc-400/70">
                    {c.goal.area} •{" "}
                    {getStateLabel(c.goal.area, c.goal.currentStateId, "current")} →{" "}
                    {getStateLabel(c.goal.area, c.goal.desiredStateId, "desired")}
                  </div>

                  <div className="mt-2 text-xs text-zinc-400/70">
                    Créditos consumidos:{" "}
                    <span className="text-zinc-200/90 font-medium">
                      {creditsTotal == null ? "—" : creditsTotal}
                    </span>
                  </div>
                </div>

                <div className="sm:text-right shrink-0 flex items-center justify-between sm:block">
                  <div className="text-lg font-semibold leading-none">{trend.arrow}</div>
                  <div className="mt-0 sm:mt-1 text-xs text-zinc-400/70">
                    {trend.note}
                    {formatTrendPercent(trend.percent)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link className="btn btn-primary w-full sm:w-auto" href={`/conversas/${c.id}`}>
                  Abrir conversa
                </Link>
                <button className="btn w-full sm:w-auto" onClick={() => onDelete(c.id)}>
                  Apagar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
