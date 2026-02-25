// src/components/marketing/topnav/notifications/NotificationsMobile.tsx
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

  // fecha
  onClose: () => void;
};

export default function NotificationsMobile({
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
    <div className="hNotifLayerOverlay" role="presentation" onPointerDown={onClose}>
      <div
        className="hNotifLayer"
        role="dialog"
        aria-label="Notificações"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="hNotifLayer__head">
          <div className="hNotifLayer__title">
            Notificações {unreadCount > 0 ? `(${unreadCount})` : ""}
          </div>

          <div className="hNotifLayer__actions">
            <button
              type="button"
              className="hNotifLayer__markBtn"
              onClick={onMarkAll}
              disabled={!hasUnread}
            >
              Marcar como lidas
            </button>

            <button type="button" className="hNotifLayer__closeBtn" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="hNotifLayer__state">Carregando…</div>
        ) : error ? (
          <div className="hNotifLayer__state hNotifLayer__state--err">{error}</div>
        ) : items.length === 0 ? (
          <div className="hNotifLayer__state">Nenhuma notificação encontrada.</div>
        ) : (
          <div className="hNotifLayer__list">
            {items.map((n) => {
              const isUnread = !n.readAt;
              const createdLabel = n.createdAt ? timeAgo(n.createdAt) : "";

              return (
                <button
                  key={n.id}
                  type="button"
                  className={`hNotifLayer__item ${isUnread ? "isUnread" : "isRead"}`}
                  onClick={() => onClickItem(n)}
                >
                  <div className="hNotifLayer__itemTop">
                    <div className="hNotifLayer__itemTitle">
                      {n.title || "Notificação"}
                    </div>
                    <div className="hNotifLayer__itemTime">{createdLabel}</div>
                  </div>

                  {n.message ? (
                    <div className="hNotifLayer__itemMsg">{n.message}</div>
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