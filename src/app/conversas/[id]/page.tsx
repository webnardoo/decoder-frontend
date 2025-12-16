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

const MIN_ANALYSES_FOR_DEEP = 5;

export default function ConversaDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [conversaName, setConversaName] = useState("");
  const [meta, setMeta] = useState("");
  const [analyses, setAnalyses] = useState<ConversaAnalysis[]>([]);

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
    setAnalyses(listConversaAnalyses(id));
  }, [id]);

  const trend = useMemo(() => computeTrend(analyses), [analyses]);
  const canDeep = analyses.length >= MIN_ANALYSES_FOR_DEEP;

  const trendPercentLabel =
    trend.percent == null
      ? ""
      : ` (${trend.percent > 0 ? "+" : ""}${trend.percent}%)`;

  const creditsTotal = useMemo(() => sumCreditsUsed(analyses), [analyses]);

  return (
    <div className="space-y-6">
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

      <div className="card p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-primary" href={`/conversas/${id}/analisar`}>
            Fazer análise
          </Link>

          {canDeep ? (
            <Link className="btn btn-primary" href={`/conversas/${id}/profunda`}>
              Análise profunda
            </Link>
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

        <table className="w-full text-sm border border-zinc-800 rounded-xl overflow-hidden">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Msgs</th>
              <th className="px-3 py-2 text-left">Score</th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-left">Créditos</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((a) => (
              <tr key={a.id} className="border-t border-zinc-800">
                <td className="px-3 py-2">
                  {new Date(a.createdAt).toLocaleString()}
                </td>
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
  );
}
