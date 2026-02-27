/*src/components/ocr/OcrFilesSortModal.tsx*/
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

type ThemeMode = "light" | "dark";

type PreviewItem = {
  id: string;
  file: File;
  url: string;
};

function readThemeFromDom(): ThemeMode {
  const v = document?.documentElement?.getAttribute("data-theme");
  return v === "dark" ? "dark" : "light";
}

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

  const [theme, setTheme] = useState<ThemeMode>("light");
  const isDark = theme === "dark";

  // ✅ sync tema + observa mudanças (toggle Light/Dark)
  useEffect(() => {
    if (!open) return;

    const apply = () => setTheme(readThemeFromDom());
    apply();

    const obs = new MutationObserver(() => apply());
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => obs.disconnect();
  }, [open]);

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

  const overlayClass = isDark ? "bg-black/70" : "bg-black/30";

  const panelClass = isDark
    ? "border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-[0_18px_55px_rgba(0,0,0,0.65)]"
    : "border border-[var(--h-border)] bg-white text-[var(--h-text)] shadow-[0_22px_66px_rgba(0,0,0,0.18)]";

  const subTextClass = isDark ? "text-zinc-300/80" : "text-[var(--h-subtle)]";
  const subText2Class = isDark ? "text-zinc-300/70" : "text-[var(--h-muted)]";

  const rowClass = isDark
    ? "border border-white/10 bg-white/3"
    : "border border-[var(--h-border)] bg-white/70";

  const thumbClass = isDark
    ? "border border-white/10 bg-black/40"
    : "border border-[var(--h-border)] bg-white";

  const lightboxOverlay = isDark ? "bg-black/85" : "bg-black/40";
  const lightboxPanel = isDark
    ? "border border-white/10 bg-zinc-950 shadow-[0_18px_55px_rgba(0,0,0,0.65)]"
    : "border border-[var(--h-border)] bg-white shadow-[0_22px_66px_rgba(0,0,0,0.18)]";
  const lightboxBar = isDark ? "border-white/10" : "border-[var(--h-border)]";
  const lightboxFrame = isDark
    ? "border border-white/10 bg-black/30"
    : "border border-[var(--h-border)] bg-white/70";

  return (
    <div className={`fixed inset-0 z-9998 flex items-center justify-center ${overlayClass}`}>
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`w-[min(760px,calc(100%-24px))] rounded-2xl p-5 outline-none ${panelClass}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Organize os prints</div>
            <div className={`text-xs mt-1 ${subTextClass}`}>
              Coloque na mesma sequência em que as mensagens aconteceram na conversa.
            </div>

            <div className={`text-[11px] mt-2 ${subText2Class}`}>
              No celular, use as setas ↑ ↓ para ajustar a ordem. Para conferir, toque na miniatura.
            </div>
          </div>

          <button type="button" className="btn" onClick={onClose} disabled={sending}>
            Fechar
          </button>
        </div>

        <div className={`mt-4 text-xs ${subTextClass}`}>
          Arquivos selecionados:{" "}
          <span className={isDark ? "text-zinc-100 font-semibold" : "text-[var(--h-text)] font-semibold"}>
            {items.length}
          </span>
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
              className={`flex items-center justify-between rounded-2xl px-4 py-3 ${rowClass}`}
              title="No desktop: arraste para reorganizar. Para ver em tamanho maior: toque na miniatura."
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-6 text-xs font-semibold ${isDark ? "text-zinc-200/70" : "text-[var(--h-muted)]"}`}>
                  {idx + 1}
                </div>

                <div
                  className={`shrink-0 select-none ${isDark ? "text-zinc-200/60" : "text-[var(--h-muted)]"}`}
                  aria-hidden="true"
                  title="No desktop: arraste"
                >
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
                  className={`h-12 w-12 overflow-hidden rounded-xl focus:outline-none ${thumbClass}`}
                  onClick={() => openPreviewAt(idx)}
                  disabled={sending}
                  aria-label={`Abrir preview de ${p.file.name}`}
                  title="Abrir preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                </button>

                <div className="min-w-0">
                  <div className={`text-sm truncate ${isDark ? "text-zinc-100" : "text-[var(--h-text)]"}`}>
                    {p.file.name}
                  </div>
                  <div className={`text-xs ${subText2Class}`}>{formatBytes(p.file.size)}</div>
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

        <div className="mt-5 flex items-center justify-end gap-3">

  <div className="mt-5 flex items-center justify-end gap-2">
  {/* Cancelar (neutro) */}
  <button
    type="button"
    onClick={onCancel}
    disabled={sending}
    className={[
      "rounded-full px-6 py-3 text-sm font-semibold",
      "bg-white text-[var(--h-text)]",
      "border-2 border-[var(--h-border)] hover:border-[#6C63FF]",
      "transition-colors transition-shadow duration-150",
      "disabled:opacity-60 disabled:cursor-not-allowed",
      // Dark
      "dark:!bg-[var(--h-control-bg)] dark:!text-[var(--h-text)]",
      "dark:!border-[var(--h-control-border)]",
      "dark:hover:!bg-[var(--h-control-bg-hover)] dark:hover:!border-[var(--h-control-border-hover)]",
    ].join(" ")}
  >
    Cancelar
  </button>

  {/* Enviar (padrão print 2: branco + borda roxa) */}
  <button
    type="button"
    onClick={() => onSubmit(items.map((x) => x.file))}
    disabled={sending}
    className={[
      "rounded-full px-6 py-3 text-sm font-semibold",
      "bg-white text-[var(--h-text)]",
      "border-2 border-[#6C63FF]",
      "shadow-[0_14px_40px_rgba(108,99,255,0.25)]",
      "hover:shadow-[0_18px_50px_rgba(108,99,255,0.35)]",
      "hover:bg-[#F7F6FF]",
      "transition-shadow transition-colors duration-200",
      "disabled:opacity-60 disabled:cursor-not-allowed",
      // Dark (mantém o comportamento consistente)
      "dark:!bg-[rgba(255,255,255,0.10)] dark:hover:!bg-[rgba(255,255,255,0.14)]",
      "dark:shadow-[0_14px_44px_rgba(108,99,255,0.22)] dark:hover:shadow-[0_18px_56px_rgba(108,99,255,0.28)]",
    ].join(" ")}
  >
    {sending ? "Enviando..." : "Enviar"}
  </button>
</div>
</div>

        {/* PREVIEW MODAL (lightbox interno) */}
        {previewOpen && current ? (
          <div
            className={`fixed inset-0 z-[9999] flex items-center justify-center ${lightboxOverlay}`}
            role="dialog"
            aria-modal="true"
            aria-label="Preview do anexo"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closePreview();
            }}
          >
            <div className={`w-[min(980px,calc(100%-24px))] rounded-2xl ${lightboxPanel}`}>
              <div className={`flex items-center justify-between gap-3 p-4 border-b ${lightboxBar}`}>
                <div className="min-w-0">
                  <div className={`text-sm truncate ${isDark ? "text-zinc-100" : "text-[var(--h-text)]"}`}>
                    {current.file.name}
                  </div>
                  <div className={`text-xs ${subText2Class}`}>
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
                  <button
                    type="button"
                    className="btn"
                    onClick={closePreview}
                    disabled={sending}
                    aria-label="Fechar preview"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className={`max-h-[78vh] overflow-auto rounded-xl ${lightboxFrame}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={current.url} alt={current.file.name} className="block h-auto w-full object-contain" />
                </div>

                <div className={`mt-3 text-[11px] ${subText2Class}`}>
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
