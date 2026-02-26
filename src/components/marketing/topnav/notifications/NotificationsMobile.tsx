// src/components/marketing/topnav/notifications/NotificationsMobile.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { NotificationItem } from "./notifications.service";
import { timeAgo } from "@/shared/utils/date/timeAgo";

<div style={{position:"fixed", top:0, left:0, zIndex:999999, background:"#f00", color:"#fff", padding:4}}>
  MOBILE_COMPONENT_RENDERED
</div>

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
  <div className="hNotifLayerOverlay" role="presentation" onClick={onClose}>
    <div
      className="hNotifLayer"
      role="dialog"
      aria-label="Notificações"
      onClick={(e) => e.stopPropagation()}
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

      {/* ...restante do conteúdo... */}
    </div>
  </div>,
  document.body
);
}