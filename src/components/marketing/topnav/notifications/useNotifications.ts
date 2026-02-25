// src/components/marketing/topnav/notifications/useNotifications.ts
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  NotificationItem,
  fetchNotifications,
  fetchUnreadCount,
  postMarkRead,
  postReadAll,
} from "./notifications.service";

export function useNotifications(enabled: boolean) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ evita duplicação por id (hover pode re-entrar)
  const inFlightRef = useRef<Set<string>>(new Set());

  const hasUnread = useMemo(() => items.some((n) => !n.readAt), [items]);

  async function load(limit: number) {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchNotifications(limit);
      setItems(list);

      const n = await fetchUnreadCount();
      if (typeof n === "number") setUnread(n);

      return list;
    } catch {
      setError("Falha ao carregar notificações.");
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function markAllAsRead() {
    if (!hasUnread) return;

    // ✅ NÃO MEXER NO COMPORTAMENTO DO READ-ALL
    const nowIso = new Date().toISOString();
    setItems((prev) => prev.map((it) => (it.readAt ? it : { ...it, readAt: nowIso })));
    setUnread(0);

    try {
      const newUnread = await postReadAll();
      if (typeof newUnread === "number") setUnread(newUnread);
    } catch {
      const n = await fetchUnreadCount().catch(() => null);
      if (typeof n === "number") setUnread(n);
    }
  }

  /**
   * ✅ ÚNICA função para hover: markReadOnly(id)
   * - valida id
   * - impede repetição
   * - atualiza estado local (otimista)
   * - chama service
   */
  async function markReadOnly(idRaw: string) {
    const id = String(idRaw || "").trim();
    if (!id) return;

    // já está lida localmente
    const current = items.find((x) => String(x?.id || "").trim() === id);
    if (current?.readAt) return;

    if (inFlightRef.current.has(id)) return;
    inFlightRef.current.add(id);

    // optimistic
    const nowIso = new Date().toISOString();
    setItems((prev) =>
      prev.map((it) => (String(it?.id || "").trim() === id ? { ...it, readAt: nowIso } : it))
    );
    setUnread((u) => Math.max(0, (u || 0) - 1));

    try {
      const newUnread = await postMarkRead(id);
      if (typeof newUnread === "number") setUnread(newUnread);
    } catch {
      // rollback + resync contagem
      setItems((prev) =>
        prev.map((it) => (String(it?.id || "").trim() === id ? { ...it, readAt: null } : it))
      );
      const n2 = await fetchUnreadCount().catch(() => null);
      if (typeof n2 === "number") setUnread(n2);
    } finally {
      inFlightRef.current.delete(id);
    }
  }

  /**
   * Click: marca e navega (mantém comportamento atual)
   */
  async function markOneAndNavigate(n: NotificationItem, router: any) {
    const id = String(n?.id || "").trim();
    if (id) await markReadOnly(id);
    if (n?.actionUrl) router.push(n.actionUrl);
  }

  useEffect(() => {
    if (!enabled) return;
    void load(5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    items,
    unread,
    loading,
    error,
    load,
    markAllAsRead,
    markReadOnly,
    markOneAndNavigate,
  };
}