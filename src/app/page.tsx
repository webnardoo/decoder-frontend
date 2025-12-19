"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { analyzeConversation } from "@/lib/analyze-client";
import type { ApiError } from "@/lib/analyze-client";
import type { RelationshipType } from "@/lib/relationships";
import { relationshipOptions } from "@/lib/relationships";
import { ResultView } from "@/components/result-view";
import type { QuickAnalysisResponseV11 } from "@/components/result-view";
import { LoaderCard } from "@/components/loader-card";
import { saveHistoryItem } from "@/lib/history";
import { listConversas } from "@/lib/conversas";
import { validateConversationText } from "@/lib/validation/conversation";
import { getConversationValidationMessage } from "@/lib/validation/conversationMessages";

type Mode = "AVULSA" | "CONVERSA";
type QuickMode = "RESUMO" | "RESPONDER";

type Banner = {
  title: string;
  reason: string;
  fix?: string;
};

const MIN_CHARS = 60;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isApiError(x: any): x is ApiError {
  return x && typeof x === "object" && typeof x.code === "string" && typeof x.message === "string";
}

function isInsufficientCreditsPayload(payload: any): boolean {
  const text = String(
    payload?.message ??
      payload?.payload?.message ??
      payload?.error?.message ??
      payload?.payload?.error ??
      payload?.error ??
      ""
  ).toLowerCase();

  if (text.includes("créditos insuficientes")) return true;
  if (text.includes("insufficient") && text.includes("credit")) return true;
  if (payload?.error === "INSUFFICIENT_CREDITS") return true;
  if (payload?.code === "INSUFFICIENT_CREDITS") return true;
  return false;
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("AVULSA");

  // ✅ UI do app: "Receber análise" = RESUMO, "Opções de respostas" = RESPONDER
  const [quickMode, setQuickMode] = useState<QuickMode>("RESUMO");

  const [conversaId, setConversaId] = useState<string>("");

  const [conversation, setConversation] = useState("");
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("ROMANTICA");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickAnalysisResponseV11 | null>(null);

  const [banner, setBanner] = useState<Banner | null>(null);

  const [conversas, setConversas] = useState<{ id: string; name: string }[]>([]);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  useEffect(() => {
    const list = listConversas().map((c) => ({ id: c.id, name: c.name }));
    setConversas(list);
  }, []);

  const chars = conversation.length;
  const charsOk = chars >= MIN_CHARS;
  const charsClass = charsOk ? "text-emerald-400" : "text-red-400";

  const inConversaMode = mode === "CONVERSA";
  const hasConversaSelected = !!conversaId;

  const canClickAnalyze = useMemo(() => !loading, [loading]);

  function changeMode(next: Mode) {
    if (loading || next === mode) return;
    setMode(next);
    setResult(null);
    setBanner(null);
    if (next === "CONVERSA") setConversaId("");
  }

  async function onAnalyze() {
    if (loading) return;

    setBanner(null);
    setResult(null);

    if (inConversaMode && !hasConversaSelected) {
      setBanner({
        title: "Selecione uma conversa",
        reason: "No modo dentro de uma conversa, a análise precisa estar vinculada a uma conversa.",
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

    try {
      await sleep(80);

      const r = await analyzeConversation({
        text: conversation,
        relationshipType,
        quickMode, // ✅ PROPAGA PARA O BACK
      });

      if (isApiError(r)) {
        if (r.status === 401) {
          setBanner({ title: "Falha ao analisar", reason: "Sessão expirada. Faça login novamente." });
          return;
        }

        if (r.status === 403 && isInsufficientCreditsPayload(r.payload)) {
          setBanner({ title: "Falha ao analisar", reason: "Créditos insuficientes." });
          return;
        }

        if (typeof r.status === "number" && r.status >= 500) {
          setBanner({
            title: "Falha ao analisar",
            reason: "Erro temporário do sistema.",
            fix: "Tente novamente em instantes.",
          });
          return;
        }

        setBanner({
          title: "Falha ao analisar",
          reason: r.message || "Não foi possível concluir a análise.",
          fix: "Verifique os dados e tente novamente.",
        });
        return;
      }

      const data = r as QuickAnalysisResponseV11;
      setResult(data);

      if (typeof data?.creditsBalanceAfter === "number") {
        setCreditsBalance(data.creditsBalanceAfter);
      }

      saveHistoryItem({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        relationshipType,
        messageCountApprox: data?.meta?.messageCountApprox ?? 1,
        score: typeof data?.score?.value === "number" ? data.score.value : null,
        containerId: inConversaMode ? conversaId : null,
        creditsUsed: typeof data?.creditsUsed === "number" ? data.creditsUsed : null,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Decoder</h1>
          <p className="text-sm text-zinc-400">Análise Avulsa / Dentro de Conversa</p>
        </div>

        <div className="flex items-center gap-2">
          <Link className="btn" href="/conversas">Conversas</Link>
          <Link className="btn" href="/account/subscription">Assinatura</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={`btn ${mode === "AVULSA" ? "btn-primary" : ""}`} onClick={() => changeMode("AVULSA")} disabled={loading} type="button">
          Avulsa
        </button>
        <button className={`btn ${mode === "CONVERSA" ? "btn-primary" : ""}`} onClick={() => changeMode("CONVERSA")} disabled={loading} type="button">
          Dentro de conversa
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">Texto</div>
          <div className={`text-xs font-medium ${charsClass}`}>{chars} caracteres</div>
        </div>

        <textarea
          className="w-full rounded-xl border p-3 min-h-45"
          value={conversation}
          onChange={(e) => setConversation(e.target.value)}
          placeholder="Cole o diálogo aqui…"
        />

        <div className="text-xs text-zinc-500">Modo</div>
        <div className="flex gap-3">
          <button
            className={`btn ${quickMode === "RESUMO" ? "btn-primary" : ""}`}
            onClick={() => setQuickMode("RESUMO")}
            disabled={loading}
            type="button"
          >
            Receber análise
          </button>

          <button
            className={`btn ${quickMode === "RESPONDER" ? "btn-primary" : ""}`}
            onClick={() => setQuickMode("RESPONDER")}
            disabled={loading}
            type="button"
          >
            Opções de respostas
          </button>
        </div>

        <div className="text-xs text-zinc-500">Tipo de relação</div>
        <div className="flex flex-wrap gap-2">
          {relationshipOptions.map((opt) => (
            <button
              key={opt.value}
              className={`btn ${relationshipType === opt.value ? "btn-primary" : ""}`}
              onClick={() => setRelationshipType(opt.value)}
              disabled={loading}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button className="btn btn-primary" onClick={onAnalyze} disabled={!canClickAnalyze} type="button">
          {loading ? "Analisando…" : "Analisar"}
        </button>

        {banner && (
          <div className="rounded-xl border p-3 text-sm">
            <div className="font-medium">{banner.title}</div>
            <div className="text-muted-foreground">{banner.reason}</div>
            {banner.fix && <div className="text-muted-foreground">{banner.fix}</div>}
          </div>
        )}
      </div>

      {loading && <LoaderCard />}

      {/* ✅ FIX DO BUG 2: ResultView exige quickMode */}
      {result && <ResultView data={result} quickMode={quickMode} />}
    </div>
  );
}
