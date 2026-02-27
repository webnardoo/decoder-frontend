// src/components/marketing/topnav/notifications/NotificationsMobileLayer.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { NotificationItem } from "./notifications.service";
import { timeAgo } from "@/shared/utils/date/timeAgo";

export type NotificationsMobileLayerProps = {
  items: NotificationItem[];
  unread: number;
  loading: boolean;
  error: string | null;

  onClose: () => void;
  onClickItem: (n: NotificationItem) => void | Promise<void>;
  onMarkAll: () => void | Promise<void>;

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

const NotificationsMobileLayer: React.FC<NotificationsMobileLayerProps> = (props) => {
  const { items, unread, loading, error, onClose, onClickItem, onMarkAll, onPixOpen } = props;

  const [mounted, setMounted] = useState(false);

  const unreadCount = unread ?? 0;
  const hasUnread = useMemo(() => items.some((n) => !n.readAt), [items]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // trava scroll do fundo (iOS/Android)
  useEffect(() => {
    if (!mounted) return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [mounted]);

  // ESC fecha (desktop devtools)
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
    <div className="hNotifLayer" role="dialog" aria-label="Notificações">
      {/* backdrop: fecha ao clicar */}
      <button
        type="button"
        className="hNotifLayer__backdrop"
        aria-label="Fechar notificações"
        onClick={onClose}
      />

      {/* sheet: superfície sólida + scroll interno */}
      <div className="hNotifLayer__sheet" onClick={(e) => e.stopPropagation()}>
        <div className="hNotifLayer__top">
          <button type="button" className="hNotifLayer__back" onClick={onClose} aria-label="Fechar">
            ←
          </button>

          <div className="hNotifLayer__title">
            Notificações {unreadCount > 0 ? `(${unreadCount})` : ""}
          </div>

          <button type="button" className="hNotifLayer__close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="hNotifLayer__body">
          {loading ? (
            <div className="hNotifLayer__state">Carregando…</div>
          ) : error ? (
            <div className="hNotifLayer__state hNotifLayer__state--err">{error}</div>
          ) : items.length === 0 ? (
            <div className="hNotifLayer__state">Nenhuma notificação encontrada.</div>
          ) : (
            <div className="hNotifLayer__list">
              {items.map((n, idx) => {
                const id = String(n?.id || "").trim();
                const isUnread = !n.readAt;
                const key = id ? id : `notif_${idx}`;

                const showPixLink = Boolean(onPixOpen) && hasPixHint(n);
                const pixPaymentId = showPixLink ? extractPixPaymentId(n) : null;

                return (
                  <div key={key} className={`hNotifLayer__itemWrap ${isUnread ? "isUnread" : "isRead"}`}>
                    <button
                      type="button"
                      className={`hNotifLayer__item ${isUnread ? "isUnread" : "isRead"}`}
                      onClick={() => onClickItem(n)}
                    >
                      <div className="hNotifLayer__itemTop">
                        <div className="hNotifLayer__itemTitle">{n.title || "Notificação"}</div>
                        <div className="hNotifLayer__itemTime">{n.createdAt ? timeAgo(n.createdAt) : ""}</div>
                      </div>

                      {n.message ? <div className="hNotifLayer__itemMsg">{n.message}</div> : null}
                    </button>

                    {showPixLink && pixPaymentId ? (
                      <button
                        type="button"
                        className="hNotifLayer__pixLink"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onPixOpen?.(pixPaymentId);
                        }}
                      >
                        Acesse os dados do Pix aqui
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div className="hNotifLayer__footer">
            <button type="button" className="hNotifLayer__all" onClick={onMarkAll} disabled={!hasUnread}>
              Marcar como lidas
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NotificationsMobileLayer;