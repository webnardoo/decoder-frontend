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

                // ✅ agora: link só aparece em NOTIFICAÇÃO DE PIX CRIADO
                const showPixLink = Boolean(onPixOpen) && isPixCreatedNotification(n);
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