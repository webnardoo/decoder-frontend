// src/components/marketing/topnav/notifications/NotificationsPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { NotificationItem } from "./notifications.service";
import { timeAgo } from "@/shared/utils/date/timeAgo";

export type NotificationsPanelProps = {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  error: string | null;

  onMarkAll: () => void | Promise<void>;
  onClickItem: (n: NotificationItem) => void | Promise<void>;

  onClose: () => void;

  // ✅ PIX: abrir modal com paymentId
  onPixOpen?: (paymentId: string) => void;
};

function isPixCreatedNotification(n: NotificationItem): boolean {
  const t = String(n?.title ?? "").toLowerCase();
  const m = String(n?.message ?? "").toLowerCase();

  const type = String((n as any)?.type ?? "").toLowerCase();
  const code = String((n as any)?.code ?? "").toLowerCase();
  const et = String((n as any)?.entityType ?? "").toLowerCase();

  if (t.includes("pix gerado") || t.includes("pix criado")) return true;
  if (m.includes("pix foi gerado") || m.includes("pix gerado") || m.includes("pix criado")) return true;

  if (type.includes("pix_created") || type.includes("pix_gerado") || type.includes("pix_criado")) return true;
  if (code.includes("pix_created") || code.includes("pix_gerado") || code.includes("pix_criado")) return true;

  if (et === "payment" && (t.includes("gerado") || m.includes("gerado"))) return true;

  return false;
}

function extractPixPaymentId(n: NotificationItem): string | null {
  const id = String((n as any)?.entityId || "").trim();
  if (id) return id;

  const url = String((n as any)?.actionUrl ?? "").trim();
  if (url) {
    let m = url.match(/\/pix\/(?:pay\/)?(pay_[^/?#]+)/i);
    if (m?.[1]) return String(m[1]).trim();

    m = url.match(/\/pix\/pay\/([^/?#]+)/i);
    if (m?.[1]) return String(m[1]).trim();

    m = url.match(/\/pix\/([^/?#]+)/i);
    const seg = m?.[1] ? String(m[1]).trim() : "";
    if (seg && seg.toLowerCase() !== "pay") return seg;
  }

  const msg = String(n?.message || "");
  const m2 = msg.match(/(pay_[a-z0-9]+)/i);
  return m2?.[1] ? String(m2[1]) : null;
}

export default function NotificationsPanel({
  items,
  unread,
  loading,
  error,
  onMarkAll,
  onClickItem,
  onClose,
  onPixOpen,
}: NotificationsPanelProps) {
  const [mounted, setMounted] = useState(false);

  const unreadCount = unread ?? 0;
  const hasUnread = useMemo(() => items.some((n) => !n.readAt), [items]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ESC fecha
  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="hNotifPanelOverlay" role="presentation" onPointerDown={onClose}>
      <div className="hNotifLayer__panel" onPointerDown={(e) => e.stopPropagation()}>
        <div className="hNotifPanel__head">
          <div className="hNotifPanel__title">
            Notificações {unreadCount > 0 ? `(${unreadCount})` : ""}
          </div>

          <div className="hNotifPanel__actions">
            <button
              type="button"
              className="hNotifPanel__markBtn"
              onClick={onMarkAll}
              disabled={!hasUnread}
            >
              Marcar como lidas
            </button>

            <button type="button" className="hNotifPanel__closeBtn" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="hNotifPanel__state">Carregando…</div>
        ) : error ? (
          <div className="hNotifPanel__state hNotifPanel__state--err">{error}</div>
        ) : items.length === 0 ? (
          <div className="hNotifPanel__state">Nenhuma notificação encontrada.</div>
        ) : (
          <div className="hNotifPanel__list">
            {items.map((n) => {
              const isUnread = !n.readAt;
              const createdLabel = n.createdAt ? timeAgo(n.createdAt) : "";

              // ✅ agora: link só aparece em NOTIFICAÇÃO DE PIX CRIADO
              const showPixLink = Boolean(onPixOpen) && isPixCreatedNotification(n);
              const pixPaymentId = showPixLink ? extractPixPaymentId(n) : null;

              return (
                <div
                  key={n.id}
                  className={`hNotifPanel__itemWrap ${isUnread ? "isUnread" : "isRead"}`}
                >
                  <button
                    type="button"
                    className={`hNotifPanel__item ${isUnread ? "isUnread" : "isRead"}`}
                    onClick={() => onClickItem(n)}
                  >
                    <div className="hNotifPanel__itemTop">
                      <div className="hNotifPanel__itemTitle">{n.title || "Notificação"}</div>
                      <div className="hNotifPanel__itemTime">{createdLabel}</div>
                    </div>

                    {n.message ? <div className="hNotifPanel__itemMsg">{n.message}</div> : null}
                  </button>

                  {showPixLink && pixPaymentId ? (
                    <button
                      type="button"
                      className="hNotifPanel__itemLink"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPixOpen?.(pixPaymentId);
                      }}
                      aria-label="Acessar dados do Pix"
                    >
                      Acesse os dados do Pix aqui
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        .hNotifPanel__itemLink {
          margin-top: 8px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          text-align: left;
          text-decoration: underline;
          font-weight: 600;
        }
        .hNotifPanel__itemLink:hover {
          opacity: 0.85;
        }
        .hNotifPanel__itemWrap {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>,
    document.body
  );
}