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
        <h1 className="text-lg font-semibold">Histórico</h1>
        <p className="text-sm text-zinc-400">
          Somente metadata: data, tipo de relação, score, mensagens aproximadas e créditos consumidos.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link className="btn" href="/">
            Voltar
          </Link>

          <button className="btn" type="button" onClick={onClear}>
            Apagar histórico
          </button>
        </div>

        <table className="w-full text-sm border border-zinc-800 rounded-xl overflow-hidden">
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
                <td className="px-3 py-2">
                  {new Date(it.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">{it.relationshipType}</td>
                <td className="px-3 py-2">{it.messageCountApprox}</td>
                <td className="px-3 py-2">{it.score ?? "—"}</td>
                <td className="px-3 py-2">{it.creditsUsed ?? "—"}</td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-zinc-500">
                  Nenhum item no histórico ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
