"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  open: boolean;
  files: File[];
  onClose: () => void;

  // validações já feitas antes de abrir? aqui só exibimos erro opcional
  errorMessage?: string | null;

  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSend: () => void;

  sending?: boolean;
};

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default function OcrImportModal({
  open,
  files,
  onClose,
  errorMessage,
  onMoveUp,
  onMoveDown,
  onSend,
  sending,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const previews = useMemo(() => {
    return files.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => {
    return () => {
      for (const p of previews) URL.revokeObjectURL(p.url);
    };
  }, [previews]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      try {
        containerRef.current?.focus();
      } catch {}
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-9998 flex items-center justify-center bg-black/70">
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="w-[min(720px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.65)] outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-100">
              Organize os prints
            </div>
            <div className="text-xs text-zinc-300/80 mt-1">
              Coloque na mesma sequência em que as mensagens aconteceram na conversa.
            </div>
          </div>

          <button
            type="button"
            className="btn"
            onClick={onClose}
            disabled={!!sending}
            aria-label="Fechar"
          >
            Fechar
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/2 p-3">
          <div className="text-xs text-zinc-200/80">
            Arquivos selecionados:{" "}
            <span className="text-zinc-100 font-semibold">{files.length}</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {previews.map((p, idx) => (
            <div
              key={`${p.file.name}-${idx}`}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/3 p-3"
            >
              <div className="h-16 w-12 overflow-hidden rounded-xl border border-white/10 bg-black/20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.file.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm text-zinc-100 truncate">{p.file.name}</div>
                <div className="text-xs text-zinc-300/70">
                  {formatSize(p.file.size)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => onMoveUp(idx)}
                  disabled={!!sending || idx === 0}
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => onMoveDown(idx)}
                  disabled={!!sending || idx === previews.length - 1}
                  title="Descer"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-900/40 bg-red-950/20 p-4">
            <div className="text-sm font-semibold text-red-200">Atenção</div>
            <div className="text-sm text-red-200/80 mt-1">{errorMessage}</div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" className="btn" onClick={onClose} disabled={!!sending}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-cta"
            onClick={onSend}
            disabled={!!sending}
          >
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
