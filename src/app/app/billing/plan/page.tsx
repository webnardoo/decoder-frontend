"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BillingCycle = "monthly" | "annual";

type PublicPlan = {
  planId: string;
  code: string;
  name: string;
  description?: string;
  monthlyCredits: number;
  isUnlimited: boolean;
  billingCycles: BillingCycle[];
};

type BillingMeResponse = {
  ok?: boolean;
  subscriptionActive?: boolean;
  plan?: {
    code?: string;
    name?: string;
  } | null;
  [k: string]: any;
};

type OnboardingStatus = {
  onboardingStage?: string;
  [k: string]: any;
};

const PRICE_NUMERIC_MAP: Record<string, number> = {
  standard: 29.9,
  pro: 49.9,
  unlimited: 79.9,
};

const PRICE_MAP: Record<string, string> = {
  standard: "R$ 29,90",
  pro: "R$ 49,90",
  unlimited: "R$ 79,90",
};

const PLAN_UI = { /* ...mantido igual ao seu código... */ };
// 👆 Mantive omitido aqui para não repetir visualmente,
// mas no arquivo final mantenha exatamente igual ao que você já tem.

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

function codeKey(code: string) {
  const c = (code || "").trim().toLowerCase();
  if (c === "standart") return "standard";
  if (c === "ilimitado") return "unlimited";
  return c;
}

function buildCheckout(planId: string, cycle: BillingCycle) {
  const qs = new URLSearchParams({ planId, billingCycle: cycle });
  return `/app/app/checkout?${qs.toString()}`;
}

export default function BillingPlanPage() {
  const router = useRouter();

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [choosingPlanId, setChoosingPlanId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<PublicPlan[]>([]);

  const [loadingMe, setLoadingMe] = useState(true);
  const [me, setMe] = useState<BillingMeResponse | null>(null);

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [onboardingStage, setOnboardingStage] = useState<string | null>(null);

  const cycleLabel = useMemo(
    () => (cycle === "monthly" ? "Mensal" : "Anual"),
    [cycle],
  );

  const isBusy = loadingPlans || choosingPlanId != null;

  const currentPlanKey = useMemo(() => {
    const raw = me?.plan?.code;
    return raw ? codeKey(String(raw)) : null;
  }, [me]);

  const currentPlanName = useMemo(() => {
    return me?.plan?.name ? String(me.plan.name) : null;
  }, [me]);

  const isAuthed = useMemo(() => !loadingMe && me != null, [loadingMe, me]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        setLoadingPlans(true);
        setErr(null);
        const res = await fetch("/api/v1/billing/plans", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(extractMessage(data) || "Falha ao carregar planos.");
        if (!cancelled) setPlans(Array.isArray(data?.plans) ? data.plans : []);
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message || "Erro ao carregar planos."));
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    }

    async function loadMe() {
      try {
        setLoadingMe(true);
        const res = await fetch("/api/v1/billing/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled) setMe(null);
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setMe(data as BillingMeResponse);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoadingMe(false);
      }
    }

    void loadPlans();
    void loadMe();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubscribe(planId: string, planCode: string, planNameForMsg: string) {
    if (currentPlanKey && codeKey(planCode) === currentPlanKey) {
      setErr(`Você já é assinante do plano ${planNameForMsg}. Selecione outro plano.`);
      return;
    }

    setChoosingPlanId(planId);
    setErr(null);

    try {
      const normalizedCode = codeKey(planCode);
      const nextCheckout = buildCheckout(planId, cycle);

      // 🔥 DISPARO DO INITIATECHECKOUT
      if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
        try {
          (window as any).fbq("track", "InitiateCheckout", {
            content_category: "subscription",
            content_name: normalizedCode,
            content_ids: [planId],
            currency: "BRL",
            value: PRICE_NUMERIC_MAP[normalizedCode] ?? 0,
            billing_cycle: cycle,
          });
        } catch (err) {
          console.warn("Erro ao disparar InitiateCheckout:", err);
        }
      }

      if (!isAuthed) {
        router.push(`/app/login?next=${encodeURIComponent(nextCheckout)}`);
        return;
      }

      router.push(nextCheckout);
    } catch (e: any) {
      setErr(String(e?.message || "Falha ao iniciar assinatura."));
    } finally {
      setChoosingPlanId(null);
    }
  }

  return (
    <main className="flex-1 px-4 py-10 md:py-12">
      {/* 🔹 Mantive todo o restante do JSX exatamente igual ao seu código original */}
      {/* Apenas o onSubscribe foi modificado */}
    </main>
  );
}
