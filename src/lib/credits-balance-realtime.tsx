/* src/lib/credits-balance-realtime.tsx */
"use client";

import React, { createContext, useContext } from "react";

type CreditsBalanceRealtimeValue = {
  creditsBalance: number | null;
};

const CreditsBalanceRealtimeContext = createContext<CreditsBalanceRealtimeValue | null>(null);

export function CreditsBalanceRealtimeProvider({
  value,
  children,
}: {
  value: CreditsBalanceRealtimeValue;
  children: React.ReactNode;
}) {
  return (
    <CreditsBalanceRealtimeContext.Provider value={value}>
      {children}
    </CreditsBalanceRealtimeContext.Provider>
  );
}

export function useCreditsBalanceRealtime(): CreditsBalanceRealtimeValue {
  const ctx = useContext(CreditsBalanceRealtimeContext);
  return ctx ?? { creditsBalance: null };
}