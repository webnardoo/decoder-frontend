// FRONT — src/app/account/history/page.tsx
"use client";

import Link from "next/link";
import { clearHistory, listHistoryItems, type HistoryItem } from "@/lib/history";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  function refresh() {
    setItems(listHistoryItems());
  }

  useEffect(() => {
    refresh();
  }, []);

  function onClear() {
    clearHistory();
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Histórico</h1>
        <p className="text-sm text-zinc-300/80">
          Somente metadata: data, tipo de relação, score, mensagens aproximadas e
          créditos consumidos.
        </p>
      </div>

      <div className="card p-6 md:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <Link className="btn w-full sm:w-auto" href="/">
            Voltar
          </Link>

          <button className="btn w-full sm:w-auto" type="button" onClick={onClear}>
            Apagar histórico
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Relação</th>
                <th className="px-3 py-2 text-left">Msgs</th>
                <th className="px-3 py-2 text-left">Score</th>
                <th className="px-3 py-2 text-left">Créditos</th>
              </tr>
            </thead>

            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-200">
                    {new Date(it.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-zinc-300/90">{it.relationshipType}</td>
                  <td className="px-3 py-2 text-zinc-300/90">{it.messageCountApprox}</td>
                  <td className="px-3 py-2 text-zinc-300/90">{it.score ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-300/90">{it.creditsUsed ?? "—"}</td>
                </tr>
              ))}

              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-zinc-400/70">
                    Nenhum item no histórico ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-zinc-400/70">
          Dica: esse histórico é local (browser). Limpar remove apenas do seu
          dispositivo atual.
        </div>
      </div>
    </div>
  );
}
