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

  onRequestClose: () => void;

  onHoverItemId?: (id: string) => void | Promise<void>;
  anchorEl?: HTMLElement | null;

  // ✅ novo: abre modal PIX
  onPixOpen?: (paymentId: string) => void;
};

function extractPaymentId(n: NotificationItem): string {
  const byEntity = String((n as any)?.entityId ?? "").trim();
  if (byEntity) return byEntity;

  const url = String((n as any)?.actionUrl ?? "").trim();
  if (!url) return "";

  // tenta achar ".../pix/<id>" ou ".../pix/pay_<id>"
  const m = url.match(/\/pix\/([^/?#]+)/i);
  return m?.[1] ? String(m[1]).trim() : "";
}

function hasPixHint(n: NotificationItem): boolean {
  const t = String(n?.title ?? "").toLowerCase();
  const m = String(n?.message ?? "").toLowerCase();
  const et = String((n as any)?.entityType ?? "").toLowerCase();
  return t.includes("pix") || m.includes("pix") || et === "payment";
}

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
  anchorEl,
  onPixOpen,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 74, right: 16 });

  const unreadCount = unread ?? 0;
  const hasUnread = useMemo(() => items.some((n) => !n.readAt), [items]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onRequestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onRequestClose]);

  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    function compute() {
      if (!anchorEl) {
        setPos({ top: 74, right: 16 });
        return;
      }
      const r = anchorEl.getBoundingClientRect();
      const top = Math.round(r.bottom + 10);
      const right = Math.max(12, Math.round(window.innerWidth - r.right));
      setPos({ top, right });
    }

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);

    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [mounted, anchorEl]);

  function handleHover(n: NotificationItem) {
    if (!onHoverItemId) return;

    const id = String(n?.id || "").trim();
    if (!id) return;
    if (n.readAt) return;

    void Promise.resolve(onHoverItemId(id)).catch(() => null);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="hNotifDrop__backdrop"
      role="presentation"
      onPointerDown={() => onRequestClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        zIndex: 40,
      }}
    >
      <div
        className="hNotifDrop"
        role="dialog"
        aria-label="Notificações"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: pos.top,
          right: pos.right,
          zIndex: 60,
        }}
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
              const key = id ? id : `notif_${idx}`;

              const showPixLink = Boolean(onPixOpen) && hasPixHint(n);
              const pixPaymentId = showPixLink ? extractPaymentId(n) : "";

              return (
                <button
                  key={key}
                  type="button"
                  className={`hNotifDrop__item ${isUnread ? "isUnread" : "isRead"}`}
                  onMouseEnter={() => handleHover(n)}
                  onClick={() => onClickItem(n)}
                >
                  <div className="hNotifDrop__itemTop">
                    <div className="hNotifDrop__itemTitle">{n.title || "Notificação"}</div>
                    <div className="hNotifDrop__itemTime">{n.createdAt ? timeAgo(n.createdAt) : ""}</div>
                  </div>

                  {n.message ? <div className="hNotifDrop__itemMsg">{n.message}</div> : null}

                  {showPixLink ? (
                    <button
                      type="button"
                      className="hNotifDrop__pixLink"
                      disabled={!pixPaymentId}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!pixPaymentId) return;
                        onPixOpen?.(pixPaymentId);
                      }}
                    >
                      Acesse os dados do Pix aqui
                    </button>
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