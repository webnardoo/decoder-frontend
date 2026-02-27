// src/components/marketing/topnav/notifications/notifications.service.ts

export type NotificationItem = {
  id: string;
  type?: string | null;
  severity?: "info" | "success" | "warning" | "error" | string | null;
  title?: string | null;
  message?: string | null;
  actionUrl?: string | null;
  createdAt?: string | null;
  readAt?: string | null;
  channel?: string | null;
  source?: string | null;

  // ✅ NOVO: necessário para “PIX gerado” consultar depois (cross-device)
  entityType?: string | null; // ex: "PAYMENT"
  entityId?: string | null; // ex: payment.id do Asaas
};

export type PixDetails = {
  ok: true;
  provider: "ASAAS";
  paymentId: string;
  invoiceUrl?: string | null;
  value?: number | null;
  dueDate?: string | null; // YYYY-MM-DD (se vier)
  pixQrCode: {
    encodedImage?: string | null; // base64
    payload?: string | null; // copia e cola
    expirationDate?: string | null; // ISO (se vier)
  };
};

/**
 * IMPORTANT:
 * No FRONT, sempre chamar via proxy do Next:
 *   /api/notifications/*
 * O proxy encaminha para o BACK:
 *   /api/v1/notifications/*
 */

export async function fetchUnreadCount(signal?: AbortSignal): Promise<number | null> {
  try {
    const res = await fetch("/api/notifications/unread-count", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include",
      signal,
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const n = Number(data?.unreadCount);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
  } catch {
    return null;
  }
}

export async function fetchNotifications(limit: number): Promise<NotificationItem[]> {
  try {
    const res = await fetch(`/api/notifications?limit=${limit}`, {
      cache: "no-store",
      credentials: "include",
    });

    if (!res.ok) return [];

    const data = await res.json().catch(() => null);
    if (Array.isArray(data?.items)) return data.items as NotificationItem[];
    if (Array.isArray(data)) return data as NotificationItem[];
    return [];
  } catch {
    return [];
  }
}

/**
 * Marca UMA notificação como lida.
 * BACK:  POST /api/v1/notifications/:id/read
 * FRONT: POST /api/notifications/:id/read   (proxy)
 */
export async function postMarkRead(id: string): Promise<number | null> {
  try {
    const safeId = (id || "").trim();
    if (!safeId) return null;

    const res = await fetch(`/api/notifications/${encodeURIComponent(safeId)}/read`, {
      method: "POST",
      cache: "no-store",
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const n = Number(data?.unreadCount);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  } catch {
    return null;
  }
}

/**
 * Marca TODAS como lidas.
 * BACK:  POST /api/v1/notifications/read-all
 * FRONT: POST /api/notifications/read-all   (proxy)
 */
export async function postReadAll(): Promise<number | null> {
  try {
    const res = await fetch(`/api/notifications/read-all`, {
      method: "POST",
      cache: "no-store",
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const n = Number(data?.unreadCount);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  } catch {
    return null;
  }
}

/**
 * Se você ainda usa read-many, mantém.
 * (Só funciona se existir rota no proxy/back.)
 */
export async function postReadMany(ids: string[]): Promise<number | null> {
  try {
    const safeIds = Array.isArray(ids) ? ids.map((x) => (x || "").trim()).filter(Boolean) : [];
    if (!safeIds.length) return null;

    const res = await fetch(`/api/notifications/read-many`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "include",
      body: JSON.stringify({ ids: safeIds }),
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const n = Number(data?.unreadCount);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  } catch {
    return null;
  }
}

/**
 * ✅ CONSULTA PIX por paymentId (Asaas)
 * FRONT via proxy real do Next (conforme sua árvore):
 *   GET /api/billing/addons/asaas/pix/:paymentId
 *
 * (mapeia para o BACK:
 *   GET /api/v1/billing/asaas/pix/:paymentId)
 */
export async function fetchPixDetails(
  paymentId: string,
  signal?: AbortSignal
): Promise<PixDetails | null> {
  try {
    const pid = String(paymentId || "").trim();
    if (!pid) return null;

    const res = await fetch(`/api/billing/addons/asaas/pix/${encodeURIComponent(pid)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include",
      signal,
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (data?.ok !== true) return null;

    return data as PixDetails;
  } catch {
    return null;
  }
}