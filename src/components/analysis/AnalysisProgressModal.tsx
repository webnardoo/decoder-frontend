"use client";

import { useEffect, useMemo, useRef } from "react";

export type AnalysisStepKey = "SEND" | "ANALYZE" | "CONSOLIDATE" | "DONE";

export type AnalysisStepView = {
  key: AnalysisStepKey;
  label: string;
  status: "PENDING" | "RUNNING" | "DONE" | "ERROR";
};

export type AnalysisProgressStatus = {
  steps: AnalysisStepView[];
};

type Props = {
  open: boolean;
  title?: string;
  status: AnalysisProgressStatus | null;
  errorMessage?: string | null;
  canClose?: boolean;
  onClose?: (() => void) | null;
};

function iconFor(s: AnalysisStepView["status"]) {
  if (s === "DONE") return "✅";
  if (s === "RUNNING") return "🔍";
  if (s === "ERROR") return "❌";
  return "•";
}

function normalizeSteps(status: AnalysisProgressStatus | null): AnalysisStepView[] {
  const base: AnalysisStepView[] = [
    { key: "SEND", label: "Enviando o diálogo", status: "PENDING" },
    { key: "ANALYZE", label: "Analisando o diálogo", status: "PENDING" },
    { key: "CONSOLIDATE", label: "Consolidando respostas", status: "PENDING" },
    { key: "DONE", label: "Análise concluída", status: "PENDING" },
  ];

  if (!status?.steps?.length) return base;

  const byKey = new Map<AnalysisStepKey, AnalysisStepView["status"]>();
  for (const s of status.steps) {
    if (!s?.key) continue;
    byKey.set(s.key, s.status);
  }

  return base.map((b) => ({
    ...b,
    status: byKey.get(b.key) ?? b.status,
  }));
}

export default function AnalysisProgressModal({
  open,
  title,
  status,
  errorMessage,
  canClose,
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      try {
        containerRef.current?.focus();
      } catch {}
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const steps = useMemo(() => normalizeSteps(status), [status]);

  const hasError = !!errorMessage || steps.some((s) => s.status === "ERROR");
  const errorText =
    errorMessage ||
    (hasError ? "Não foi possível concluir a análise. Tente novamente." : null);

  const isDone = steps.every((s) => s.status === "DONE");
  const allowClose = !!canClose || hasError || isDone;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/70">
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="w-[min(560px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.65)] outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-100">
              {title ?? "Processando análise"}
            </div>
            <div className="text-xs text-zinc-300/80 mt-1">
              Não feche esta janela. Estamos processando seu diálogo.
            </div>
          </div>

          {allowClose && onClose && (
            <button type="button" className="btn" onClick={onClose}>
              Fechar
            </button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {steps.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg leading-none">{iconFor(s.status)}</span>
                <div className="text-sm text-zinc-100">{s.label}</div>
              </div>

              <div className="text-xs text-zinc-300/70">
                {s.status === "RUNNING"
                  ? "Em andamento"
                  : s.status === "DONE"
                  ? "Concluído"
                  : s.status === "ERROR"
                  ? "Erro"
                  : "Aguardando"}
              </div>
            </div>
          ))}
        </div>

        {errorText && (
          <div className="mt-4 rounded-2xl border border-red-900/40 bg-red-950/20 p-4">
            <div className="text-sm font-semibold text-red-200">Erro</div>
            <div className="text-sm text-red-200/80 mt-1">{errorText}</div>
          </div>
        )}
      </div>
    </div>
  );
}
