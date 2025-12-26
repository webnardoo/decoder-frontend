"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { OnboardingStatus } from "./onboarding.types";
import { getOnboardingStatus } from "./onboarding.api";

export function useOnboardingStatus() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);

  const refreshStatus = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  return useMemo(
    () => ({ status, loading, error, refreshStatus }),
    [status, loading, error, refreshStatus],
  );
}
