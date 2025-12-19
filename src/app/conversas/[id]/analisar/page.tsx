"use client";

import { useState } from "react";
import { analyzeConversation } from "@/lib/analyze-client";
import ResultView, { type QuickAnalysisResponseV11 } from "@/components/result-view";

type QuickModeUI = "RESUMO" | "RESPONDER";

export default function AnalisarPage({ params }: { params: { id: string } }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickAnalysisResponseV11 | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ✅ Modo explícito (UI)
  const [quickMode, setQuickMode] = useState<QuickModeUI>("RESUMO");

  async function handleAnalyze() {
    setErrorMsg(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await analyzeConversation({
        text,
        relationshipType: "ROMANTICA",
        quickMode, // "RESUMO" | "RESPONDER"
      });

      // analyzeConversation pode retornar ApiError OU payload.
      // Aqui assumo o comportamento atual: em erro, retorna objeto com code/message.
      if ((res as any)?.code && (res as any)?.message) {
        setErrorMsg((res as any).message ?? "Falha ao analisar.");
        setResult(null);
      } else {
        setResult(res as QuickAnalysisResponseV11);
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao analisar.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-2">
        <div className="text-sm font-medium">Texto</div>
        <textarea
          className="w-full rounded-xl border p-3 min-h-[180px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Cole a conversa aqui"
        />
      </div>

      {/* ✅ Modo */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Modo</div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="quickMode"
              checked={quickMode === "RESUMO"}
              onChange={() => setQuickMode("RESUMO")}
            />
            <span>Receber análise</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="quickMode"
              checked={quickMode === "RESPONDER"}
              onChange={() => setQuickMode("RESPONDER")}
            />
            <span>Opções de resposta</span>
          </label>
        </div>
      </div>

      <button
        className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
        onClick={handleAnalyze}
        disabled={loading || text.trim().length === 0}
      >
        {loading ? "Analisando…" : "Analisar"}
      </button>

      {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}

      {/* ✅ Render correto */}
      {result && (
        <div className="pt-2">
          <ResultView data={result} quickMode={quickMode} />
        </div>
      )}
    </div>
  );
}
