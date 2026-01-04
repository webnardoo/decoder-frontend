"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CheckoutSessionResponse =
  | { url: string }
  | { message?: string };

type BillingCycle = "monthly" | "annual";

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

type OnboardingStatus = { onboardingStage: string };

export default function CheckoutClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const planId = String(sp.get("planId") || "").trim(); // Plan.id (FK)
  const billingCycle = String(sp.get("billingCycle") || "").trim() as BillingCycle; // monthly|annual

  const planLabel = useMemo(() => {
    const p = planId.toLowerCase();
    if (p === "standart" || p === "standard") return "STANDART";
    if (p === "pro") return "PRO";
    if (p === "unlimited" || p === "ilimitado") return "ILIMITADO";
    return planId ? planId.toUpperCase() : "—";
  }, [planId]);

  const cycleLabel = useMemo(() => {
    const c = (billingCycle || "").toLowerCase();
    if (c === "annual" || c === "yearly") return "anual";
    return "mensal";
  }, [billingCycle]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("starting");
  const [error, setError] = useState<string>("");

  // evita double-call no Strict Mode
  const startedRef = useRef(false);

  async function fetchOnboardingAndRedirect() {
    const res = await fetch("/api/onboarding/status", { method: "GET" });
    const data = (await res.json().catch(() => null)) as OnboardingStatus | null;

    const stage = data?.onboardingStage || "START";
    router.push(routeFromStage(stage));
  }

  async function startStripeCheckout() {
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

      // ✅ Mantém compatibilidade com o fluxo atual: usamos o proxy existente
      // e só trocamos o backend target nele.
      const res = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as CheckoutSessionResponse | null;

      if (!res.ok) {
        setStatus("start_failed");
        setError((data as any)?.message || `Request failed (${res.status})`);
        setLoading(false);
        return;
      }

      const url = (data as any)?.url;
      if (!url || typeof url !== "string") {
        setStatus("start_failed");
        setError("Backend não retornou a URL do checkout.");
        setLoading(false);
        return;
      }

      setStatus("redirecting");
      setLoading(false);

      // ✅ Redireciona para o Stripe Checkout
      window.location.href = url;
    } catch (e: any) {
      setStatus("start_failed");
      setError(e?.message || "Erro ao iniciar checkout.");
      setLoading(false);
    }
  }

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // Se o usuário já voltou do Stripe para /checkout por algum motivo,
    // tentamos apenas obedecer onboarding (read-only) e sair da tela.
    const returned = sp.get("returned");
    if (returned) {
      void fetchOnboardingAndRedirect();
      return;
    }

    void startStripeCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Checkout</h1>
        <p className="text-sm text-zinc-400">
          Você será redirecionado para o checkout seguro do Stripe.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="text-sm">
          <div className="text-zinc-400">Plano selecionado</div>
          <div className="text-zinc-100 font-medium">{planLabel}</div>
          <div className="text-zinc-500 text-xs">Ciclo: {cycleLabel}</div>
        </div>

        {loading && <div className="text-sm text-zinc-400">Preparando checkout…</div>}

        {!loading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
            <div className="text-sm font-medium">Pagamento (Stripe)</div>

            <div className="text-xs text-zinc-500">
              Status: <span className="text-zinc-200">{status}</span>
            </div>

            {!!error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button
                className="btn btn-primary w-fit"
                disabled={status === "redirecting"}
                onClick={() => void startStripeCheckout()}
                type="button"
              >
                {status === "redirecting" ? "Redirecionando…" : "Tentar novamente"}
              </button>

              <button
                className="btn w-fit"
                onClick={() => router.push("/billing/plan")}
                type="button"
              >
                Voltar para planos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
