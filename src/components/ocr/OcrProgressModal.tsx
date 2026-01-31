"use client";

import { useEffect, useMemo, useRef } from "react";
import type { OcrPipelineStatus } from "@/lib/ocr-client";

type Props = {
  open: boolean;
  title?: string;
  status: OcrPipelineStatus | null;

  errorMessage?: string | null;

  onRetry?: (() => void) | null;

  // novo
  canClose?: boolean;
  onClose?: (() => void) | null;
};

type StepView = {
  key: string;
  label: string;
  status: "PENDING" | "RUNNING" | "DONE" | "ERROR";
};

function iconFor(s: StepView["status"]) {
  if (s === "DONE") return "✅";
  if (s === "RUNNING") return "⏳";
  if (s === "ERROR") return "❌";
  return "•";
}

function normalizeSteps(status: OcrPipelineStatus | null): StepView[] {
  // ✅ Base keys padronizadas para casar com o ProgressStatus do page.tsx (EXTRACT),
  // mas com alias OCR <-> EXTRACT para compatibilidade com payloads do backend.
  const base: StepView[] = [
    { key: "RECEIVED", label: "Arquivos recebidos", status: "PENDING" },
    { key: "EXTRACT", label: "Extraindo texto", status: "PENDING" },
    { key: "ORGANIZE", label: "Organizando a conversa", status: "PENDING" },
    { key: "PREPARE", label: "Preparando a análise", status: "PENDING" },
    { key: "ANALYZE", label: "Analisando conversa", status: "PENDING" },
  ];

  if (!status) return base;

  const rawSteps: any[] = Array.isArray((status as any).steps)
    ? (status as any).steps
    : [];

  const mapKey = (s: any) => String(s?.key ?? s?.id ?? "").trim().toUpperCase();

  const mapStatus = (s: any): StepView["status"] => {
    const v = String(s?.status ?? s?.state ?? "").trim().toUpperCase();
    if (v === "RUNNING") return "RUNNING";
    if (v === "DONE") return "DONE";
    if (v === "ERROR" || v === "FAILED") return "ERROR";
    if (v === "PENDING") return "PENDING";
    return "PENDING";
  };

  const byKey = new Map<string, StepView["status"]>();

  for (const s of rawSteps) {
    const k = mapKey(s);
    if (!k) continue;

    const st = mapStatus(s);
    byKey.set(k, st);

    // ✅ Alias crítico: OCR <-> EXTRACT
    // - Se vier OCR do backend, reflete no EXTRACT do UI.
    // - Se vier EXTRACT do client/progress, reflete no OCR (compat futura).
    if (k === "OCR") byKey.set("EXTRACT", st);
    if (k === "EXTRACT") byKey.set("OCR", st);
  }

  return base.map((b) => ({
    ...b,
    status: (byKey.get(b.key) as any) ?? b.status,
  }));
}

export default function OcrProgressModal({
  open,
  title,
  status,
  errorMessage,
  onRetry,
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
    (hasError ? "Não foi possível processar os prints. Tente novamente." : null);

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
              {title ?? "Processando prints"}
            </div>
            <div className="text-xs text-zinc-300/80 mt-1">
              Não feche esta janela. Estamos reconstruindo o diálogo.
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

            {onRetry && (
              <div className="mt-3">
                <button type="button" className="btn btn-cta" onClick={onRetry}>
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
