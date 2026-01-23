"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { OnboardingStatus } from "./onboarding.types";
import { getOnboardingStatus } from "./onboarding.api";

/**
 * ✅ Rotas públicas: NUNCA devem disparar /api/onboarding/status
 * Motivo: não existe sessão → 401 é esperado e não pode “quebrar” a UI pública.
 */
function isPublicRoute(path: string): boolean {
  const p = String(path || "").toLowerCase();

  // Auth pública
  if (p === "/app/login") return true;
  if (p === "/app/register") return true;
  if (p.startsWith("/app/register/")) return true; // verify/otp/etc

  // Checkout / Billing públicos
  if (p.startsWith("/app/checkout")) return true;
  if (p.startsWith("/app/billing")) return true;

  return false;
}

export function useOnboardingStatus() {
  const pathname = usePathname() ?? "";
  const publicRoute = isPublicRoute(pathname);

  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  // ✅ em rota pública, não pode ficar "loading true" por causa de status
  const [loading, setLoading] = useState<boolean>(publicRoute ? false : true);

  const [error, setError] = useState<any>(null);

  const refreshStatus = useCallback(async () => {
    // ✅ rota pública: não faz request, não seta erro, não trava UI
    if (publicRoute) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const s = await getOnboardingStatus();
      setStatus(s);
    } catch (e) {
      setError(e);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [publicRoute]);

  useEffect(() => {
    // ✅ não buscar status em rotas públicas
    if (publicRoute) return;
    void refreshStatus();
  }, [publicRoute, refreshStatus]);

  return useMemo(
    () => ({ status, loading, error, refreshStatus }),
    [status, loading, error, refreshStatus],
  );
}
