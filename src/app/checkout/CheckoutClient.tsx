"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type StartResponse = {
  checkoutId: string;
  status: string;
  plan?: { planId: string; name: string };
  billingCycle?: string;
  notice?: string;
  payment?: {
    mode: string;
    provider: string;
    providerSessionId: string;
    returnUrls?: { success: string; failure: string; cancel: string };
  };
};

type ConfirmResponse =
  | {
      checkoutId: string;
      status: "payment_confirmed" | "subscription_activated" | string;
      subscriptionActivated?: boolean;
      creditsBalance?: number;
      onboardingStage?: string;
    }
  | {
      checkoutId: string;
      status: "payment_failed" | string;
      subscriptionActivated?: boolean;
      error?: { code: string; message: string };
    };

type OnboardingStatus = { onboardingStage: string };

function routeFromStage(stage: string) {
  const s = String(stage || "").toUpperCase().trim();
  if (s === "NICKNAME_REQUIRED") return "/onboarding/identity";
  if (s === "IDENTITY_REQUIRED") return "/onboarding/identity";
  if (s === "TUTORIAL_REQUIRED") return "/tutorial";
  if (s === "READY") return "/conversas";
  if (s === "PAYMENT_FAILED") return "/billing/failed";
  if (s === "PAYMENT_PENDING") return "/billing/pending";
  if (s === "PLAN_SELECTION_REQUIRED") return "/billing/plan";
  return "/start";
}

export default function CheckoutClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const planId = String(sp.get("planId") || "").trim();
  const billingCycle = String(sp.get("billingCycle") || "").trim(); // "monthly" | "annual"

  const planLabel = useMemo(() => {
    const p = planId.toLowerCase();
    if (p === "standart" || p === "standard") return "STANDART";
    if (p === "pro") return "PRO";
    if (p === "unlimited" || p === "ilimitado") return "ILIMITADO";
    return planId ? planId.toUpperCase() : "—";
  }, [planId]);

  const cycleLabel = useMemo(() => {
    const c = billingCycle.toLowerCase();
    if (c === "annual" || c === "yearly") return "anual";
    return "mensal";
  }, [billingCycle]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("starting");
  const [checkoutId, setCheckoutId] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [confirming, setConfirming] = useState(false);

  // ✅ evita double-call do useEffect no Next/React dev (Strict Mode)
  const startedRef = useRef(false);

  async function startCheckout() {
    setLoading(true);
    setError("");
    setStatus("starting");

    try {
      if (!planId || !billingCycle) {
        setStatus("start_failed");
        setError("Plano ou ciclo inválido.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
      });

      const data = (await res.json().catch(() => null)) as StartResponse | null;

      if (!res.ok || !data?.checkoutId) {
        setStatus("start_failed");
        setError(`Request failed (${res.status})`);
        setLoading(false);
        return;
      }

      setCheckoutId(data.checkoutId);
      setStatus(data.status || "checkout_started");
      setLoading(false);
    } catch (e: any) {
      setStatus("start_failed");
      setError(e?.message || "Erro ao iniciar checkout.");
      setLoading(false);
    }
  }

  async function fetchOnboardingAndRedirect() {
    const res = await fetch("/api/onboarding/status", { method: "GET" });
    const data = (await res.json().catch(() => null)) as OnboardingStatus | null;

    const stage = data?.onboardingStage || "START";
    router.push(routeFromStage(stage));
  }

  async function confirmPayment() {
    if (!checkoutId) return;

    setConfirming(true);
    setError("");

    try {
      const res = await fetch(`/api/checkout/${checkoutId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerResultRef: "any" }),
      });

      const data = (await res.json().catch(() => null)) as ConfirmResponse | null;

      if (!res.ok) {
        setError(
          data && "error" in data && data.error?.message
            ? data.error.message
            : `Request failed (${res.status})`,
        );
        setStatus("payment_failed");
        setConfirming(false);
        return;
      }

      if (data && "status" in data) setStatus(String(data.status));

      // confirmado → obedece onboardingStage do backend via /onboarding/status
      if ((data as any)?.subscriptionActivated || String((data as any)?.status).includes("confirm")) {
        await fetchOnboardingAndRedirect();
        return;
      }

      // pending/falha
      if ((data as any)?.error?.message) setError((data as any).error.message);
      setConfirming(false);
    } catch (e: any) {
      setError(e?.message || "Erro ao confirmar pagamento.");
      setStatus("payment_failed");
      setConfirming(false);
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void startCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Checkout</h1>
        <p className="text-sm text-zinc-400">Seu acesso será ativado após a confirmação do pagamento.</p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="text-sm">
          <div className="text-zinc-400">Plano selecionado</div>
          <div className="text-zinc-100 font-medium">{planLabel}</div>
          <div className="text-zinc-500 text-xs">Ciclo: {cycleLabel}</div>
        </div>

        {loading && <div className="text-sm text-zinc-400">Preparando checkout...</div>}

        {!loading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
            <div className="text-sm font-medium">Pagamento (simulado)</div>

            <div className="text-xs text-zinc-500">
              Status: <span className="text-zinc-200">{status}</span>
            </div>

            {!!checkoutId && (
              <div className="text-xs text-zinc-500">
                CheckoutId: <span className="text-zinc-200">{checkoutId}</span>
              </div>
            )}

            {!!error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button
                className="btn btn-primary w-fit"
                disabled={confirming || !checkoutId}
                onClick={() => void confirmPayment()}
                type="button"
              >
                {confirming ? "Confirmando..." : "Confirmar pagamento"}
              </button>

              {!!error && (
                <button className="btn w-fit" disabled={confirming} onClick={() => void startCheckout()} type="button">
                  Reiniciar checkout
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
