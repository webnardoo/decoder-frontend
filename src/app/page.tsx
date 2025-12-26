"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import GuidedOverlay, { type GuidedOverlayStep } from "@/components/onboarding/GuidedOverlay";

type Mode = "AVULSA" | "CONVERSA";
type QuickMode = "RESUMO" | "RESPONDER";

type Banner = {
  title: string;
  reason: string;
  fix?: string;
};

type OnboardingStatus = {
  onboardingStage?: string;
  trialGuided?: boolean;
  trialActive?: boolean;
  trialAnalysisUsed?: boolean;
  trialReplyUsed?: boolean;
  trialStartPopupPending?: boolean;
  trialCompleted?: boolean;
};

const MIN_CHARS_NORMAL = 60;
const TRIAL_MIN = 60;
const TRIAL_MAX = 200;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isApiError(x: any): x is ApiError {
  return (
    x &&
    typeof x === "object" &&
    typeof x.code === "string" &&
    typeof x.message === "string"
  );
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

function clampTextForTrial(input: string) {
  const t = input ?? "";
  if (t.length <= TRIAL_MAX) return t;
  return t.slice(0, TRIAL_MAX);
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("AVULSA");

  // UI do app: "Receber análise" = RESUMO, "Opções de respostas" = RESPONDER
  const [quickMode, setQuickMode] = useState<QuickMode>("RESUMO");

  const [conversaId, setConversaId] = useState<string>("");

  const [conversation, setConversation] = useState("");
  const [relationshipType, setRelationshipType] =
    useState<RelationshipType>("ROMANTICA");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickAnalysisResponseV11 | null>(null);

  const [banner, setBanner] = useState<Banner | null>(null);

  const [conversas, setConversas] = useState<{ id: string; name: string }[]>([]);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  // ---- TRIAL / ONBOARDING ----
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [showTrialStart, setShowTrialStart] = useState(false);
  const [showTrialEnd, setShowTrialEnd] = useState(false);

  // step-machine local (UI)
  const [stepId, setStepId] = useState<string | null>(null);
  const blockedClicksRef = useRef(0);

  // foco do popup final
  const finishBtnRef = useRef<HTMLButtonElement | null>(null);

  const inConversaMode = mode === "CONVERSA";
  const hasConversaSelected = !!conversaId;

  useEffect(() => {
    const list = listConversas().map((c) => ({ id: c.id, name: c.name }));
    setConversas(list);
  }, []);

  async function refreshOnboarding() {
    try {
      const res = await fetch("/api/onboarding/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as OnboardingStatus;
      setOnboarding(data);

      const isTrialActive =
        data?.onboardingStage === "TRIAL_ACTIVE" && data?.trialGuided === true;

      if (isTrialActive && data?.trialStartPopupPending === true) {
        setShowTrialStart(true);
      }
      if (!isTrialActive) {
        setShowTrialStart(false);
        setShowTrialEnd(false);
        setStepId(null);
      }
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    refreshOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isTrialGuided =
    onboarding?.onboardingStage === "TRIAL_ACTIVE" &&
    onboarding?.trialGuided === true &&
    onboarding?.trialActive === true &&
    onboarding?.trialCompleted !== true;

  // regra editorial no trial: 60–200 chars
  const effectiveText = isTrialGuided
    ? clampTextForTrial(conversation)
    : conversation;

  const chars = effectiveText.length;
  const minChars = isTrialGuided ? TRIAL_MIN : MIN_CHARS_NORMAL;
  const charsOk = chars >= minChars;
  const charsClass = charsOk ? "text-emerald-400" : "text-red-400";

  const canClickAnalyze = useMemo(() => !loading, [loading]);

  function changeMode(next: Mode) {
    if (loading || next === mode) return;
    setMode(next);
    setResult(null);
    setBanner(null);
    if (next === "CONVERSA") setConversaId("");
  }

  function markStepIfNull(next: string) {
    setStepId((cur) => cur ?? next);
  }

  // inicia o guided após OK do popup inicial
  async function ackTrialStart() {
    try {
      // ✅ rota correta do FRONT (proxy) — não chama /api/v1 direto
      await fetch("/api/onboarding/trial/start/ack", {
        method: "POST",
      }).catch(() => null);
    } finally {
      setShowTrialStart(false);
      setStepId("S1_SELECT_SUMMARY_MODE");
      refreshOnboarding();
    }
  }

  async function finishTrial() {
    try {
      // ✅ rota correta do FRONT (proxy) — não chama /api/v1 direto
      await fetch("/api/onboarding/trial/complete/ack", {
        method: "POST",
      }).catch(() => null);
    } finally {
      setShowTrialEnd(false);
      setStepId(null);
      refreshOnboarding();
      // redirect canônico pós-trial
      window.location.href = "/billing/plan";
    }
  }

  // ✅ garante foco no popup final
  useEffect(() => {
    if (!isTrialGuided) return;
    if (!showTrialEnd) return;

    const t = window.setTimeout(() => {
      try {
        finishBtnRef.current?.focus();
      } catch {}
    }, 0);

    return () => window.clearTimeout(t);
  }, [isTrialGuided, showTrialEnd]);

  async function onAnalyze() {
    if (loading) return;

    setBanner(null);
    setResult(null);

    if (inConversaMode && !hasConversaSelected) {
      setBanner({
        title: "Selecione uma conversa",
        reason:
          "No modo dentro de uma conversa, a análise precisa estar vinculada a uma conversa.",
        fix: "Selecione uma conversa e tente novamente.",
      });
      return;
    }

    // validação canônica do texto (já existe)
    const validation = validateConversationText(effectiveText);
    if (!validation.ok) {
      const ux = getConversationValidationMessage(
        validation.code,
        validation.stats
      );
      setBanner({ title: ux.title, reason: ux.reason, fix: ux.fix });
      return;
    }

    // regra trial (60–200) adicional defensiva
    if (isTrialGuided) {
      if (effectiveText.length < TRIAL_MIN || effectiveText.length > TRIAL_MAX) {
        setBanner({
          title: "Texto fora do padrão do trial",
          reason: `No modo degustação, use entre ${TRIAL_MIN} e ${TRIAL_MAX} caracteres.`,
          fix: "Ajuste o texto e tente novamente.",
        });
        return;
      }
    }

    setLoading(true);

    try {
      await sleep(80);

      const r = await analyzeConversation({
        text: effectiveText,
        relationshipType,
        quickMode,
      });

      if (isApiError(r)) {
        if (r.status === 401) {
          setBanner({
            title: "Falha ao analisar",
            reason: "Sessão expirada. Faça login novamente.",
          });
          return;
        }

        if (r.status === 403 && isInsufficientCreditsPayload(r.payload)) {
          setBanner({
            title: "Falha ao analisar",
            reason: "Créditos insuficientes.",
          });
          return;
        }

        if (r.status === 409) {
          // trial já usado etc → força refresh do status
          await refreshOnboarding();
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

      // após sucesso, atualiza status (para flags do trial)
      await refreshOnboarding();
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // Guided steps (derivados)
  // -----------------------------
  useEffect(() => {
    if (!isTrialGuided) return;

    // se ainda não iniciou (aguardando popup), não setar step
    if (showTrialStart) return;

    // força modo AVULSA no trial (evita caminhos fora do roteiro)
    if (mode !== "AVULSA") setMode("AVULSA");

    // se step null, inicia
    if (!stepId) markStepIfNull("S1_SELECT_SUMMARY_MODE");

    // avanços automáticos (não-frágil)
    const hasText = effectiveText.length >= TRIAL_MIN;
    const hasResult = !!result;

    if (stepId === "S1_SELECT_SUMMARY_MODE") {
      if (quickMode === "RESUMO") setStepId("S2_PASTE_TEXT");
      return;
    }

    if (stepId === "S2_PASTE_TEXT") {
      if (hasText) setStepId("S3_SELECT_RELATIONSHIP");
      return;
    }

    if (stepId === "S3_SELECT_RELATIONSHIP") {
      return;
    }

    if (stepId === "S4_CLICK_ANALYZE") {
      if (hasResult && quickMode === "RESUMO") setStepId("S5_REVIEW_RESULT");
      return;
    }

    if (stepId === "S5_REVIEW_RESULT") {
      // ✅ agora o avanço é pelo clique direto em "Opções de respostas" (sem S6)
      return;
    }

    if (stepId === "R1_EXPLAIN_REPLY_MODE") {
      return;
    }

    if (stepId === "R2_CLICK_ANALYZE_REPLY") {
      if (hasResult && quickMode === "RESPONDER")
        setStepId("R3_REVIEW_REPLY_SUGGESTIONS");
      return;
    }

    if (stepId === "R3_REVIEW_REPLY_SUGGESTIONS") {
      return;
    }
  }, [
    isTrialGuided,
    showTrialStart,
    stepId,
    effectiveText,
    quickMode,
    relationshipType,
    result,
    mode,
  ]);

  const currentStep: GuidedOverlayStep | null = useMemo(() => {
    if (!isTrialGuided || showTrialStart) return null;
    if (!stepId) return null;

    // Parte A — RESUMO
    if (stepId === "S1_SELECT_SUMMARY_MODE") {
      return {
        id: stepId,
        targetTourId: "quick-mode-summary",
        title: "1/9 — Receber análise",
        body: "Clique em “Receber análise” para iniciar a degustação com uma leitura do diálogo.",
        requireTargetClick: true,
      };
    }

    if (stepId === "S2_PASTE_TEXT") {
      return {
        id: stepId,
        targetTourId: "quick-textarea",
        title: "2/9 — Cole o texto",
        body: `Cole um trecho do diálogo (${TRIAL_MIN}–${TRIAL_MAX} caracteres).`,
        requireTargetClick: false,
      };
    }

    if (stepId === "S3_SELECT_RELATIONSHIP") {
      return {
        id: stepId,
        targetTourId: "quick-relationship-option",
        title: "3/9 — Tipo de relação",
        body: "Escolha o tipo de relação (uma das 4 opções).",
        requireTargetClick: true,
      };
    }

    if (stepId === "S4_CLICK_ANALYZE") {
      return {
        id: stepId,
        targetTourId: "quick-analyze-button",
        title: "4/9 — Gerar análise",
        body: "Clique em “Analisar”.",
        requireTargetClick: true,
      };
    }

    // ✅ S5: clique direto no botão “Opções de respostas”,
    // mas destacando também score+análise.
    if (stepId === "S5_REVIEW_RESULT") {
      return {
        id: stepId,
        targetTourId: "quick-mode-reply",
        highlightTourIds: ["quick-score-card", "quick-analysis-card", "quick-mode-reply"],
        title: "5/9 — Resultado",
        body: "Veja o Score e a análise. Para continuar, clique em “Opções de respostas”.",
        requireTargetClick: true,
      };
    }

    // Parte B — RESPONDER
    if (stepId === "R1_EXPLAIN_REPLY_MODE") {
      return {
        id: stepId,
        targetTourId: "quick-analyze-button",
        title: "6/9 — Gerar respostas",
        body: "Agora vamos gerar sugestões. Clique em “Analisar”.",
        requireTargetClick: true,
      };
    }

    if (stepId === "R2_CLICK_ANALYZE_REPLY") {
      return {
        id: stepId,
        targetTourId: "quick-analyze-button",
        title: "7/9 — Confirmar geração",
        body: "Clique em “Analisar” para obter as sugestões de resposta.",
        requireTargetClick: true,
      };
    }

    if (stepId === "R3_REVIEW_REPLY_SUGGESTIONS") {
      return {
        id: stepId,
        targetTourId: "quick-reply-suggestions-card",
        title: "8/9 — Sugestões prontas",
        body: "Perfeito. Conclua a degustação para seguir para a assinatura.",
        requireTargetClick: false,
      };
    }

    return null;
  }, [isTrialGuided, showTrialStart, stepId]);

  function onOverlayAdvance() {
    if (!isTrialGuided || !stepId) return;

    if (stepId === "S1_SELECT_SUMMARY_MODE") {
      setQuickMode("RESUMO");
      setStepId("S2_PASTE_TEXT");
      return;
    }

    if (stepId === "S3_SELECT_RELATIONSHIP") {
      setStepId("S4_CLICK_ANALYZE");
      return;
    }

    if (stepId === "S4_CLICK_ANALYZE") {
      onAnalyze();
      return;
    }

    // ✅ clique em "Opções de respostas" no S5 já troca modo e avança
    if (stepId === "S5_REVIEW_RESULT") {
      setQuickMode("RESPONDER");
      setResult(null);
      setBanner(null);
      setStepId("R1_EXPLAIN_REPLY_MODE");
      return;
    }

    if (stepId === "R1_EXPLAIN_REPLY_MODE") {
      setResult(null);
      setBanner(null);
      setStepId("R2_CLICK_ANALYZE_REPLY");
      onAnalyze();
      return;
    }

    if (stepId === "R2_CLICK_ANALYZE_REPLY") {
      onAnalyze();
      return;
    }
  }

  useEffect(() => {
    if (!isTrialGuided || !stepId) return;

    if (stepId === "S4_CLICK_ANALYZE" && result && quickMode === "RESUMO") {
      setStepId("S5_REVIEW_RESULT");
      return;
    }

    if (
      (stepId === "R1_EXPLAIN_REPLY_MODE" || stepId === "R2_CLICK_ANALYZE_REPLY") &&
      result &&
      quickMode === "RESPONDER"
    ) {
      setStepId("R3_REVIEW_REPLY_SUGGESTIONS");
      setShowTrialEnd(true);
      return;
    }
  }, [isTrialGuided, stepId, result, quickMode]);

  // ✅ Overlay deve ficar DESLIGADO quando popup estiver aberto (senão disputa foco)
  const overlayEnabled = isTrialGuided && !showTrialStart && !showTrialEnd;

  return (
    <div className="p-6 space-y-6">
      {/* OVERLAY */}
      <GuidedOverlay
        enabled={overlayEnabled}
        step={currentStep}
        onAdvance={onOverlayAdvance}
        onBlockedClick={() => {
          blockedClicksRef.current += 1;
        }}
      />

      {/* POPUP INICIAL DO TRIAL */}
      {isTrialGuided && showTrialStart && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60">
          <div className="w-[min(520px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-lg font-semibold">
              Seja bem vindo a degustação do Hitch.Ai
            </div>
            <div className="text-sm text-zinc-300 mt-2">
              Você fará 1 análise (Receber análise) e 1 geração de respostas
              (Opções de respostas).
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={ackTrialStart}
              >
                Começar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP FINAL DO TRIAL */}
      {isTrialGuided && showTrialEnd && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60">
          <div className="w-[min(520px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-lg font-semibold">Degustação concluída</div>
            <div className="text-sm text-zinc-300 mt-2">
              Agora o próximo passo é escolher um plano para continuar usando.
            </div>
            <div className="mt-4 flex gap-2">
              <button
                ref={finishBtnRef}
                className="btn btn-primary"
                type="button"
                onClick={finishTrial}
              >
                Concluir degustação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Decoder</h1>
          <p className="text-sm text-zinc-400">Análise Avulsa / Dentro de Conversa</p>
          {creditsBalance != null && (
            <p className="text-xs text-zinc-500">Saldo: {creditsBalance} créditos</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link className="btn" href="/conversas">Conversas</Link>
          <Link className="btn" href="/account/subscription">Assinatura</Link>
        </div>
      </div>

      {/* MODO (bloqueado no trial) */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`btn ${mode === "AVULSA" ? "btn-primary" : ""}`}
          onClick={() => !isTrialGuided && changeMode("AVULSA")}
          disabled={loading || isTrialGuided}
          type="button"
        >
          Avulsa
        </button>
        <button
          className={`btn ${mode === "CONVERSA" ? "btn-primary" : ""}`}
          onClick={() => !isTrialGuided && changeMode("CONVERSA")}
          disabled={loading || isTrialGuided}
          type="button"
        >
          Dentro de conversa
        </button>
      </div>

      {/* CARD QUICK */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-zinc-500">Texto</div>
          <div className={`text-xs font-medium ${charsClass}`}>
            {chars} caracteres
            {isTrialGuided ? ` (trial: ${TRIAL_MIN}–${TRIAL_MAX})` : ""}
          </div>
        </div>

        <textarea
          data-tour-id="quick-textarea"
          className="w-full rounded-xl border p-3 min-h-45"
          value={effectiveText}
          onChange={(e) => {
            const raw = e.target.value;
            setConversation(isTrialGuided ? clampTextForTrial(raw) : raw);
          }}
          placeholder="Cole o diálogo aqui…"
          disabled={loading}
        />

        <div className="text-xs text-zinc-500">Modo</div>
        <div className="flex gap-3">
          <button
            data-tour-id="quick-mode-summary"
            className={`btn ${quickMode === "RESUMO" ? "btn-primary" : ""}`}
            onClick={() => {
              if (
                isTrialGuided &&
                stepId &&
                stepId !== "S1_SELECT_SUMMARY_MODE" &&
                stepId !== "S2_PASTE_TEXT" &&
                stepId !== "S3_SELECT_RELATIONSHIP" &&
                stepId !== "S4_CLICK_ANALYZE" &&
                stepId !== "S5_REVIEW_RESULT"
              )
                return;
              setQuickMode("RESUMO");
              if (isTrialGuided && stepId === "S1_SELECT_SUMMARY_MODE")
                setStepId("S2_PASTE_TEXT");
            }}
            disabled={loading}
            type="button"
          >
            Receber análise
          </button>

          <button
            data-tour-id="quick-mode-reply"
            className={`btn ${quickMode === "RESPONDER" ? "btn-primary" : ""}`}
            onClick={() => {
              if (isTrialGuided) {
                // ✅ agora libera no S5 (clique direto no botão)
                if (stepId !== "S5_REVIEW_RESULT") return;
              }
              setQuickMode("RESPONDER");
              setResult(null);
              setBanner(null);
            }}
            disabled={loading}
            type="button"
          >
            Opções de respostas
          </button>
        </div>

        <div className="text-xs text-zinc-500">Tipo de relação</div>
        <div className="flex flex-wrap gap-2" data-tour-id="quick-relationship-option">
          {relationshipOptions.map((opt) => (
            <button
              key={opt.value}
              className={`btn ${relationshipType === opt.value ? "btn-primary" : ""}`}
              onClick={() => {
                setRelationshipType(opt.value);
                if (isTrialGuided && stepId === "S3_SELECT_RELATIONSHIP")
                  setStepId("S4_CLICK_ANALYZE");
              }}
              disabled={loading}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          data-tour-id="quick-analyze-button"
          className="btn btn-primary"
          onClick={() => {
            if (isTrialGuided) {
              // RESUMO: só no passo certo
              if (quickMode === "RESUMO" && stepId !== "S4_CLICK_ANALYZE") return;
              // RESPONDER: só no passo certo
              if (
                quickMode === "RESPONDER" &&
                !(stepId === "R1_EXPLAIN_REPLY_MODE" || stepId === "R2_CLICK_ANALYZE_REPLY")
              )
                return;
            }
            onAnalyze();
          }}
          disabled={!canClickAnalyze}
          type="button"
        >
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

      {/* ResultView exige quickMode */}
      {result && <ResultView data={result} quickMode={quickMode} />}

      {/* helper trial: no step S5, orienta o clique */}
      {isTrialGuided && stepId === "S5_REVIEW_RESULT" && (
        <div className="text-xs text-zinc-500">
          Continue clicando em <span className="text-zinc-200">Opções de respostas</span>.
        </div>
      )}
    </div>
  );
}
