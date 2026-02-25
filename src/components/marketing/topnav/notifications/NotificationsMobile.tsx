// src/components/marketing/topnav/notifications/NotificationsMobile.tsx
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

export default function NotificationsMobile({
  items,
  loading,
  error,
  unread,
  onClose,
  onClickItem,
  onMarkAll,
}: Props) {
  return (
    <div className="hNotifLayer">
      <button
        type="button"
        className="hNotifLayer__backdrop"
        onClick={onClose}
      />

      <div className="hNotifLayer__sheet">
        <div className="hNotifLayer__top">
          <button
            type="button"
            className="hNotifLayer__back"
            onClick={onClose}
          >
            ←
          </button>

          <div className="hNotifLayer__title">
            Notificações {unread > 0 ? `(${unread})` : ""}
          </div>

          <button
            type="button"
            className="hNotifLayer__close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="hNotifLayer__body">
          {loading ? (
            <div className="hNotifLayer__state">Carregando…</div>
          ) : error ? (
            <div className="hNotifLayer__state hNotifLayer__state--err">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="hNotifLayer__state">
              Nenhuma notificação encontrada.
            </div>
          ) : (
            <>
              <div className="hNotifLayer__list">
                {items.map((n) => {
                  const isUnread = !n.readAt;

                  return (
                    <button
                      key={n.id}
                      type="button"
                      className={`hNotifLayer__item ${
                        isUnread ? "isUnread" : "isRead"
                      }`}
                      onClick={() => onClickItem(n)}
                    >
                      <div className="hNotifLayer__itemTop">
                        <div className="hNotifLayer__itemTitle">
                          {n.title || "Notificação"}
                        </div>
                        <div className="hNotifLayer__itemTime">
                          {timeAgo(n.createdAt)}
                        </div>
                      </div>

                      {n.message ? (
                        <div className="hNotifLayer__itemMsg">
                          {n.message}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="hNotifLayer__footer">
                <button
                  type="button"
                  className="hNotifLayer__all"
                  onClick={onMarkAll}
                  disabled={items.filter((n) => !n.readAt).length === 0}
                >
                  Marcar todas como lidas
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}