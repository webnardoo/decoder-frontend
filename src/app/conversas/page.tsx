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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold">Conversas</h1>
          <p className="text-sm text-zinc-400">
            Cada conversa acompanha a evolução de um objetivo.
          </p>
        </div>

        <Link className="btn btn-primary" href="/conversas/new">
          Nova conversa
        </Link>
      </div>

      {items.length === 0 && (
        <div className="card p-5 text-sm text-zinc-400">
          Nenhuma conversa criada ainda.
        </div>
      )}

      <div className="space-y-3">
        {items.map((c) => {
          const analyses = listConversaAnalyses(c.id);
          const trend = computeTrend(analyses);
          const creditsTotal = sumCreditsUsed(analyses);

          return (
            <div key={c.id} className="card p-5 space-y-3">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-zinc-500">
                    {c.goal.area} •{" "}
                    {getStateLabel(c.goal.area, c.goal.currentStateId, "current")} →{" "}
                    {getStateLabel(c.goal.area, c.goal.desiredStateId, "desired")}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Créditos consumidos:{" "}
                    <span className="text-zinc-300">
                      {creditsTotal == null ? "—" : creditsTotal}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-semibold">{trend.arrow}</div>
                  <div className="text-xs text-zinc-500">
                    {trend.note}
                    {formatTrendPercent(trend.percent)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Link className="btn btn-primary" href={`/conversas/${c.id}`}>
                  Abrir conversa
                </Link>
                <button className="btn" onClick={() => onDelete(c.id)}>
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
