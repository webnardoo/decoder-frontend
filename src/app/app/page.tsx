// src/app/app/page.tsx
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { analyzeConversation } from "@/lib/analyze-client";
import type { ApiError } from "@/lib/analyze-client";
import type { RelationshipType } from "@/lib/relationships";
import { relationshipOptions } from "@/lib/relationships";
import { ResultView } from "@/components/result-view";
import type { QuickAnalysisResponseV11 } from "@/components/result-view";
import { saveHistoryItem } from "@/lib/history";
import { listConversas } from "@/lib/conversas";
import { validateConversationText } from "@/lib/validation/conversation";
import { getConversationValidationMessage } from "@/lib/validation/conversationMessages";
import GuidedOverlay, { type GuidedOverlayStep } from "@/components/onboarding/GuidedOverlay";

import OcrFilesSortModal from "@/components/ocr/OcrFilesSortModal";
import OcrProgressModal from "@/components/ocr/OcrProgressModal";

import AnalysisProgressModal, {
  type AnalysisProgressStatus,
  type AnalysisStepView,
  type AnalysisStepKey,
} from "@/components/analysis/AnalysisProgressModal";

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

  dialogueNickname?: string;
  creditsBalance?: number;

  journey?: Journey;
};

type StepView = {
  key: "RECEIVED" | "EXTRACT" | "ORGANIZE" | "PREPARE" | "ANALYZE";
  label: string;
  status: "PENDING" | "RUNNING" | "DONE" | "ERROR";
};

