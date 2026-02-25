// src/components/marketing/topnav/notifications/NotificationsPanel.tsx
"use client";

import { NotificationItem } from "./notifications.service";
import { timeAgo } from "@/shared/utils/date/timeAgo";

type Props = {
  items: NotificationItem[];
  loading: boolean;
  error: string | null;
  unread: number;
  onClose: () => void;
  onClickItem: (n: NotificationItem) => void;
  onMarkAll: () => void;
};

export default function NotificationsPanel({
  items,
  loading,
  error,
  unread,
  onClose,
  onClickItem,
  onMarkAll,
}: Props) {
  return (
    <div className="hNotifPanel">
      <button
        type="button"
        className="hNotifPanel__backdrop"
        onClick={onClose}
      />

      <div className="hNotifPanel__sheet">
        <div className="hNotifPanel__top">
          <div className="hNotifPanel__title">
            Notificações {unread > 0 ? `(${unread})` : ""}
          </div>

          <div className="hNotifPanel__topActions">
            <button
              type="button"
              className="hNotifPanel__markBtn"
              onClick={onMarkAll}
              disabled={items.filter((n) => !n.readAt).length === 0}
            >
              Marcar como lidas
            </button>

            <button
              type="button"
              className="hNotifPanel__close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="hNotifPanel__body">
          {loading ? (
            <div className="hNotifPanel__state">Carregando…</div>
          ) : error ? (
            <div className="hNotifPanel__state hNotifPanel__state--err">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="hNotifPanel__state">
              Nenhuma notificação encontrada.
            </div>
          ) : (
            <div className="hNotifPanel__list">
              {items.map((n) => {
                const isUnread = !n.readAt;

                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`hNotifPanel__item ${
                      isUnread ? "isUnread" : "isRead"
                    }`}
                    onClick={() => onClickItem(n)}
                  >
                    <div className="hNotifPanel__itemTop">
                      <div className="hNotifPanel__itemTitle">
                        {n.title || "Notificação"}
                      </div>
                      <div className="hNotifPanel__itemTime">
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>

                    {n.message ? (
                      <div className="hNotifPanel__itemMsg">
                        {n.message}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}