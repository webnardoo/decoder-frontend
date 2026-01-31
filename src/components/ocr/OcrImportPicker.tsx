// src/components/ocr/OcrImportPicker.tsx
"use client";

import { useMemo, useRef, useState } from "react";

type QuickMode = "RESUMO" | "RESPONDER";

type Props = {
  disabled?: boolean;

  relationshipType: string;
  quickMode: QuickMode;

  // dispara o pipeline real (você já tem no page.tsx)
  onStartPipeline: (files: File[]) => Promise<void> | void;
};

function clampFiles(files: File[], max: number) {
  return files.slice(0, max);
}

export default function OcrImportPicker({
  disabled,
  onStartPipeline,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const canStart = files.length > 0 && files.length <= 3;

  const orderedHint = useMemo(() => {
    return (
      "Coloque os prints na mesma sequência em que o diálogo aconteceu (ordem cronológica). " +
      "A ordem influencia diretamente o resultado."
    );
  }, []);

  function reset() {
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openPicker() {
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    reset();
  }

  function pickFiles() {
    fileInputRef.current?.click();
  }

  function onFilesSelected(incoming: File[]) {
    const next = clampFiles(incoming, 3);
    setFiles(next);
  }

  function moveUp(idx: number) {
    if (idx <= 0) return;
    setFiles((cur) => {
      const copy = [...cur];
      const tmp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = tmp;
      return copy;
    });
  }

  function moveDown(idx: number) {
    setFiles((cur) => {
      if (idx >= cur.length - 1) return cur;
      const copy = [...cur];
      const tmp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = tmp;
      return copy;
    });
  }

  function removeAt(idx: number) {
    setFiles((cur) => cur.filter((_, i) => i !== idx));
  }

  async function start() {
    if (!canStart) return;
    const payload = files;
    closePicker();
    await onStartPipeline(payload);
  }

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={openPicker}
        disabled={!!disabled}
      >
        Importar prints
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []).filter(Boolean);
          onFilesSelected(picked);
          // reset pra permitir selecionar os mesmos arquivos novamente
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      {open && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70">
          <div className="w-[min(720px,calc(100%-24px))] rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-zinc-100">
                  Importar prints do WhatsApp
                </div>
                <div className="text-sm text-zinc-300/80 mt-1">
                  {orderedHint}
                </div>
                <div className="text-xs text-zinc-400/80 mt-2">
                  Máximo: 3 imagens. Formatos aceitos: JPG/JPEG/PNG.
                </div>
              </div>

              <button
                type="button"
                className="btn"
                onClick={closePicker}
              >
                Cancelar
              </button>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <button type="button" className="btn btn-cta" onClick={pickFiles}>
                Selecionar arquivos
              </button>

              <div className="text-xs text-zinc-300/70">
                {files.length === 0
                  ? "Nenhum arquivo selecionado"
                  : `${files.length} arquivo(s) selecionado(s)`}
              </div>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((f, idx) => (
                  <div
                    key={`${f.name}-${idx}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-zinc-100 truncate">
                        {idx + 1}. {f.name}
                      </div>
                      <div className="text-xs text-zinc-300/70">
                        {(f.size / 1024).toFixed(0)} KB
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => moveDown(idx)}
                        disabled={idx === files.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => removeAt(idx)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
              <button type="button" className="btn" onClick={closePicker}>
                Voltar
              </button>

              <button
                type="button"
                className="btn btn-cta"
                onClick={start}
                disabled={!canStart}
              >
                Processar prints
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
