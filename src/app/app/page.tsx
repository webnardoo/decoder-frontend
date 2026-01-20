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
import GuidedOverlay, {
  type GuidedOverlayStep,
} from "@/components/onboarding/GuidedOverlay";

type Mode = "AVULSA" | "CONVERSA";
type QuickMode = "RESUMO" | "RESPONDER";

type Banner = {
  title: string;
  reason: string;
  fix?: string;
};

type Journey = "PAID" | "TRIAL" | "UNKNOWN" | string;

type OnboardingStatus = {
  onboardingStage?: string;
  trialGuided?: boolean;
  trialActive?: boolean;
  trialAnalysisUsed?: boolean;
  trialReplyUsed?: boolean;
  trialStartPopupPending?: boolean;
  trialCompleted?: boolean;

  // >>> adicionados para UI (sem quebrar contrato: se não vier, fica undefined)
  dialogueNickname?: string;
  creditsBalance?: number;

  // >>> NOVO: se vier, usamos pra bypass do onboarding guiado
  journey?: Journey;
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

function getFocusableWithin(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(
      `a[href],button,input,textarea,select,[tabindex]:not([tabindex="-1"])`
    )
  );

  const isVisible = (el: HTMLElement) => {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if ((el as any).disabled) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    return true;
  };

  const isFocusable = (el: HTMLElement) => {
    const tag = el.tagName;
    if (
      tag === "BUTTON" ||
      tag === "A" ||
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT"
    )
      return true;

    const ti = el.getAttribute("tabindex");
    if (ti != null) {
      const n = Number(ti);
      return Number.isFinite(n) && n >= 0;
    }
    return false;
  };

  const list = nodes.filter((x) => isFocusable(x) && isVisible(x));
  return Array.from(new Set(list));
}

