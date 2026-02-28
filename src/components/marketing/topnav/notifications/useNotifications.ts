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
import { setCreditsBalanceRealtimeGlobal } from "@/lib/credits-balance-realtime";

type ToastPayload = {
  id: string;
  severity?: string | null;
  title?: string | null;
  message?: string | null;
};

type CreditsBalancePayload = {
  creditsBalance: number;
  sourceNotificationId?: string;
};

export function useNotifications(enabled: boolean) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ REALTIME: último saldo resolvido recebido via SSE (plan + addon)
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  // ✅ evita duplicação por id (hover pode re-entrar)
  const inFlightRef = useRef<Set<string>>(new Set());

  // ✅ SSE refs
  const esRef = useRef<EventSource | null>(null);
  const seenRealtimeIdsRef = useRef<Set<string>>(new Set());

  // ✅ Toast bridge (sem acoplar componente aqui)
  const toastListenersRef = useRef<Set<(t: ToastPayload) => void>>(new Set());

  // ✅ Credits bridge (sem acoplar store global aqui)
  const creditsListenersRef = useRef<Set<(p: CreditsBalancePayload) => void>>(new Set());

  const hasUnread = useMemo(() => items.some((n) => !n.readAt), [items]);

  function emitToast(t: ToastPayload) {
    toastListenersRef.current.forEach((fn) => {
      try {
        fn(t);
      } catch {
        // noop
      }
    });
  }

  function onToast(fn: (t: ToastPayload) => void) {
    toastListenersRef.current.add(fn);
    return () => toastListenersRef.current.delete(fn);
  }

  function emitCreditsBalance(p: CreditsBalancePayload) {
    creditsListenersRef.current.forEach((fn) => {
      try {
        fn(p);
      } catch {
        // noop
      }
    });
  }

  function onCreditsBalance(fn: (p: CreditsBalancePayload) => void) {
    creditsListenersRef.current.add(fn);
    return () => creditsListenersRef.current.delete(fn);
  }

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

  async function markReadOnly(idRaw: string) {
    const id = String(idRaw || "").trim();
    if (!id) return;

    const current = items.find((x) => String(x?.id || "").trim() === id);
    if (current?.readAt) return;

    if (inFlightRef.current.has(id)) return;
    inFlightRef.current.add(id);

    const nowIso = new Date().toISOString();
    setItems((prev) =>
      prev.map((it) => (String(it?.id || "").trim() === id ? { ...it, readAt: nowIso } : it))
    );
    setUnread((u) => Math.max(0, (u || 0) - 1));

    try {
      const newUnread = await postMarkRead(id);
      if (typeof newUnread === "number") setUnread(newUnread);
    } catch {
      setItems((prev) =>
        prev.map((it) => (String(it?.id || "").trim() === id ? { ...it, readAt: null } : it))
      );
      const n2 = await fetchUnreadCount().catch(() => null);
      if (typeof n2 === "number") setUnread(n2);
    } finally {
      inFlightRef.current.delete(id);
    }
  }

  // ✅ Clique: marca e navega (se quiser manter no futuro)
  async function markOneAndNavigate(n: NotificationItem, router: any) {
    const id = String(n?.id || "").trim();
    if (id) await markReadOnly(id);
    if ((n as any)?.actionUrl) router.push((n as any).actionUrl);
  }

  // ✅ SSE: aplica evento no estado local (badge + lista + toast + creditsBalance)
  function applyRealtime(dto: any) {
    const id = String(dto?.id || "").trim();
    if (!id) return;

    

    // dedupe por id (evita duplicação em reconexões)
    if (seenRealtimeIdsRef.current.has(id)) return;
    seenRealtimeIdsRef.current.add(id);

    // ✅ saldo resolvido (plan + addon) — realtime only
    const maybeCreditsBalance = dto?.creditsBalance;
    if (typeof maybeCreditsBalance === "number" && Number.isFinite(maybeCreditsBalance)) {
      setCreditsBalance(maybeCreditsBalance);
      emitCreditsBalance({ creditsBalance: maybeCreditsBalance, sourceNotificationId: id });
    }

    if (typeof maybeCreditsBalance === "number" && Number.isFinite(maybeCreditsBalance)) {
  setCreditsBalanceRealtimeGlobal(maybeCreditsBalance);
  setCreditsBalance(maybeCreditsBalance);
  emitCreditsBalance({ creditsBalance: maybeCreditsBalance, sourceNotificationId: id });
}

    const createdAt = dto?.createdAt ?? new Date().toISOString();
    const readAt = dto?.readAt ?? null;

    const normalized: NotificationItem = {
      id,
      type: dto?.type ?? null,
      severity: dto?.severity ?? null,
      title: dto?.title ?? null,
      message: dto?.message ?? null,
      actionUrl: dto?.actionUrl ?? null,
      createdAt,
      readAt,
      channel: dto?.channel ?? null,
      source: dto?.source ?? null,
      // mantém campos extras se existirem
      ...(dto?.entityType ? { entityType: dto.entityType } : {}),
      ...(dto?.entityId ? { entityId: dto.entityId } : {}),
    } as any;

    // 🔥 badge: se chegou unread, incrementa
    if (!readAt) {
      setUnread((u) => (u || 0) + 1);
    }

    // lista: coloca no topo e remove duplicados se já existia
    setItems((prev) => {
      const without = prev.filter((x) => String(x?.id || "").trim() !== id);
      return [normalized, ...without];
    });

    // toast bandeja (não modal)
    emitToast({
      id,
      severity: String(dto?.severity ?? "info"),
      title: String(dto?.title ?? "Notificação"),
      message: String(dto?.message ?? ""),
    });
  }

  // ✅ Conecta SSE quando habilitado
  useEffect(() => {
    if (!enabled) return;

    // evita múltiplos streams
    if (esRef.current) return;

    // rota proxied no Next
    const url = "/api/v1/notifications/stream";

    try {
      const es = new EventSource(url, { withCredentials: true });
      esRef.current = es;

      // event: notification
      es.addEventListener("notification", (ev: MessageEvent) => {
        try {
          const dto = JSON.parse(String(ev.data || "{}"));
          applyRealtime(dto);
        } catch {
          // ignore
        }
        
      });

      

      // opcional: ping só para debug (não precisa fazer nada)
      es.addEventListener("ping", () => null);

      es.onerror = () => {
        // não fecha aqui: EventSource tenta reconectar sozinho
        // mas se você quiser resetar depois, pode.
      };
    } catch {
      // ignore
    }

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

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

    // ✅ para o TopNav registrar o renderer da bandeja/toast
    onToast,

    // ✅ realtime credits
    creditsBalance,
    onCreditsBalance,
  };
}