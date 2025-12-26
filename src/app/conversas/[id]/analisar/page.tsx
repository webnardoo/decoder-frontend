"use client";

import { useState } from "react";
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
    <div className="p-6 space-y-4">
      <textarea
        className="w-full border p-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Cole a conversa aqui"
      />

      <button
        className="px-4 py-2 bg-black text-white disabled:opacity-60"
        onClick={handleAnalyze}
        disabled={loading}
      >
        {loading ? "Analisando…" : "Analisar"}
      </button>

      {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}

      {result && (
        <pre className="bg-gray-100 p-4 text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
