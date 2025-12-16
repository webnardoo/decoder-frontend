"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { analyzeConversation } from "@/lib/analyze-client";
import type { RelationshipType } from "@/lib/relationships";
import { relationshipOptions } from "@/lib/relationships";
import { ResultView } from "@/components/result-view";
import { LoaderCard } from "@/components/loader-card";
import { saveHistoryItem } from "@/lib/history";
import { addConversaAnalysis, listConversas } from "@/lib/conversas";
import { validateConversationText } from "@/lib/validation/conversation";
import { getConversationValidationMessage } from "@/lib/validation/conversationMessages";

type AnalyzeResult = Awaited<ReturnType<typeof analyzeConversation>>;
type Mode = "AVULSA" | "CONVERSA";

type Banner = {
  title: string;
  reason: string;
  fix: string;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("AVULSA");
  const [conversaId, setConversaId] = useState<string>("");

  const [conversation, setConversation] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType>("ROMANTICA");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  // ✅ evidencia nova execução (remount)
  const [runId, setRunId] = useState(0);

  const [conversas, setConversas] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const list = listConversas().map((c) => ({ id: c.id, name: c.name }));
    setConversas(list);
  }, []);

  const chars = conversation.length;
  const inConversaMode = mode === "CONVERSA";
  const hasConversaSelected = !!conversaId;

  const canClickAnalyze = useMemo(() => !loading, [loading]);

  function changeMode(next: Mode) {
    if (loading || next === mode) return;
    setMode(next);
    setResult(null);
    setBanner(null);
    setError(null);
    if (next === "CONVERSA") setConversaId("");
  }

  async function onAnalyze() {
    if (loading) return;

    setError(null);
    setBanner(null);

    if (inConversaMode && !hasConversaSelected) {
      setBanner({
        title: "Selecione uma conversa",
        reason:
          "No modo dentro de uma conversa, a análise precisa estar vinculada a uma conversa.",
        fix: "Selecione uma conversa e tente novamente.",
      });
      return;
    }

    const v = validateConversationText(conversation);
    if (!v.ok) {
      setBanner(getConversationValidationMessage(v.code, v.stats));
      return;
    }

    // ✅ reset visual ANTES do request
    setResult(null);
    setRunId((id) => id + 1);
    setLoading(true);

    // ✅ garante que o Loader seja pintado antes do fetch (evita “piscar”)
    // e garante um loading mínimo para evidenciar execução (especialmente com mock local)
    const startedAt = Date.now();
    await sleep(40);

    try {
      const data = await analyzeConversation({
        conversation: v.normalized,
        relationshipType,
      });

      setResult(data);

      const scoreValue =
        typeof data?.score?.value === "number" ? data.score.value : null;

      const messageCountApprox =
        typeof (data as any)?.meta?.messageCountApprox === "number"
          ? (data as any).meta.messageCountApprox
          : Math.max(1, Math.round(v.normalized.length / 40));

      const creditsUsed =
        typeof (data as any)?.creditsUsed === "number"
          ? (data as any).creditsUsed
          : null;

      saveHistoryItem({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        relationshipType,
        messageCountApprox,
        score: scoreValue,
        containerId: inConversaMode ? conversaId : null,
        creditsUsed,
      });

      if (inConversaMode && conversaId) {
        addConversaAnalysis({
          conversaId,
          score: scoreValue,
          label: (data as any)?.score?.label ?? null,
          messageCountApprox,
          creditsUsed,
        });
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Falha ao analisar. Tente novamente.";
      setError(msg);
    } finally {
      // ✅ loading mínimo para não “piscar” com mock
      const elapsed = Date.now() - startedAt;
      const minLoadingMs = 350;
      if (elapsed < minLoadingMs) {
        await sleep(minLoadingMs - elapsed);
      }
      setLoading(false);
    }
  }

  function onClear() {
    if (loading) return;
    setConversation("");
    setResult(null);
    setError(null);
    setBanner(null);
  }

  return (
    <div className="space-y-6">
      <section className="card p-5 space-y-4">
        <div className="space-y-1">
          <div className="text-lg font-semibold tracking-tight">
            Análise rápida, clara e confortável
          </div>
          <div className="text-sm text-zinc-400">
            Você pode analisar avulso ou acompanhar evolução dentro de uma{" "}
            <span className="text-zinc-200 font-medium">Conversa</span>.
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-500">Modo</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`btn ${mode === "AVULSA" ? "btn-primary" : ""}`}
              onClick={() => changeMode("AVULSA")}
              disabled={loading}
            >
              Avulsa
            </button>
            <button
              type="button"
              className={`btn ${mode === "CONVERSA" ? "btn-primary" : ""}`}
              onClick={() => changeMode("CONVERSA")}
              disabled={loading}
            >
              Dentro de uma conversa
            </button>
          </div>
        </div>

        {inConversaMode && (
          <div className="space-y-2">
            <div className="text-xs text-zinc-500">Conversa</div>
            <select
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-200 outline-none"
              value={conversaId}
              onChange={(e) => setConversaId(e.target.value)}
              disabled={loading}
            >
              <option value="">Selecione uma conversa…</option>
              {conversas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500">Texto</div>
            <div className="text-xs text-zinc-500 tabular-nums">{chars} chars</div>
          </div>

          <textarea
            className="min-h-[180px] w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3 text-sm text-zinc-200 outline-none"
            placeholder="Cole aqui a conversa..."
            value={conversation}
            onChange={(e) => setConversation(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-500">Tipo de relação</div>
          <div className="flex flex-wrap gap-2">
            {relationshipOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`btn ${
                  relationshipType === opt.value ? "btn-primary" : ""
                }`}
                onClick={() => setRelationshipType(opt.value)}
                disabled={loading}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={`btn btn-primary ${
              !canClickAnalyze ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={!canClickAnalyze}
            onClick={onAnalyze}
          >
            {loading ? "Analisando…" : "Analisar"}
          </button>

          <button
            className={`btn ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            type="button"
            onClick={onClear}
            disabled={loading}
          >
            Limpar
          </button>

          <Link className="btn" href="/conversas">
            Ir para Conversas
          </Link>
        </div>

        {banner && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-1">
            <div className="text-sm font-medium text-zinc-200">{banner.title}</div>
            <div className="text-sm text-zinc-400">{banner.reason}</div>
            <div className="text-sm text-zinc-300">{banner.fix}</div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-300">
            {error}
          </div>
        )}
      </section>

      {/* ✅ LOADING dominante (agora sempre perceptível) */}
      {loading && <LoaderCard />}

      {/* ✅ SUCCESS “novo” a cada execução */}
      {!loading && result && <ResultView key={runId} result={result} />}
    </div>
  );
}
