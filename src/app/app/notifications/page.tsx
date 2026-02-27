// src/app/app/notifications/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type NotificationItem = {
  id: string;
  type?: string;
  severity?: string;
  title?: string;
  message?: string;
  actionUrl?: string | null;
  readAt?: string | null;
  createdAt?: string;
  channel?: string;
  source?: string;
};

function formatTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NotificationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);

  const title = useMemo(() => "Notificações", []);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/notifications?limit=50", { cache: "no-store" });
        if (!res.ok) {
          if (!alive) return;
          setError(`Falha ao carregar notificações (${res.status}).`);
          setItems([]);
          return;
        }

        const data = (await res.json()) as { items?: NotificationItem[] };
        const list = Array.isArray(data?.items) ? data.items : [];
        if (!alive) return;
        setItems(list);
      } catch {
        if (!alive) return;
        setError("Falha ao carregar notificações.");
        setItems([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="hNotifOverlay">
      <div className="hNotifCard">
        <div className="hNotifTop">
          <button className="hNotifBack" type="button" onClick={() => router.back()} aria-label="Voltar">
            &lt;
          </button>
          <div className="hNotifTitle">{title}</div>
          <div className="hNotifSpacer" />
        </div>

        <div className="hNotifBody">
          {loading ? <div className="hNotifState">Carregando...</div> : null}
          {!loading && error ? <div className="hNotifState isError">{error}</div> : null}
          {!loading && !error && items.length === 0 ? (
            <div className="hNotifState">Você não tem notificações.</div>
          ) : null}

          {!loading && !error && items.length > 0 ? (
            <div className="hNotifList">
              {items.map((n) => (
                <div key={n.id} className="hNotifItem">
                  <div className="hNotifItemTop">
                    <div className="hNotifItemTitle">{n.title || n.type || "Notificação"}</div>
                    <div className="hNotifItemTime">{formatTime(n.createdAt)}</div>
                  </div>
                  {n.message ? <div className="hNotifItemMsg">{n.message}</div> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <style jsx global>{`
        /* "camada por cima" (efeito overlay) */
        .hNotifOverlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 18px 14px;
          background: rgba(2, 6, 23, 0.12);
          backdrop-filter: blur(10px);
          animation: hNotifFade 140ms ease-out;
        }

        @keyframes hNotifFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .hNotifCard {
          width: 100%;
          max-width: 720px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(2, 6, 23, 0.08);
          box-shadow: 0 26px 78px rgba(2, 6, 23, 0.18);
          overflow: hidden;

          transform: translateY(14px);
          animation: hNotifSlide 180ms ease-out forwards;
        }

        @keyframes hNotifSlide {
          to {
            transform: translateY(0);
          }
        }

        html[data-theme="dark"] .hNotifCard {
          background: rgba(18, 18, 22, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 88px rgba(0, 0, 0, 0.62);
        }

        .hNotifTop {
          display: grid;
          grid-template-columns: 44px 1fr 44px;
          align-items: center;
          padding: 12px 12px;
          border-bottom: 1px solid rgba(2, 6, 23, 0.06);
        }
        html[data-theme="dark"] .hNotifTop {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .hNotifBack {
          height: 36px;
          width: 44px;
          border-radius: 12px;
          border: 1px solid rgba(2, 6, 23, 0.12);
          background: rgba(255, 255, 255, 0.7);
          font-weight: 900;
          cursor: pointer;
        }
        html[data-theme="dark"] .hNotifBack {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.92);
        }

        /* Desktop: ainda pode voltar, mas o botão fica discreto */
        @media (min-width: 820px) {
          .hNotifOverlay {
            padding-top: 72px;
          }
        }

        .hNotifTitle {
          text-align: center;
          font-size: 14px;
          font-weight: 900;
          color: rgba(2, 6, 23, 0.9);
        }
        html[data-theme="dark"] .hNotifTitle {
          color: rgba(255, 255, 255, 0.92);
        }

        .hNotifBody {
          padding: 12px 12px 14px;
          max-height: min(72vh, 720px);
          overflow: auto;
        }

        .hNotifState {
          font-size: 13px;
          font-weight: 800;
          color: rgba(2, 6, 23, 0.7);
          padding: 10px 4px;
        }
        .hNotifState.isError {
          color: rgba(220, 38, 38, 0.95);
        }
        html[data-theme="dark"] .hNotifState {
          color: rgba(255, 255, 255, 0.72);
        }

        .hNotifList {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .hNotifItem {
          border-radius: 14px;
          border: 1px solid rgba(2, 6, 23, 0.08);
          background: rgba(255, 255, 255, 0.7);
          padding: 12px 12px;
        }
        html[data-theme="dark"] .hNotifItem {
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.06);
        }

        .hNotifItemTop {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
        }

        .hNotifItemTitle {
          font-size: 13px;
          font-weight: 900;
          color: rgba(2, 6, 23, 0.9);
        }
        html[data-theme="dark"] .hNotifItemTitle {
          color: rgba(255, 255, 255, 0.92);
        }

        .hNotifItemTime {
          font-size: 11px;
          font-weight: 800;
          color: rgba(2, 6, 23, 0.55);
          white-space: nowrap;
        }
        html[data-theme="dark"] .hNotifItemTime {
          color: rgba(255, 255, 255, 0.55);
        }

        .hNotifItemMsg {
          margin-top: 8px;
          font-size: 13px;
          font-weight: 700;
          color: rgba(2, 6, 23, 0.72);
          line-height: 1.25;
        }
        html[data-theme="dark"] .hNotifItemMsg {
          color: rgba(255, 255, 255, 0.72);
        }
      `}</style>
    </div>
  );
}