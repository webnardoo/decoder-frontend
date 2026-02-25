// src/components/marketing/topnav/notifications/NotificationsDesktop.tsx
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
  onOpenAll?: () => void | Promise<void>;

  // fecha ao clicar fora / ESC
  onRequestClose: () => void;

  // ✅ hover marca como lida (sem navegar)
  onHoverItemId?: (id: string) => void | Promise<void>;
};

export default function NotificationsDesktop({
  items,
  unread,
  loading,
  error,
  onMarkAll,
  onClickItem,
  onOpenAll,
  onRequestClose,
  onHoverItemId,
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
      if (e.key === "Escape") onRequestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onRequestClose]);

  function handleHover(n: NotificationItem) {
    if (!onHoverItemId) return;

    const id = String(n?.id || "").trim();
    if (!id) return; // ✅ evita //read
    if (n.readAt) return; // só unread

    void Promise.resolve(onHoverItemId(id)).catch(() => null);
  }

  if (!mounted) return null;

  return createPortal(
    <div className="hNotifDropOverlay" role="presentation" onPointerDown={() => onRequestClose()}>
      <div
        className="hNotifDrop"
        role="dialog"
        aria-label="Notificações"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="hNotifDrop__head">
          <div className="hNotifDrop__title">
            Notificações {unreadCount > 0 ? `(${unreadCount})` : ""}
          </div>

          <div className="hNotifDrop__headActions">
            <button
              type="button"
              className="hNotifDrop__markBtn"
              onClick={onMarkAll}
              disabled={!hasUnread}
            >
              Marcar como lidas
            </button>

            {onOpenAll ? (
              <button type="button" className="hNotifDrop__allBtn" onClick={onOpenAll}>
                Ver todas
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <div className="hNotifDrop__state">Carregando…</div>
        ) : error ? (
          <div className="hNotifDrop__state hNotifDrop__state--err">{error}</div>
        ) : items.length === 0 ? (
          <div className="hNotifDrop__state">Nenhuma notificação encontrada.</div>
        ) : (
          <div className="hNotifDrop__list">
            {items.map((n, idx) => {
              const id = String(n?.id || "").trim();
              const isUnread = !n.readAt;

              // ✅ key estável mesmo se vier id vazio (não quebra render)
              const key = id ? id : `notif_${idx}`;

              return (
                <button
                  key={key}
                  type="button"
                  className={`hNotifDrop__item ${isUnread ? "isUnread" : "isRead"}`}
                  onMouseEnter={() => handleHover(n)} // ✅ evento único e determinístico
                  onClick={() => onClickItem(n)}
                >
                  <div className="hNotifDrop__itemTop">
                    <div className="hNotifDrop__itemTitle">{n.title || "Notificação"}</div>
                    <div className="hNotifDrop__itemTime">
                      {n.createdAt ? timeAgo(n.createdAt) : ""}
                    </div>
                  </div>

                  {n.message ? <div className="hNotifDrop__itemMsg">{n.message}</div> : null}
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