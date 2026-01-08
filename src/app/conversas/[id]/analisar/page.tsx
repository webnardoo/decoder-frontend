// FRONT — src/app/conversas/[id]/analisar/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { analyzeConversation } from "@/lib/analyze-client";

export default function AnalisarPage({ params }: { params: { id: string } }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleAnalyze() {
    setErrorMsg(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await analyzeConversation({
        text,
        relationshipType: "ROMANTICA",
      });

      setResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao analisar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Fazer análise</h1>
          <p className="text-sm text-zinc-400">
            Cole o diálogo e gere a análise para esta conversa.
          </p>
        </div>

        <Link className="btn shrink-0" href={`/conversas/${params.id}`}>
          Voltar
        </Link>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Diálogo</label>
          <textarea
            className="input min-h-[240px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole a conversa aqui"
          />
          <div className="mt-2 text-xs text-zinc-500">
            {text.length} caractere(s)
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className="btn btn-primary w-full sm:w-auto"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? "Analisando…" : "Analisar"}
          </button>

          <Link
            className="btn w-full sm:w-auto"
            href={`/conversas/${params.id}`}
          >
            Cancelar
          </Link>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMsg}
          </div>
        )}
      </div>

      {result && (
        <div className="card p-5">
          <div className="text-sm font-semibold mb-3">Resultado</div>
          <pre className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-200 overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
