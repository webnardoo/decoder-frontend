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

  // ✅ âncora (sino) para posicionar o dropdown corretamente
  anchorEl?: HTMLElement | null;

  // ✅ novo: abre modal PIX
  onPixOpen?: (paymentId: string) => void;
};

function extractPaymentId(n: NotificationItem): string {
  // 1) Fonte canônica: entityId (quando o backend já manda paymentId Asaas)
  const byEntity = String((n as any)?.entityId ?? "").trim();
  if (byEntity) return byEntity;

  // 2) Fallback: actionUrl (pode vir em formatos diferentes)
  const url = String((n as any)?.actionUrl ?? "").trim();
  if (!url) return "";

  // Aceitar:
  // - .../pix/pay_XXXX
  // - .../pix/pay/pay_XXXX
  // - .../pix/XXXX
  // - .../pix/pay_XXXX?...
  // - .../pix/pay/pay_XXXX?...
  //
  // Estratégia:
  // a) tenta capturar explicitamente pay_...
  let m = url.match(/\/pix\/(?:pay\/)?(pay_[^/?#]+)/i);
  if (m?.[1]) return String(m[1]).trim();

  // b) tenta capturar /pix/<segmento> (mas evita retornar literal "pay")
  m = url.match(/\/pix\/([^/?#]+)/i);
  const seg = m?.[1] ? String(m[1]).trim() : "";
  if (!seg) return "";

  // Se veio "pay" (ex: /pix/pay/<id>), tenta pegar o próximo segmento
  if (seg.toLowerCase() === "pay") {
    const m2 = url.match(/\/pix\/pay\/([^/?#]+)/i);
    return m2?.[1] ? String(m2[1]).trim() : "";
  }

  return seg;
}

function isPixCreatedNotification(n: NotificationItem): boolean {
  const t = String(n?.title ?? "").toLowerCase();
  const m = String(n?.message ?? "").toLowerCase();

  const type = String((n as any)?.type ?? "").toLowerCase();
  const code = String((n as any)?.code ?? "").toLowerCase();
  const et = String((n as any)?.entityType ?? "").toLowerCase();

  // ✅ heurística segura: só “PIX gerado / criado”
  if (t.includes("pix gerado") || t.includes("pix criado")) return true;
  if (m.includes("pix foi gerado") || m.includes("pix gerado") || m.includes("pix criado")) return true;

  // ✅ se o backend já tiver tipo/código explícito (caso exista)
  if (type.includes("pix_created") || type.includes("pix_gerado") || type.includes("pix_criado")) return true;
  if (code.includes("pix_created") || code.includes("pix_gerado") || code.includes("pix_criado")) return true;

  // ✅ caso exista modelagem “PAYMENT” com mensagem de gerado (evita “expirou”)
  if (et === "payment" && (t.includes("gerado") || m.includes("gerado"))) return true;

  return false;
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

  // ESC fecha
  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onRequestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onRequestClose]);

  // trava scroll do body enquanto o dropdown estiver aberto (evita “scroll da página por trás”)
  useEffect(() => {
    if (!mounted) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  // posiciona o dropdown com base no sino (portal-safe)
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

    // reposiciona em scroll/resize (captura scroll em qualquer container)
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
    if (!id) return; // ✅ evita //read
    if (n.readAt) return; // só unread

    void Promise.resolve(onHoverItemId(id)).catch(() => null);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      // Backdrop precisa existir pra fechar ao clicar fora,
      // mas NÃO pode bloquear o TopNav (sino) => zIndex menor que o header
      className="hNotifDrop__backdrop"
      role="presentation"
      onPointerDown={() => onRequestClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        zIndex: 40, // header tem z-index 50
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
          zIndex: 60, // acima do conteúdo (e abaixo/fora do sino porque não cobre o topo)
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

              // ✅ agora: link só aparece em NOTIFICAÇÃO DE PIX CRIADO
              const showPixLink = Boolean(onPixOpen) && isPixCreatedNotification(n);
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
                    <div className="hNotifDrop__itemTime">
                      {n.createdAt ? timeAgo(n.createdAt) : ""}
                    </div>
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