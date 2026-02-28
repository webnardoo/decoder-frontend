"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CreditsBalanceRealtimeValue = {
  creditsBalance: number | null;
};

const Ctx = createContext<CreditsBalanceRealtimeValue | null>(null);

// ====== BUS GLOBAL (singleton) ======
let lastGlobal: number | null = null;
const listeners = new Set<(v: number | null) => void>();

export function setCreditsBalanceRealtimeGlobal(next: number | null) {
  lastGlobal = typeof next === "number" && Number.isFinite(next) ? next : null;
  for (const fn of listeners) {
    try {
      fn(lastGlobal);
    } catch {}
  }
}

export function CreditsBalanceRealtimeProvider({
  value,
  children,
}: {
  value?: CreditsBalanceRealtimeValue; // compatível com seu layout atual
  children: React.ReactNode;
}) {
  const [creditsBalance, setCreditsBalance] = useState<number | null>(() => {
    if (value && typeof value.creditsBalance === "number" && Number.isFinite(value.creditsBalance)) {
      return value.creditsBalance;
    }
    return lastGlobal;
  });

  // 1) Se o layout passar `value`, continua funcionando
  useEffect(() => {
    if (!value) return;
    const v = value.creditsBalance;
    const next = typeof v === "number" && Number.isFinite(v) ? v : null;
    setCreditsBalance(next);
    setCreditsBalanceRealtimeGlobal(next);
  }, [value?.creditsBalance]);

  // 2) Qualquer lugar do app pode “empurrar” saldo no bus global
  useEffect(() => {
    const fn = (v: number | null) => setCreditsBalance(v);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const ctxValue = useMemo(() => ({ creditsBalance }), [creditsBalance]);
  return <Ctx.Provider value={ctxValue}>{children}</Ctx.Provider>;
}

export function useCreditsBalanceRealtime(): CreditsBalanceRealtimeValue {
  const ctx = useContext(Ctx);
  return ctx ?? { creditsBalance: null };
}