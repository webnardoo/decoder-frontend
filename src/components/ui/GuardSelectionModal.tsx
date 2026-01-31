"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  fix?: string;
  onClose: () => void;
};

export default function GuardSelectionModal({
  open,
  title,
  message,
  fix,
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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
        <div className="text-lg font-semibold text-zinc-100">{title}</div>

        <div className="mt-3 text-sm text-zinc-200/90 leading-relaxed whitespace-pre-line">
          {message}
        </div>

        {fix ? (
          <div className="mt-2 text-sm text-zinc-200/80 whitespace-pre-line">
            {fix}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button type="button" className="btn btn-cta" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
