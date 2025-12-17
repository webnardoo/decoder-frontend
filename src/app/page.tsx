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
import { fetchCreditsBalance } from "@/lib/credits-balance";

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

  // ✅ saldo visível na Home (FASE ORION)
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  useEffect(() => {
    const list = listConversas().map((c) => ({ id: c.id, name: c.name }));
    setConversas(list);
  }, []);

  useEffect(() => {
    let alive = true;

    fetchCreditsBalance()
      .then((r) => {
        if (!alive) return;
        setCreditsBalance(r.balance);
      })
      .catch(() => {
        if (!alive) return;
        setCreditsBalance(null);
      });

    return () => {
      alive = false;
    };
  }, [runId]);

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

    const validation = validateConversationText(conversation);
    if (!validation.ok) {
      const ux = getConversationValidationMessage(validation.code, validation.stats);
      setBanner({ title: ux.title, reason: ux.reason, fix: ux.fix });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // micro-delay só pra manter o LoaderCard perceptível (MVP)
      await sleep(250);

      const r = await analyzeConversation({
        conversation,
        relationshipType,
      });

      setResult(r);

      // histórico global (AVULSA)
      saveHistoryItem({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        relationshipType,
        messageCountApprox: r.meta?.messageCountApprox ?? 1,
        score: r.score?.value ?? null,
        containerId: inConversaMode ? conversaId : null,
        creditsUsed: typeof (r as any)?.creditsUsed === "number" ? (r as any).creditsUsed : null,
      });

      // histórico da conversa (CONVERSA)
      if (inConversaMode && conversaId) {
        addConversaAnalysis({
          conversaId,
          score: r.score?.value ?? null,
          label: r.score?.label ?? null,
          messageCountApprox: r.meta?.messageCountApprox ?? 1,
          creditsUsed: typeof (r as any)?.creditsUsed === "number" ? (r as any).creditsUsed : null,
        });
      }

      // força refetch do saldo
      setRunId((x) => x + 1);
    } catch (e: any) {
      setError("Algo não saiu como esperado. Tente novamente em instantes.");
      setBanner({
        title: "Falha ao analisar",
        reason: "Algo não saiu como esperado. Tente novamente em instantes.",
        fix: "Tente novamente. Se persistir, revise o texto e a conexão.",
      });
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    if (loading) return;
    setConversation("");
    setResult(null);
    setBanner(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* SALDO DESTACADO (ORION) */}
      <div className="card p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs text-zinc-500">Saldo de créditos</div>
          <div className="text-lg font-semibold tabular-nums truncate">
            {creditsBalance == null ? "—" : creditsBalance}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Análises consomem créditos automaticamente.
          </div>
        </div>

        <div className="shrink-0 flex gap-2">
          <Link className="btn btn-primary" href="/account/credits">
            Ver créditos
          </Link>
          <Link className="btn" href="/conversas">
            Conversas
          </Link>
        </div>
      </div>

      {/* HEADER */}
      <div className="card p-5 space-y-2">
        <div className="text-sm font-semibold">HINT</div>
        <div className="text-sm text-zinc-400">
          Você pode analisar avulso ou acompanhar evolução dentro de uma{" "}
          <span className="text-zinc-200 font-medium">Conversa</span>.
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
            placeholder="Cole aqui a conversa."
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
                className={`btn ${relationshipType === opt.value ? "btn-primary" : ""}`}
                onClick={() => setRelationshipType(opt.value)}
                disabled={loading}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {banner && (
          <div className="rounded-xl border border-yellow-700/30 bg-yellow-950/20 p-3 text-sm text-yellow-100/90 space-y-1">
            <div className="font-medium">{banner.title}</div>
            <div className="text-yellow-100/80">{banner.reason}</div>
            <div className="text-yellow-100/90">{banner.fix}</div>
          </div>
        )}

        {error && !banner && (
          <div className="rounded-xl border border-red-700/30 bg-red-950/20 p-3 text-sm text-red-100/90">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            className={`btn btn-primary ${!canClickAnalyze ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={!canClickAnalyze}
            onClick={onAnalyze}
          >
            {loading ? "Analisando…" : "Analisar"}
          </button>

          <button className="btn" onClick={onClear} disabled={loading}>
            Limpar
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && <LoaderCard />}

      {/* RESULT */}
      {result && !loading && (
        <div className="space-y-4">
          <ResultView result={result} />
        </div>
      )}
    </div>
  );
}