type ProgressStatus = {
  steps: StepView[];
  error?: { message: string };
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

function buildBaseSteps(): StepView[] {
  return [
    { key: "RECEIVED", label: "Arquivos recebidos", status: "PENDING" },
    { key: "EXTRACT", label: "Extraindo texto", status: "PENDING" },
    { key: "ORGANIZE", label: "Organizando a conversa", status: "PENDING" },
    { key: "PREPARE", label: "Preparando a análise", status: "PENDING" },
    { key: "ANALYZE", label: "Analisando conversa", status: "PENDING" },
  ];
}

function setStep(
  steps: StepView[],
  key: StepView["key"],
  status: StepView["status"]
) {
  return steps.map((s) => (s.key === key ? { ...s, status } : s));
}

// ✅ steps do modal de análise manual
function buildManualAnalysisSteps(): AnalysisStepView[] {
  return [
    { key: "SEND", label: "Enviando o diálogo", status: "PENDING" },
    { key: "ANALYZE", label: "Analisando o diálogo", status: "PENDING" },
    { key: "CONSOLIDATE", label: "Consolidando respostas", status: "PENDING" },
    { key: "DONE", label: "Análise concluída", status: "PENDING" },
  ];
}

function setManualStep(
  steps: AnalysisStepView[],
  key: AnalysisStepKey,
  status: AnalysisStepView["status"]
) {
  return steps.map((s) => (s.key === key ? { ...s, status } : s));
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("AVULSA");

  // ✅ começam nulos
  const [quickMode, setQuickMode] = useState<QuickMode | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType | null>(
    null
  );

  // ✅ NOVO: modo usado para renderizar o resultado (não depende do quickMode atual)
  const [resultQuickMode, setResultQuickMode] = useState<QuickMode>("RESUMO");

  const [conversaId, setConversaId] = useState<string>("");

  const [conversation, setConversation] = useState("");
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

  // ---------------------------
  // IMPORTAR PRINTS (FLUXO)
  // ---------------------------
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSending, setImportSending] = useState(false);

  const [progressOpen, setProgressOpen] = useState(false);
  const [progress, setProgress] = useState<ProgressStatus | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);

  // ✅ modal de progresso da análise MANUAL (botão Analisar)
  const [analysisProgressOpen, setAnalysisProgressOpen] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgressStatus | null>(
    null
  );
  const [analysisProgressError, setAnalysisProgressError] = useState<string | null>(
    null
  );

  // ✅ modal (OK) para validação modo + relação (serve para Importar e Analisar)
  const [modeRelModalOpen, setModeRelModalOpen] = useState(false);

  function openModeRelModal() {
    setModeRelModalOpen(true);
  }

  function closeModeRelModal() {
    setModeRelModalOpen(false);
  }

  function closeManualAnalysisProgressOnError() {
    if (!analysisProgressError) return;
    setAnalysisProgressOpen(false);
    setAnalysisProgress(null);
    setAnalysisProgressError(null);
  }

  // textarea readOnly quando estiver no fluxo de prints
  const textReadOnly =
    importOpen || importFiles.length > 0 || progressOpen || importSending;

  // ✅ bypass one-shot: se veio do pós-checkout, não deixa onboarding “invadir”
  const [skipOnboardingOnce, setSkipOnboardingOnce] = useState(false);

  function resetSelectionsToNull() {
    setQuickMode(null);
    setRelationshipType(null);
  }

  useEffect(() => {
    // ✅ requisito: quando a Home carrega, modo/tipo devem ser null
    resetSelectionsToNull();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem("hitch_skip_onboarding_once");
      if (v === "1") {
        setSkipOnboardingOnce(true);
        sessionStorage.removeItem("hitch_skip_onboarding_once");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const list = listConversas().map((c) => ({ id: c.id, name: c.name }));
    setConversas(list);
  }, []);

  const isPaidJourney = String(onboarding?.journey ?? "").toUpperCase() === "PAID";

  async function refreshOnboarding() {
    try {
      const res = await fetch("/api/onboarding/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as OnboardingStatus;
      setOnboarding(data);

      if (typeof data?.creditsBalance === "number") {
        setCreditsBalance(data.creditsBalance);
      }

      if (skipOnboardingOnce) {
        setShowTrialStart(false);
        setShowTrialEnd(false);
        setStepId(null);
        return;
      }

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
    } catch {}
  }

  useEffect(() => {
    refreshOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipOnboardingOnce]);

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
      await fetch("/api/onboarding/trial/start/ack", { method: "POST" }).catch(
        () => null
      );
    } finally {
      setShowTrialStart(false);
      setStepId("S1_SELECT_SUMMARY_MODE");
      refreshOnboarding();
    }
  }

  async function finishTrial() {
    try {
      await fetch("/api/onboarding/trial/complete/ack", { method: "POST" }).catch(
        () => null
      );
    } finally {
      setShowTrialEnd(false);
      setStepId(null);
      refreshOnboarding();
      window.location.href = "/app/billing/plan";
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

  // ✅ validação agora SEM banner: sempre abre pop-up (para Importar e Analisar)
  function validateModeAndRelationshipOrPopup(): boolean {
    if (!quickMode || !relationshipType) {
      openModeRelModal();
      return false;
    }
    return true;
  }

  async function runAnalyze(textToAnalyze: string, origin: "MANUAL" | "IMPORT") {
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

    // ✅ validação pop-up (sem banner)
    if (!validateModeAndRelationshipOrPopup()) {
      return;
    }

    // ✅ snapshot do modo usado nesta execução (para render do resultado)
    const usedQuickMode = quickMode as QuickMode;

    const validation = validateConversationText(textToAnalyze);
    if (!validation.ok) {
      const ux = getConversationValidationMessage(validation.code, validation.stats);
      setBanner({ title: ux.title, reason: ux.reason, fix: ux.fix });
      return;
    }

    if (isTrialGuided) {
      if (textToAnalyze.length < TRIAL_MIN || textToAnalyze.length > TRIAL_MAX) {
        setBanner({
          title: "Texto fora do padrão do trial",
          reason: `No modo degustação, use entre ${TRIAL_MIN} e ${TRIAL_MAX} caracteres.`,
          fix: "Ajuste o texto e tente novamente.",
        });
        return;
      }
    }

    // ✅ abre modal de progresso somente para análise MANUAL
    if (origin === "MANUAL") {
      setAnalysisProgressError(null);
      setAnalysisProgressOpen(true);

      let mSteps = buildManualAnalysisSteps();
      mSteps = setManualStep(mSteps, "SEND", "RUNNING");
      setAnalysisProgress({ steps: mSteps });

      await sleep(80);
      mSteps = setManualStep(mSteps, "SEND", "DONE");
      mSteps = setManualStep(mSteps, "ANALYZE", "RUNNING");
      setAnalysisProgress({ steps: mSteps });
    }

    setLoading(true);

    try {
      const r = await analyzeConversation({
        text: textToAnalyze,
        relationshipType: relationshipType!,
        quickMode: quickMode!,
      });

      if (isApiError(r)) {
        if (origin === "MANUAL") {
          setAnalysisProgressError(r.message || "Falha ao analisar.");
          const base = analysisProgress?.steps?.length
            ? analysisProgress.steps
            : buildManualAnalysisSteps();
          const failed: AnalysisProgressStatus = {
            steps: base.map((s) =>
              s.status === "RUNNING" ? { ...s, status: "ERROR" } : s
            ),
          };
          setAnalysisProgress(failed);
        }

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

      // ✅ consolidando (só no MANUAL)
      if (origin === "MANUAL") {
        let mSteps = analysisProgress?.steps?.length
          ? analysisProgress.steps
          : buildManualAnalysisSteps();

        mSteps = setManualStep(mSteps, "ANALYZE", "DONE");
        mSteps = setManualStep(mSteps, "CONSOLIDATE", "RUNNING");
        setAnalysisProgress({ steps: mSteps });
      }

      const data = r as QuickAnalysisResponseV11;

      // ✅ IMPORTANTÍSSIMO: fixa o modo do resultado ANTES do reset de seleção
      setResultQuickMode(usedQuickMode);

      setResult(data);

      if (typeof data?.creditsBalanceAfter === "number") {
        setCreditsBalance(data.creditsBalanceAfter);
      }

      saveHistoryItem({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        relationshipType: relationshipType!,
        messageCountApprox: data?.meta?.messageCountApprox ?? 1,
        score: typeof data?.score?.value === "number" ? data.score.value : null,
        containerId: inConversaMode ? conversaId : null,
        creditsUsed: typeof data?.creditsUsed === "number" ? data.creditsUsed : null,
      });

      await refreshOnboarding();

      // ✅ requisito: após concluir análise, modo/tipo voltam pra null (UI),
      // mas o resultado continua renderizando com resultQuickMode.
      resetSelectionsToNull();

      // ✅ finaliza steps (só no MANUAL)
      if (origin === "MANUAL") {
        let mSteps = analysisProgress?.steps?.length
          ? analysisProgress.steps
          : buildManualAnalysisSteps();

        mSteps = setManualStep(mSteps, "CONSOLIDATE", "DONE");
        mSteps = setManualStep(mSteps, "DONE", "DONE");
        setAnalysisProgress({ steps: mSteps });

        await sleep(450);
        setAnalysisProgressOpen(false);
      }
    } catch (e: any) {
      if (origin === "MANUAL") {
        const msg = String(e?.message ?? e ?? "Erro desconhecido");
        setAnalysisProgressError(msg);

        const base = analysisProgress?.steps?.length
          ? analysisProgress.steps
          : buildManualAnalysisSteps();
        const failed: AnalysisProgressStatus = {
          steps: base.map((s) =>
            s.status === "RUNNING" ? { ...s, status: "ERROR" } : s
          ),
        };
        setAnalysisProgress(failed);
      }

      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function onAnalyze() {
    return runAnalyze(effectiveText, "MANUAL");
  }

  // -----------------------
  // IMPORTAR PRINTS handlers
  // -----------------------
  function openNativePicker() {
    setBanner(null);
    setImportError(null);

    // ✅ validação obrigatória: agora abre pop-up
    if (!validateModeAndRelationshipOrPopup()) return;

    try {
      fileInputRef.current?.click();
    } catch {}
  }

  function clearImportState() {
    setImportFiles([]);
    setImportOpen(false);
    setImportError(null);
    setImportSending(false);
    setProgressOpen(false);
    setProgress(null);
    setProgressError(null);
  }

  function coercePipelineStatus(raw: any): string {
    const s = String(raw ?? "").trim().toUpperCase();
    if (!s) return "";
    if (s === "DONE" || s === "COMPLETED" || s === "SUCCESS") return "DONE";
    if (s === "ERROR" || s === "FAILED" || s === "FAIL") return "ERROR";
    if (s === "RUNNING" || s === "PROCESSING" || s === "IN_PROGRESS") return "RUNNING";
    if (s === "PENDING" || s === "QUEUED") return "PENDING";
    return s;
  }

  function extractTextFromStatusPayload(p: any): string {
    const candidates = [
      p?.extractedText,
      p?.text,
      p?.result?.extractedText,
      p?.result?.text,
      p?.payload?.extractedText,
      p?.payload?.text,
      p?.data?.extractedText,
      p?.data?.text,
    ];
    for (const c of candidates) {
      const t = String(c ?? "").trim();
      if (t) return t;
    }
    return "";
  }

  async function startPipelineAndAutoAnalyze(files: File[]) {
    setImportSending(true);
    setProgressError(null);
    setProgressOpen(true);

    let steps = buildBaseSteps();
    steps = setStep(steps, "RECEIVED", "RUNNING");
    setProgress({ steps });

    try {
      await sleep(60);
      steps = setStep(steps, "RECEIVED", "DONE");
      steps = setStep(steps, "EXTRACT", "RUNNING");
      setProgress({ steps });

      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      fd.append("relationshipType", String(relationshipType || ""));
      fd.append("quickMode", String(quickMode || ""));

      const startRes = await fetch("/api/ocr/pipeline/start", {
        method: "POST",
        body: fd,
        cache: "no-store",
      });

      const startPayload = await startRes.json().catch(() => null);
      if (!startRes.ok) {
        throw new Error(
          String(
            startPayload?.message ??
              startPayload?.error ??
              "Falha ao iniciar processamento."
          )
        );
      }

      const pipelineId = String(
        startPayload?.pipelineId ?? startPayload?.jobId ?? startPayload?.id ?? ""
      ).trim();

      if (!pipelineId) {
        throw new Error("Falha ao iniciar processamento: id não retornado.");
      }

      const startedAt = Date.now();
      const timeoutMs = 180000;
      let extractedText = "";

      while (Date.now() - startedAt < timeoutMs) {
        const qs = new URLSearchParams();
        qs.set("pipelineId", pipelineId);
        qs.set("jobId", pipelineId);

        const stRes = await fetch(`/api/ocr/pipeline/status?${qs.toString()}`, {
          cache: "no-store",
        });

        const stPayload = await stRes.json().catch(() => null);
        if (!stRes.ok) {
          throw new Error(
            String(stPayload?.message ?? stPayload?.error ?? "Falha ao consultar status.")
          );
        }

        const status = coercePipelineStatus(stPayload?.status ?? stPayload?.state);

        const rawSteps: any[] = Array.isArray(stPayload?.steps) ? stPayload.steps : [];
        const hasRunning = rawSteps.some(
          (s: any) => coercePipelineStatus(s?.status ?? s?.state) === "RUNNING"
        );

        if (rawSteps.length) {
          const map = new Map<string, StepView["status"]>();
          for (const s of rawSteps) {
            const k = String(s?.key ?? s?.id ?? "").toUpperCase().trim();
            const v = coercePipelineStatus(s?.status ?? s?.state);
            const sv: StepView["status"] =
              v === "DONE"
                ? "DONE"
                : v === "RUNNING"
                ? "RUNNING"
                : v === "ERROR"
                ? "ERROR"
                : "PENDING";
            if (k) map.set(k, sv);
          }

          steps = steps.map((cur) => ({
            ...cur,
            status: map.get(cur.key) ?? cur.status,
          }));

          setProgress({ steps });
        } else {
          setProgress({ steps });
        }

        if (status === "ERROR") {
          throw new Error(
            String(
              stPayload?.error?.message ??
                stPayload?.message ??
                "Não foi possível processar os prints."
            )
          );
        }

        if (status === "DONE") {
          extractedText = extractTextFromStatusPayload(stPayload);
          break;
        }

        await sleep(hasRunning ? 650 : 850);
      }

      if (!extractedText) {
        throw new Error("Tempo excedido ao processar os prints.");
      }

      steps = setStep(steps, "EXTRACT", "DONE");
      steps = setStep(steps, "ORGANIZE", "DONE");
      steps = setStep(steps, "PREPARE", "DONE");
      steps = setStep(steps, "ANALYZE", "RUNNING");
      setProgress({ steps });

      setConversation(extractedText);
      await runAnalyze(extractedText, "IMPORT");

      steps = setStep(steps, "ANALYZE", "DONE");
      setProgress({ steps });

      setProgressOpen(false);
      setImportOpen(false);
      setImportFiles([]);
      setImportSending(false);
      setImportError(null);
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? "Erro desconhecido");
      setProgressError(msg);

      const base = progress?.steps?.length ? progress.steps : buildBaseSteps();
      const failed: ProgressStatus = {
        steps: base.map((s) => (s.status === "RUNNING" ? { ...s, status: "ERROR" } : s)),
        error: { message: msg },
      };
      setProgress(failed);

      setImportSending(false);
    }
  }

  function onFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []).filter(Boolean);
    e.target.value = "";
    if (!list.length) return;

    const files = list.slice(0, 3);

    setImportFiles(files);
    setImportError(null);
    setImportOpen(true);
  }

  async function onSendImport() {
    setBanner(null);
    setImportError(null);

    // ✅ validação obrigatória: agora abre pop-up (não banner nem texto na página)
    if (!validateModeAndRelationshipOrPopup()) return;

    if (!importFiles.length) {
      setImportError("Selecione os prints antes de enviar.");
      return;
    }

    setImportOpen(false);
    await startPipelineAndAutoAnalyze(importFiles);
  }

  function closeProgressOnError() {
    if (!progressError) return;
    setProgressOpen(false);
    setProgress(null);
    setProgressError(null);
    clearImportState();
  }

  // -----------------------
  // Guided overlay (mantido)
  // -----------------------
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
        highlightTourIds: ["quick-score-card", "quick-analysis-card", "quick-mode-reply"],
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

    if (stepId === "R2_CLICK_ANALYZE_REPLY" && result && quickMode === "RESPONDER") {
      setStepId("R3_REVIEW_REPLY_SUGGESTIONS");
      setShowTrialEnd(true);
      return;
    }
  }, [isTrialGuided, stepId, result, quickMode]);

  const overlayEnabled = isTrialGuided && !showTrialStart && !showTrialEnd;

  const nicknameLabel = (onboarding?.dialogueNickname ?? "").toString().trim() || "—";

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

      {/* ✅ Modal de validação modo + tipo (OK) */}
      <OkModal
        open={modeRelModalOpen}
        title="Selecione modo e tipo de relação"
        lines={[
          "Antes de importar, selecione o modo e o tipo de relação. O processo seguirá automaticamente até o resultado.",
          "Selecione as opções e tente novamente.",
        ]}
        onClose={closeModeRelModal}
      />

      {/* Modal: progresso da análise manual */}
      <AnalysisProgressModal
        open={analysisProgressOpen}
        status={analysisProgress}
        errorMessage={analysisProgressError}
        onClose={analysisProgressError ? closeManualAnalysisProgressOnError : null}
      />

      {/* hidden input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        multiple
        className="hidden"
        onChange={onFilesSelected}
      />

      {/* Modal: ordenar prints (drag & drop) */}
      <OcrFilesSortModal
        open={importOpen}
        files={importFiles}
        onClose={() => {
          if (importSending) return;
          setImportOpen(false);
          setImportFiles([]);
          setImportError(null);
        }}
        onCancel={() => {
          if (importSending) return;
          setImportOpen(false);
          setImportFiles([]);
          setImportError(null);
        }}
        onSubmit={(orderedFiles: File[]) => {
          setImportFiles(orderedFiles);
          void (async () => {
            setImportOpen(false);
            await startPipelineAndAutoAnalyze(orderedFiles);
          })();
        }}
      />

      {/* Modal: progresso OCR */}
      <OcrProgressModal
        open={progressOpen}
        status={progress as any}
        errorMessage={progressError}
        onClose={progressError ? closeProgressOnError : () => {}}
      />

      {isTrialGuided && showTrialStart && (
        <div className="fixed inset-0 z-9998 flex items-center justify-center bg-black/60">
          <div
            ref={startModalRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onKeyDown={(e) => focusTrapKeydown(e, startModalRef.current)}
            className="w-[min(520px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
          >
            <div className="text-lg font-semibold">Seja bem vindo a degustação do Hitch.Ai</div>
            <div className="text-sm text-zinc-300 mt-2">
              Você fará 1 análise (Receber análise) e 1 geração de respostas (Opções de respostas).
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
        <div className="fixed inset-0 z-9998 flex items-center justify-center bg-black/60">
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
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Hitch.ai</h1>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 rounded-2xl border border-[rgba(255,255,255,0.10)] bg-white/2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-200/80 min-w-0">
            <span className="whitespace-normal">Você será identificado nos diálogos como</span>

            <div className="relative group shrink-0">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/3 text-[11px] font-semibold text-zinc-200/80 cursor-default">
                i
              </span>

              <div className="pointer-events-none absolute left-0 top-7 z-20 hidden w-[320px] rounded-2xl border border-white/10 bg-black/90 p-3 text-xs text-zinc-200/90 shadow-[0_18px_55px_rgba(0,0,0,0.65)] group-hover:block">
                <div className="font-semibold mb-1 text-zinc-100">Por que isso é obrigatório?</div>
                <p className="text-zinc-200/80 leading-relaxed">
                  O sistema usa esse nome para separar você da outra pessoa no diálogo.
                  <br />
                  Se o nome não corresponder ao que aparece na conversa, a interpretação do contexto fica incorreta e a qualidade da análise e, principalmente, das respostas sugeridas será comprometida.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center rounded-xl border border-white/10 bg-white/3 px-3 py-1 text-[11px] font-semibold text-zinc-100/90">
              {nicknameLabel}
            </span>
          </div>

          <div className="text-xs text-zinc-300/80 text-left sm:text-right w-full sm:w-auto wrap-break-word">
            Seu saldo atual de créditos é de:{" "}
            <span className="text-zinc-100 font-semibold">{balanceLabel}</span>
          </div>
        </div>

        {/* ✅ Importar prints: remove texto à esquerda, mantém botão à direita */}
        <div className="flex justify-end">
          <button
            type="button"
            className="btn"
            onClick={openNativePicker}
            disabled={loading || importSending || progressOpen}
          >
            Importar prints
          </button>
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
          readOnly={textReadOnly}
        />

        <div className="label">Modo</div>

        <div className="segmented w-fit gap-1">
          <button
            data-tour-id="quick-mode-summary"
            className={`btn-seg ${quickMode === "RESUMO" ? "btn-seg-active" : ""}`}
            onClick={() => setQuickMode("RESUMO")}
            disabled={loading}
            type="button"
          >
            Receber análise
          </button>

          <button
            data-tour-id="quick-mode-reply"
            className={`btn-seg ${quickMode === "RESPONDER" ? "btn-seg-active" : ""}`}
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
        <div className="flex flex-wrap gap-2" data-tour-id="quick-relationship-option">
          {relationshipOptions.map((opt) => (
            <button
              key={opt.value}
              className={`chip ${relationshipType === opt.value ? "chip-active" : ""}`}
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

        {/* mantém banner para erros reais (texto inválido, créditos, etc.) */}
        {banner && (
          <div className="rounded-2xl border border-zinc-800/70 bg-black/30 p-4 text-sm">
            <div className="font-medium">{banner.title}</div>
            <div className="text-zinc-300/80">{banner.reason}</div>
            {banner.fix && <div className="text-zinc-300/70">{banner.fix}</div>}
          </div>
        )}
      </div>

      {/* ✅ usa o modo do resultado, não o quickMode atual (que é resetado) */}
      {result && <ResultView data={result} quickMode={resultQuickMode as any} />}
    </div>
  );
}

/**
 * ✅ Modal simples (OK) — não depende do OCR progress modal.
 * Mantém a regra: a mensagem de validação aparece em pop-up.
 */
function OkModal({
  open,
  title,
  lines,
  onClose,
}: {
  open: boolean;
  title: string;
  lines: string[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const okRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      try {
        okRef.current?.focus();
      } catch {}
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-[min(520px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.65)]"
      >
        <div className="text-lg font-semibold text-zinc-100">{title}</div>

        <div className="mt-3 space-y-2 text-sm text-zinc-200/80 leading-relaxed">
          {lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button ref={okRef} type="button" className="btn btn-primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
