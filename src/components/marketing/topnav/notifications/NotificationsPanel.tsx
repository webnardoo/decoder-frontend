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

function hasPixHint(n: NotificationItem): boolean {
  const type = String(n?.entityType || "").toUpperCase();
  const id = String(n?.entityId || "").trim();
  if (type === "PAYMENT" && id) return true;

  const msg = String(n?.message || "");
  return /pay_[a-z0-9]+/i.test(msg);
}

function extractPixPaymentId(n: NotificationItem): string | null {
  const id = String(n?.entityId || "").trim();
  if (id) return id;

  const msg = String(n?.message || "");
  const m = msg.match(/(pay_[a-z0-9]+)/i);
  return m?.[1] ? String(m[1]) : null;
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

              const showPixLink = Boolean(onPixOpen) && hasPixHint(n);
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