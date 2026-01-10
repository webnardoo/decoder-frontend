"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type OnboardingStatus = {
  onboardingStage: string;
  tutorialPopupsPending?: boolean;
};

function routeFromStage(stage: string) {
  const s = String(stage || "").toUpperCase().trim();
  if (s === "PAYMENT_PENDING") return "/billing/pending";
  if (s === "PAYMENT_FAILED") return "/billing/failed";
  if (s === "PAYMENT_REQUIRED") return "/billing/plan";
  if (s === "IDENTITY_REQUIRED") return "/onboarding/identity";
  if (s === "TUTORIAL_REQUIRED") return "/tutorial";
  if (s === "READY") return "/";
  return "/start";
}

async function fetchStatusOnce(): Promise<OnboardingStatus> {
  const res = await fetch("/api/onboarding/status", {
    method: "GET",
    // ✅ cookie httpOnly (decoder_auth) é enviado automaticamente
    credentials: "include",
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");

  if (res.status === 401) {
    // não logado / cookie expirou
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) throw new Error(text || `STATUS_FAILED_${res.status}`);

  return JSON.parse(text) as OnboardingStatus;
}

export default function BillingPendingPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("PAYMENT_PENDING");

  const intervalRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  async function tick() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const s = await fetchStatusOnce();
      const next = routeFromStage(s.onboardingStage);

      setStage(String(s.onboardingStage || ""));
      setError(null);
      setLoading(false);

      if (next !== "/billing/pending") {
        stopPolling();
        router.replace(next);
        return;
      }
    } catch (e: any) {
      setLoading(false);

      if (String(e?.message || "") === "UNAUTHORIZED") {
        stopPolling();
        router.replace("/login");
        return;
      }

      setError("Falha ao verificar pagamento.");
    } finally {
      inFlightRef.current = false;
    }
  }

  function startPolling() {
    if (intervalRef.current != null) return;
    void tick();
    intervalRef.current = window.setInterval(() => void tick(), 3000);
  }

  function stopPolling() {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  useEffect(() => {
    startPolling();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="font-medium">Aguardando confirmação do pagamento…</div>
        <div className="text-sm text-zinc-400">Vamos checar automaticamente e avançar assim que confirmar.</div>
      </div>

      {loading && <div className="text-sm text-zinc-400">Configurando sua conta…</div>}

      {!loading && (
        <div className="card p-5 text-sm text-zinc-400">
          Status atual: <span className="text-zinc-200">{stage || "—"}</span>
        </div>
      )}

      {error && (
        <div className="card p-5 space-y-3">
          <div className="text-sm font-medium">{error}</div>
          <button
            className="btn btn-primary w-fit"
            onClick={() => {
              setError(null);
              setLoading(true);
              void tick();
            }}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
