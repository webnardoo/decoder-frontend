"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { RelationshipType, relationshipOptions } from "@/lib/relationships";
import {
  analyzeConversation,
  ApiError,
  type QuickAnalyzeSuccess,
} from "@/lib/analyze-client";
import { ResultView } from "@/components/result-view";
import { saveHistoryItem } from "@/lib/history";
import { addConversaAnalysis, getConversa } from "@/lib/conversas";
import {
  MIN_NON_WHITESPACE_LENGTH,
  validateConversationText,
} from "@/lib/validation/conversation";
import { getConversationValidationMessage } from "@/lib/validation/conversationMessages";
import { fetchPlanContext, type PlanContext } from "@/lib/subscriptions-context";

type Banner = {
  title: string;
  reason: string;
  fix: string;
};

type QuickState =
  | "IDLE"
  | "LOADING"
  | "SUCCESS"
  | "BLOCKED_INSUFFICIENT"
  | "UNAUTH"
  | "ERROR";

export default function AnalyzeInConversationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [conversaName, setConversaName] = useState<string>("");
  const [conversation, setConversation] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType>("ROMANTICA");

  const [planContext, setPlanContext] = useState<PlanContext | null>(null);

  const [state, setState] = useState<QuickState>("IDLE");
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<QuickAnalyzeSuccess | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const c = getConversa(id);
    if (!c) return;
    setConversaName(c.name);
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ctx = await fetchPlanContext();
        if (!alive) return;
        setPlanContext(ctx);
      } catch {
        if (!alive) return;
        setPlanContext(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const usefulChars = useMemo(() => {
    return conversation.replace(/\s+/g, "").length;
  }, [conversation]);

  const meetsMinChars = usefulChars >= MIN_NON_WHITESPACE_LENGTH;

  const counterClass = meetsMinChars ? "text-emerald-300" : "text-red-300";
  const counterIcon = meetsMinChars ? "✅" : "";
  const counterAnim = meetsMinChars ? "" : "animate-pulse";

  const helperText = `Regra mínima: ${MIN_NON_WHITESPACE_LENGTH} caracteres úteis (sem espaços).`;

  async function runQuick() {
    if (loading) return;

    setBanner(null);
    setResult(null);

    const c = getConversa(id);
    if (!c) {
      setState("ERROR");
      setBanner({
        title: "Conversa não encontrada",
        reason: "Essa conversa não existe mais (ou foi removida).",
        fix: "Volte para Conversas e abra uma conversa válida.",
      });
      return;
    }

    const v = validateConversationText(conversation);
    if (!v.ok) {
      const msg = getConversationValidationMessage(v.code, v.stats);
      setBanner(msg);
      setState("IDLE");
      return;
    }

    setState("LOADING");
    setLoading(true);

    const normalizedText = v.normalized;

    try {
      const data = await analyzeConversation({
        conversation: normalizedText,
        relationshipType,
      });

      setResult(data);
      setState("SUCCESS");

      const score =
        typeof data?.score?.value === "number" ? data.score.value : null;
      const label =
        typeof data?.score?.label === "string" ? data.score.label : null;

      const messageCountApprox =
        typeof data?.meta?.messageCountApprox === "number"
          ? data.meta.messageCountApprox
          : Math.max(1, Math.round(normalizedText.length / 40));

      const creditsUsed =
        typeof data?.creditsUsed === "number" ? data.creditsUsed : null;

      saveHistoryItem({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        relationshipType,
        messageCountApprox,
        score,
        containerId: id,
        creditsUsed,
      });

      addConversaAnalysis({
        conversaId: id,
        score,
        label,
        messageCountApprox,
        creditsUsed,
      });
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          setState("UNAUTH");
          router.push("/login");
          return;
        }

        if (e.status === 403 && e.code === "INSUFFICIENT_CREDITS") {
          setState("BLOCKED_INSUFFICIENT");
          return;
        }
      }

      setState("ERROR");
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
    setState("IDLE");
  }

  const title = `Realize a análise de um diálogo para conversa ${
    conversaName ? conversaName : `[${id}]`
  }`;

  const isUnlimited = planContext?.isUnlimited === true;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      {/* FORM */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">{helperText}</div>

          <div
            className={`text-xs tabular-nums transition-colors duration-300 ${counterClass} ${counterAnim}`}
            title="Contador de caracteres úteis (sem espaços)"
          >
            {usefulChars}/{MIN_NON_WHITESPACE_LENGTH} {counterIcon}
          </div>
        </div>

        <textarea
          className="input min-h-[190px] resize-y"
          placeholder="Cole aqui a conversa…"
          value={conversation}
          onChange={(e) => {
            setConversation(e.target.value);
            if (banner) setBanner(null);
          }}
          disabled={loading}
        />

        <div className="flex flex-wrap gap-2">
          {relationshipOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`btn ${opt.value === relationshipType ? "btn-primary" : ""}`}
              onClick={() => setRelationshipType(opt.value)}
              disabled={loading}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {banner && (
          <div className="rounded-xl border border-yellow-700/30 bg-yellow-950/20 p-3 text-sm text-yellow-100/90 space-y-1">
            <div className="font-medium">{banner.title}</div>
            <div className="text-yellow-100/80">{banner.reason}</div>
            <div className="text-yellow-100/90">{banner.fix}</div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            className={`btn btn-primary ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={loading}
            onClick={runQuick}
          >
            Analisar
          </button>

          <button className="btn" onClick={onClear} disabled={loading}>
            Limpar
          </button>

          <Link className="btn" href={`/conversas/${id}`}>
            Voltar
          </Link>
        </div>
      </div>

      {/* LOADING (microcopy oficial) */}
      {state === "LOADING" && (
        <div className="card p-5">
          <div className="text-sm text-zinc-400">Analisando a conversa…</div>
        </div>
      )}

      {/* BLOCKED */}
      {state === "BLOCKED_INSUFFICIENT" && (
        <div className="card p-5 space-y-2">
          <div className="text-sm font-semibold">Créditos insuficientes</div>
          <div className="text-sm text-zinc-400">
            Você não tem saldo para concluir esta análise agora.
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" type="button" onClick={() => setState("IDLE")} disabled={loading}>
              Voltar
            </button>
            <Link className="btn" href="/account/credits">
              Ver créditos
            </Link>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {state === "SUCCESS" && result && (
        <div className="space-y-4">
          <div className="card p-5 space-y-2">
            <div className="text-sm font-semibold">Análise concluída</div>

            {/* Saldo/consumo (regra ilimitado) */}
            {isUnlimited ? (
              <div className="text-sm text-zinc-300">
                Plano ilimitado: créditos não são consumidos.
              </div>
            ) : (
              <div className="text-sm text-zinc-300">
                Consumiu <span className="font-semibold text-zinc-50">{result.creditsUsed}</span>{" "}
                crédito(s). Saldo após:{" "}
                <span className="font-semibold text-zinc-50">{result.creditsBalanceAfter}</span>.
              </div>
            )}
          </div>

          <ResultView result={result} />

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="button" onClick={() => setState("IDLE")} disabled={loading}>
              Fazer outra análise
            </button>
            <Link className="btn" href={`/conversas/${id}`}>
              Voltar para a conversa
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