function focusTrapKeydown(e: React.KeyboardEvent, container: HTMLElement | null) {
  if (e.key !== "Tab") return;

  const focusables = getFocusableWithin(container);
  if (focusables.length === 0) {
    e.preventDefault();
    return;
  }

  const active = document.activeElement as HTMLElement | null;
  const idx = active ? focusables.indexOf(active) : -1;

  e.preventDefault();

  const nextIdx = (() => {
    if (e.shiftKey) {
      if (idx <= 0) return focusables.length - 1;
      return idx - 1;
    }
    if (idx < 0 || idx >= focusables.length - 1) return 0;
    return idx + 1;
  })();

  focusables[nextIdx]?.focus?.();
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("AVULSA");

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

  const [stepId, setStepId] = useState<string | null>(null);
  const blockedClicksRef = useRef(0);

  const finishBtnRef = useRef<HTMLButtonElement | null>(null);

  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const startModalRef = useRef<HTMLDivElement | null>(null);
  const endModalRef = useRef<HTMLDivElement | null>(null);

  const inConversaMode = mode === "CONVERSA";
  const hasConversaSelected = !!conversaId;

  // ✅ bypass one-shot: se veio do pós-checkout, não deixa onboarding “invadir”
  const [skipOnboardingOnce, setSkipOnboardingOnce] = useState(false);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem("hitch_skip_onboarding_once");
      if (v === "1") {
        setSkipOnboardingOnce(true);
        sessionStorage.removeItem("hitch_skip_onboarding_once");
      }
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    const list = listConversas().map((c) => ({ id: c.id, name: c.name }));
    setConversas(list);
  }, []);

  // >>> helper: paid journey bypass
  const isPaidJourney = String(onboarding?.journey ?? "").toUpperCase() === "PAID";

  async function refreshOnboarding() {
    try {
      const res = await fetch("/api/onboarding/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as OnboardingStatus;
      setOnboarding(data);

      // se backend já retornar saldo, usa como baseline
      if (typeof data?.creditsBalance === "number") {
        setCreditsBalance((cur) =>
          typeof cur === "number" ? cur : data.creditsBalance!
        );
      }

      // ✅ bypass one-shot tem prioridade (independe de journey)
      if (skipOnboardingOnce) {
        setShowTrialStart(false);
        setShowTrialEnd(false);
        setStepId(null);
        return;
      }

      // >>> BYPASS: se for PAID, NUNCA ativa trial guiado/popup
      const isPaid = String(data?.journey ?? "").toUpperCase() === "PAID";
      if (isPaid) {
        setShowTrialStart(false);
        setShowTrialEnd(false);
        setStepId(null);
        return;
      }

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
  }, [skipOnboardingOnce]);

  // >>> BYPASS: paid nunca entra no guided trial, mesmo que backend retorne TRIAL_ACTIVE
  // ✅ também bypassa no one-shot
  const isTrialGuided =
    !skipOnboardingOnce &&
    !isPaidJourney &&
    onboarding?.onboardingStage === "TRIAL_ACTIVE" &&
    onboarding?.trialGuided === true &&
    onboarding?.trialActive === true &&
    onboarding?.trialCompleted !== true;

  const effectiveText = isTrialGuided
    ? clampTextForTrial(conversation)
    : conversation;

  const chars = effectiveText.length;
  const minChars = isTrialGuided ? TRIAL_MIN : MIN_CHARS_NORMAL;
  const charsOk = chars >= minChars;
  const charsClass = charsOk ? "text-emerald-400" : "text-red-400";

  const canClickAnalyze = useMemo(() => !loading, [loading]);

  function markStepIfNull(next: string) {
    setStepId((cur) => cur ?? next);
  }

  async function ackTrialStart() {
    try {
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
      await fetch("/api/onboarding/trial/complete/ack", {
        method: "POST",
      }).catch(() => null);
    } finally {
      setShowTrialEnd(false);
      setStepId(null);
      refreshOnboarding();
      window.location.href = "/billing/plan";
    }
  }

  useEffect(() => {
    if (!isTrialGuided) return;
    if (!showTrialStart) return;

    const prev = document.activeElement as HTMLElement | null;

    const t = window.setTimeout(() => {
      try {
        startBtnRef.current?.focus();
      } catch {}
    }, 0);

    const onFocusIn = (e: FocusEvent) => {
      const modal = startModalRef.current;
      if (!modal) return;
      const target = e.target as Node | null;
      if (target && modal.contains(target)) return;

      try {
        startBtnRef.current?.focus();
      } catch {}
    };

    document.addEventListener("focusin", onFocusIn, true);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("focusin", onFocusIn, true);
      try {
        prev?.focus?.();
      } catch {}
    };
  }, [isTrialGuided, showTrialStart]);

  useEffect(() => {
    if (!isTrialGuided) return;
    if (!showTrialEnd) return;

    const prev = document.activeElement as HTMLElement | null;

    const t = window.setTimeout(() => {
      try {
        finishBtnRef.current?.focus();
      } catch {}
    }, 0);

    const onFocusIn = (e: FocusEvent) => {
      const modal = endModalRef.current;
      if (!modal) return;
      const target = e.target as Node | null;
      if (target && modal.contains(target)) return;

      try {
        finishBtnRef.current?.focus();
      } catch {}
    };

    document.addEventListener("focusin", onFocusIn, true);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("focusin", onFocusIn, true);
      try {
        prev?.focus?.();
      } catch {}
    };
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

    const validation = validateConversationText(effectiveText);
    if (!validation.ok) {
      const ux = getConversationValidationMessage(
        validation.code,
        validation.stats
      );
      setBanner({ title: ux.title, reason: ux.reason, fix: ux.fix });
      return;
    }

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
        creditsUsed:
          typeof data?.creditsUsed === "number" ? data.creditsUsed : null,
      });

      await refreshOnboarding();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isTrialGuided) return;
    if (showTrialStart) return;

    if (mode !== "AVULSA") setMode("AVULSA");

    if (!stepId) markStepIfNull("S1_SELECT_SUMMARY_MODE");

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

    if (stepId === "S4_CLICK_ANALYZE") {
      if (hasResult && quickMode === "RESUMO") setStepId("S5_REVIEW_RESULT");
      return;
    }

    if (stepId === "R2_CLICK_ANALYZE_REPLY") {
      if (hasResult && quickMode === "RESPONDER")
        setStepId("R3_REVIEW_REPLY_SUGGESTIONS");
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

    if (stepId === "S5_REVIEW_RESULT") {
      return {
        id: stepId,
        targetTourId: "quick-mode-reply",
        highlightTourIds: [
          "quick-score-card",
          "quick-analysis-card",
          "quick-mode-reply",
        ],
        title: "5/9 — Resultado",
        body: "Veja o Score e a análise. Para continuar, clique em “Opções de respostas”.",
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

    if (stepId === "S5_REVIEW_RESULT") {
      setQuickMode("RESPONDER");
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
      stepId === "R2_CLICK_ANALYZE_REPLY" &&
      result &&
      quickMode === "RESPONDER"
    ) {
      setStepId("R3_REVIEW_REPLY_SUGGESTIONS");
      setShowTrialEnd(true);
      return;
    }
  }, [isTrialGuided, stepId, result, quickMode]);

  const overlayEnabled = isTrialGuided && !showTrialStart && !showTrialEnd;

  const nicknameLabel =
    (onboarding?.dialogueNickname ?? "").toString().trim() || "—";

  const balanceLabel =
    typeof creditsBalance === "number"
      ? `${creditsBalance} créditos`
      : typeof onboarding?.creditsBalance === "number"
      ? `${onboarding.creditsBalance} créditos`
      : "—";

  return (
    <div className="p-6 space-y-8">
      <GuidedOverlay
        enabled={overlayEnabled}
        step={currentStep}
        onAdvance={onOverlayAdvance}
        onBlockedClick={() => {
          blockedClicksRef.current += 1;
        }}
      />

      {isTrialGuided && showTrialStart && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60">
          <div
            ref={startModalRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onKeyDown={(e) => focusTrapKeydown(e, startModalRef.current)}
            className="w-[min(520px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="text-lg font-semibold">
              Seja bem vindo a degustação do Hitch.Ai
            </div>
            <div className="text-sm text-zinc-300 mt-2">
              Você fará 1 análise (Receber análise) e 1 geração de respostas
              (Opções de respostas).
            </div>

            <div className="mt-4 flex gap-2">
              <button
                ref={startBtnRef}
                className="btn btn-cta"
                type="button"
                onClick={ackTrialStart}
              >
                Começar
              </button>
            </div>
          </div>
        </div>
      )}

      {isTrialGuided && showTrialEnd && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60">
          <div
            ref={endModalRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onKeyDown={(e) => focusTrapKeydown(e, endModalRef.current)}
            className="w-[min(520px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="text-lg font-semibold">Degustação concluída</div>
            <div className="text-sm text-zinc-300 mt-2">
              Agora o próximo passo é escolher um plano para continuar usando.
            </div>
            <div className="mt-4 flex gap-2">
              <button
                ref={finishBtnRef}
                className="btn btn-cta"
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
        <div className="space-y-2">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
            Hitch.ai
          </h1>
          <p className="text-sm text-zinc-300/80 leading-relaxed">
            Cole o diálogo e receba uma leitura clara do contexto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link className="btn" href="/app/conta">
            Conta
          </Link>
        </div>
      </div>

      {/* CARD QUICK */}
      <div className="card card-premium p-6 space-y-4">
        {/* Identificação */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-[rgba(255,255,255,0.10)] bg-white/[0.02] px-4 py-3">
          {/* esquerda */}
          <div className="flex items-center gap-2 text-xs text-zinc-200/80 min-w-0">
            <span className="shrink-0">
              Você será identificado nos diálogos como
            </span>

            <div className="relative group shrink-0">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[11px] font-semibold text-zinc-200/80 cursor-default">
                i
              </span>

              <div className="pointer-events-none absolute left-0 top-7 z-20 hidden w-[320px] rounded-2xl border border-white/10 bg-black/90 p-3 text-xs text-zinc-200/90 shadow-[0_18px_55px_rgba(0,0,0,0.65)] group-hover:block">
                <div className="font-semibold mb-1 text-zinc-100">
                  Por que isso é obrigatório?
                </div>
                <p className="text-zinc-200/80 leading-relaxed">
                  O sistema usa esse nome para separar você da outra pessoa no
                  diálogo.
                  <br />
                  Se o nome não corresponder ao que aparece na conversa, a
                  interpretação do contexto fica incorreta e a qualidade da
                  análise e, principalmente, das respostas sugeridas será
                  comprometida.
                </p>
              </div>
            </div>

            {/* nickname alinhado logo após o i */}
            <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold text-zinc-100/90">
              {nicknameLabel}
            </span>
          </div>

          {/* direita */}
          <div className="text-xs text-zinc-300/80 whitespace-nowrap">
            Seu saldo atual de créditos é de:{" "}
            <span className="text-zinc-100 font-semibold">{balanceLabel}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="label">Texto</div>
          <div className={`text-xs font-medium ${charsClass}`}>
            {chars} caracteres
            {isTrialGuided ? ` (trial: ${TRIAL_MIN}–${TRIAL_MAX})` : ""}
          </div>
        </div>

        <textarea
          data-tour-id="quick-textarea"
          className="input min-h-52 resize-none"
          value={effectiveText}
          onChange={(e) => {
            const raw = e.target.value;
            setConversation(isTrialGuided ? clampTextForTrial(raw) : raw);
          }}
          placeholder="Cole o diálogo aqui…"
          disabled={loading}
        />

        <div className="label">Modo</div>

        <div className="segmented w-fit gap-1">
          <button
            data-tour-id="quick-mode-summary"
            className={`btn-seg ${
              quickMode === "RESUMO" ? "btn-seg-active" : ""
            }`}
            onClick={() => {
              setQuickMode("RESUMO");
            }}
            disabled={loading}
            type="button"
          >
            Receber análise
          </button>

          <button
            data-tour-id="quick-mode-reply"
            className={`btn-seg ${
              quickMode === "RESPONDER" ? "btn-seg-active" : ""
            }`}
            onClick={() => {
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

        <div className="label pt-2">Tipo de relação</div>
        <div
          className="flex flex-wrap gap-2"
          data-tour-id="quick-relationship-option"
        >
          {relationshipOptions.map((opt) => (
            <button
              key={opt.value}
              className={`chip ${
                relationshipType === opt.value ? "chip-active" : ""
              }`}
              onClick={() => setRelationshipType(opt.value)}
              disabled={loading}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          data-tour-id="quick-analyze-button"
          className="btn-cta w-full mt-2"
          onClick={onAnalyze}
          disabled={!canClickAnalyze}
          type="button"
        >
          {loading ? "Analisando…" : "Analisar"}
        </button>

        {banner && (
          <div className="rounded-2xl border border-zinc-800/70 bg-black/30 p-4 text-sm">
            <div className="font-medium">{banner.title}</div>
            <div className="text-zinc-300/80">{banner.reason}</div>
            {banner.fix && (
              <div className="text-zinc-300/70">{banner.fix}</div>
            )}
          </div>
        )}
      </div>

      {loading && <LoaderCard />}

      {result && <ResultView data={result} quickMode={quickMode} />}
    </div>
  );
}
