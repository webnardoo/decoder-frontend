// src/components/marketing/topnav/notifications/NotificationsPanel.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { NotificationItem } from "./notifications.service";
import { timeAgo } from "@/shared/utils/date/timeAgo";

type Props = {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  error: string | null;

  onMarkAll: () => void | Promise<void>;
  onClickItem: (n: NotificationItem) => void | Promise<void>;

  onClose: () => void;
};

export default function NotificationsPanel({
  items,
  unread,
  loading,
  error,
  onMarkAll,
  onClickItem,
  onClose,
}: Props) {
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
      <div
        className="hNotifPanel"
        role="dialog"
        aria-label="Todas as notificações"
        onPointerDown={(e) => e.stopPropagation()}
      >
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

              return (
                <button
                  key={n.id}
                  type="button"
                  className={`hNotifPanel__item ${isUnread ? "isUnread" : "isRead"}`}
                  onClick={() => onClickItem(n)}
                >
                  <div className="hNotifPanel__itemTop">
                    <div className="hNotifPanel__itemTitle">
                      {n.title || "Notificação"}
                    </div>
                    <div className="hNotifPanel__itemTime">{createdLabel}</div>
                  </div>

                  {n.message ? (
                    <div className="hNotifPanel__itemMsg">{n.message}</div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}