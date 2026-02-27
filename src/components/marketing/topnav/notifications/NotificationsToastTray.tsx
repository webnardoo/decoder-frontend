"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import "./NotificationsToastTray.css";

type ThemeMode = "light" | "dark";

type ToastItem = {
  id: string;
  type?: string | null; // ✅ precisamos do type do evento (PIX_CREATED, PIX_CONFIRMED, etc.)
  title: string;
  message?: string | null;
  severity?: string | null; // fallback
  createdAt?: string | null;
};

type Props = {
  items: ToastItem[];
  onDismiss: (id: string) => void;
  theme?: ThemeMode; // ✅ para respeitar light/dark no CSS
};

function normType(v: any): string {
  const s = String(v ?? "").trim().toUpperCase();
  // safe para virar classe CSS
  return s.replace(/[^A-Z0-9_]/g, "_");
}

function normSeverity(v: any): "info" | "success" | "warning" | "error" {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "success") return "success";
  if (s === "warning") return "warning";
  if (s === "error") return "error";
  return "info";
}

// ✅ remove apenas do TOAST (mantém na central)
function stripPixLinkCta(msg: string): string {
  const raw = String(msg ?? "").trim();
  if (!raw) return raw;

  // remove a frase exata, e também variações mínimas (case/espacos/pontuação)
  const pattern = /\s*\bAcesse\s+os\s+dados\s+do\s+pix\s+aqui\b\s*\.?\s*/gi;
  const cleaned = raw.replace(pattern, " ").replace(/\s{2,}/g, " ").trim();

  return cleaned;
}

export default function NotificationsToastTray({ items, onDismiss, theme = "light" }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  if (!items || items.length === 0) return null;

  return createPortal(
    <div className="hNotifTray" data-theme={theme} role="status" aria-live="polite">
      {items.map((t) => {
        const ntype = normType(t.type);
        const sev = normSeverity(t.severity);

        const msg = t.message ? stripPixLinkCta(t.message) : "";

        return (
          <div
            key={t.id}
            className={`hNotifTray__item nt-${ntype || "UNKNOWN"}`}
            data-ntype={ntype || "UNKNOWN"}
            data-sev={sev}
          >
            <div className="hNotifTray__content">
              <div className="hNotifTray__title">{t.title}</div>
              {msg ? <div className="hNotifTray__msg">{msg}</div> : null}
            </div>

            <button
              type="button"
              className="hNotifTray__close"
              aria-label="Fechar notificação"
              onClick={() => onDismiss(t.id)}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}