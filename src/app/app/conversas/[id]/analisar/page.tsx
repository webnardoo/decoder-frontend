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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Análise de Conversa</h1>
          <p className="text-sm text-zinc-400">
            Cole o diálogo e receba a análise.
          </p>
        </div>

        <Link className="btn w-full sm:w-auto" href={`/conversas/${params.id}`}>
          Voltar
        </Link>
      </div>

      {/* Card */}
      <div className="card p-5 space-y-4">
        {/* Identificação */}
        <div className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="text-xs text-zinc-300">
            Você será identificado nos diálogos como{" "}
            <span className="font-semibold text-white">Leonardo</span>
          </div>

          <div className="relative group ml-auto">
            <span className="cursor-pointer text-zinc-400 text-xs">i</span>
            <div className="absolute right-0 top-5 z-10 hidden w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-200 group-hover:block">
              <div className="font-semibold mb-1">Por que isso é obrigatório?</div>
              <p>
                O sistema usa esse nome para separar você da outra pessoa no diálogo.
                <br />
                <br />
                Se o nome não corresponder ao que aparece na conversa, a interpretação
                do contexto fica incorreta e a qualidade da análise e, principalmente,
                das respostas sugeridas será comprometida.
              </p>
            </div>
          </div>
        </div>

        {/* Texto */}
        <div>
          <label className="label">Diálogo</label>
          <textarea
            className="input min-h-[220px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cole a conversa aqui"
          />
          <div className="mt-1 text-xs text-zinc-500">
            {text.length} caractere(s)
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className="btn btn-primary w-full sm:w-auto"
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? "Analisando…" : "Analisar"}
          </button>

          <Link className="btn w-full sm:w-auto" href={`/conversas/${params.id}`}>
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
