"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  files: File[];
  maxFiles?: number; // default 3
  onClose: () => void;
  onCancel: () => void;
  onSubmit: (orderedFiles: File[]) => void;

  // opcional: permite o page.tsx receber a nova ordem em tempo real
  onReorder?: (nextFiles: File[]) => void;

  // opcional: bloquear ações enquanto envia
  sending?: boolean;
};

type PreviewItem = {
  id: string;
  file: File;
  url: string;
};

function fileId(f: File) {
  return `${f.name}::${f.size}::${f.lastModified}`;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function OcrFilesSortModal({
  open,
  files,
  maxFiles = 3,
  onClose,
  onCancel,
  onSubmit,
  onReorder,
  sending = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const initial = useMemo(() => {
    const slice = (files ?? []).slice(0, maxFiles);
    return slice.map((f) => ({ id: fileId(f), file: f }));
  }, [files, maxFiles]);

  const [items, setItems] = useState<Array<{ id: string; file: File }>>(initial);

  // preview (lightbox)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIdx, setPreviewIdx] = useState<number>(0);

  // reset quando abre ou troca files
  useEffect(() => {
    if (!open) return;
    setItems(initial);
    setPreviewOpen(false);
    setPreviewIdx(0);
  }, [open, initial]);

  // foco inicial
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      try {
        containerRef.current?.focus();
      } catch {}
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const previews: PreviewItem[] = useMemo(() => {
    return items.map((it) => ({
      id: it.id,
      file: it.file,
      url: URL.createObjectURL(it.file),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    return () => {
      for (const p of previews) {
        try {
          URL.revokeObjectURL(p.url);
        } catch {}
      }
    };
  }, [previews]);

  const dragIdRef = useRef<string | null>(null);

  function emitReorder(next: Array<{ id: string; file: File }>) {
    try {
      onReorder?.(next.map((x) => x.file));
    } catch {}
  }

  function moveItem(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    setItems((cur) => {
      const next = [...cur];
      const safeFrom = clamp(fromIdx, 0, next.length - 1);
      const safeTo = clamp(toIdx, 0, next.length - 1);

      const [picked] = next.splice(safeFrom, 1);
      next.splice(safeTo, 0, picked);

      emitReorder(next);
      return next;
    });
  }

  function moveUp(idx: number) {
    moveItem(idx, idx - 1);
  }

  function moveDown(idx: number) {
    moveItem(idx, idx + 1);
  }

  function openPreviewAt(idx: number) {
    if (sending) return;
    const safe = clamp(idx, 0, Math.max(0, previews.length - 1));
    setPreviewIdx(safe);
    setPreviewOpen(true);
  }

  function closePreview() {
    setPreviewOpen(false);
  }

  function nextPreview() {
    setPreviewIdx((cur) => clamp(cur + 1, 0, Math.max(0, previews.length - 1)));
  }

  function prevPreview() {
    setPreviewIdx((cur) => clamp(cur - 1, 0, Math.max(0, previews.length - 1)));
  }

  // atalhos teclado no preview: ESC / ← / →
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (!previewOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closePreview();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextPreview();
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevPreview();
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, previewOpen, previews.length]);

  if (!open) return null;

  const current = previews[clamp(previewIdx, 0, Math.max(0, previews.length - 1))];

  return (
    <div className="fixed inset-0 z-9998 flex items-center justify-center bg-black/70">
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="w-[min(760px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.65)] outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-zinc-100">Organize os prints</div>
            <div className="text-xs text-zinc-300/80 mt-1">
              Coloque na mesma sequência em que as mensagens aconteceram na conversa.
            </div>

            <div className="text-[11px] text-zinc-300/70 mt-2">
              No celular, use as setas ↑ ↓ para ajustar a ordem. Para conferir, toque na miniatura.
            </div>
          </div>

          <button type="button" className="btn" onClick={onClose} disabled={sending}>
            Fechar
          </button>
        </div>

        <div className="mt-4 text-xs text-zinc-300/80">
          Arquivos selecionados: <span className="text-zinc-100 font-semibold">{items.length}</span>
        </div>

        <div className="mt-3 space-y-3">
          {previews.map((p, idx) => (
            <div
              key={p.id}
              draggable={!sending}
              onDragStart={() => {
                dragIdRef.current = p.id;
              }}
              onDragEnd={() => {
                dragIdRef.current = null;
              }}
              onDragOver={(e) => {
                // desktop only
                e.preventDefault();
              }}
              onDrop={(e) => {
                // desktop only
                e.preventDefault();
                if (sending) return;
                const fromId = dragIdRef.current;
                if (!fromId) return;
                const fromIdx = items.findIndex((x) => x.id === fromId);
                if (fromIdx < 0) return;
                moveItem(fromIdx, idx);
              }}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/3 px-4 py-3"
              title="No desktop: arraste para reorganizar. Para ver em tamanho maior: toque na miniatura."
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 text-xs font-semibold text-zinc-200/70">{idx + 1}</div>

                <div className="shrink-0 select-none text-zinc-200/60" aria-hidden="true" title="No desktop: arraste">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M4 5.25H14M4 9H14M4 12.75H14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <button
                  type="button"
                  className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-black/40 focus:outline-none"
                  onClick={() => openPreviewAt(idx)}
                  disabled={sending}
                  aria-label={`Abrir preview de ${p.file.name}`}
                  title="Abrir preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                </button>

                <div className="min-w-0">
                  <div className="text-sm text-zinc-100 truncate">{p.file.name}</div>
                  <div className="text-xs text-zinc-300/70">{formatBytes(p.file.size)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="btn"
                  disabled={sending || idx === 0}
                  onClick={() => moveUp(idx)}
                  aria-label="Mover para cima"
                  title="Mover para cima"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={sending || idx === items.length - 1}
                  onClick={() => moveDown(idx)}
                  aria-label="Mover para baixo"
                  title="Mover para baixo"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" className="btn" onClick={onCancel} disabled={sending}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-cta"
            onClick={() => onSubmit(items.map((x) => x.file))}
            disabled={sending}
          >
            Enviar
          </button>
        </div>

        {/* PREVIEW MODAL (lightbox interno) */}
        {previewOpen && current ? (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85"
            role="dialog"
            aria-modal="true"
            aria-label="Preview do anexo"
            onMouseDown={(e) => {
              // clique fora fecha (sem abrir aba)
              if (e.target === e.currentTarget) closePreview();
            }}
          >
            <div className="w-[min(980px,calc(100%-24px))] rounded-2xl border border-white/10 bg-zinc-950 shadow-[0_18px_55px_rgba(0,0,0,0.65)]">
              <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
                <div className="min-w-0">
                  <div className="text-sm text-zinc-100 truncate">{current.file.name}</div>
                  <div className="text-xs text-zinc-300/70">
                    {previewIdx + 1} de {previews.length} • {formatBytes(current.file.size)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    className="btn"
                    onClick={prevPreview}
                    disabled={sending || previewIdx === 0}
                    aria-label="Anterior"
                    title="Anterior"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={nextPreview}
                    disabled={sending || previewIdx === previews.length - 1}
                    aria-label="Próximo"
                    title="Próximo"
                  >
                    →
                  </button>
                  <button type="button" className="btn" onClick={closePreview} disabled={sending} aria-label="Fechar preview">
                    Fechar
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="max-h-[78vh] overflow-auto rounded-xl border border-white/10 bg-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.url}
                    alt={current.file.name}
                    className="block h-auto w-full object-contain"
                  />
                </div>

                <div className="mt-3 text-[11px] text-zinc-300/70">
                  Dica: no desktop, use ←/→ para navegar e ESC para fechar. No celular, use os botões.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
