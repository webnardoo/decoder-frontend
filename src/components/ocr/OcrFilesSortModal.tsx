// src/components/ocr/OcrFilesSortModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  files: File[];
  maxFiles?: number; // default 3
  onClose: () => void;
  onCancel: () => void;
  onSubmit: (orderedFiles: File[]) => void;

  // ✅ opcional: permite o page.tsx receber a nova ordem em tempo real
  onReorder?: (nextFiles: File[]) => void;

  // ✅ opcionais: pra você não cair de novo em erro de Props
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

  // reset quando abre ou troca files
  useEffect(() => {
    if (!open) return;
    setItems(initial);
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

  function moveItem(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;

    setItems((cur) => {
      const next = [...cur];
      const [picked] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, picked);

      // ✅ propaga a ordem atual (se o caller quiser)
      try {
        onReorder?.(next.map((x) => x.file));
      } catch {}

      return next;
    });
  }

  if (!open) return null;

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
            <div className="text-lg font-semibold text-zinc-100">
              Organize os prints
            </div>
            <div className="text-xs text-zinc-300/80 mt-1">
              Coloque na mesma sequência em que as mensagens aconteceram na conversa.
            </div>
          </div>

          <button type="button" className="btn" onClick={onClose} disabled={sending}>
            Fechar
          </button>
        </div>

        <div className="mt-4 text-xs text-zinc-300/80">
          Arquivos selecionados:{" "}
          <span className="text-zinc-100 font-semibold">{items.length}</span>
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
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (sending) return;
                const fromId = dragIdRef.current;
                if (!fromId) return;
                const fromIdx = items.findIndex((x) => x.id === fromId);
                if (fromIdx < 0) return;
                moveItem(fromIdx, idx);
              }}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/3 px-4 py-3"
              title="Arraste para reorganizar"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 text-xs font-semibold text-zinc-200/70">
                  {idx + 1}
                </div>

                {/* ✅ “3 tracinhos” (drag handle) */}
                <div
                  className="shrink-0 select-none text-zinc-200/60"
                  aria-hidden="true"
                  title="Arraste para reorganizar"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 5.25H14M4 9H14M4 12.75H14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.file.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-sm text-zinc-100 truncate">{p.file.name}</div>
                  <div className="text-xs text-zinc-300/70">
                    {formatBytes(p.file.size)}
                  </div>
                </div>
              </div>

              <div className="text-xs text-zinc-300/60">Arraste</div>
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
      </div>
    </div>
  );
}
