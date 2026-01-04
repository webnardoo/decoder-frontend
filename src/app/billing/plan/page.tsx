"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BillingCycle = "monthly" | "annual";

type PublicPlan = {
  planId: string; // Plan.id (FK)
  code: string; // standard | pro | unlimited
  name: string; // STANDART | PRO | ILIMITADO
  description?: string;
  monthlyCredits: number;
  isUnlimited: boolean;
  billingCycles: BillingCycle[];
};

export default function BillingPlanPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<PublicPlan[]>([]);

  const cycleLabel = useMemo(
    () => (cycle === "monthly" ? "Mensal" : "Anual"),
    [cycle],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoadingPlans(true);
        setErr(null);

        // ✅ SEMPRE via proxy do Next (3000), para anexar token via cookie no server
        const res = await fetch("/api/v1/billing/plans", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.message || "Falha ao carregar planos.");
        }

        const list = Array.isArray(data?.plans)
          ? (data.plans as PublicPlan[])
          : [];

        if (!cancelled) setPlans(list);
      } catch (e: any) {
        if (!cancelled) setErr(String(e?.message || "Erro ao carregar planos."));
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function onChoose(planId: string) {
    setLoading(true);
    setErr(null);

    const qs = new URLSearchParams({
      planId,
      billingCycle: cycle,
    });

    router.push(`/checkout?${qs.toString()}`);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Assinatura</h1>
        <p className="text-sm text-zinc-400">
          Escolha um plano e siga para o checkout.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        {err && <div className="text-sm text-red-400">{err}</div>}

        <div className="flex gap-2">
          <button
            className={cycle === "monthly" ? "btn btn-primary" : "btn"}
            disabled={loading || loadingPlans}
            onClick={() => setCycle("monthly")}
            type="button"
          >
            Mensal
          </button>
          <button
            className={cycle === "annual" ? "btn btn-primary" : "btn"}
            disabled={loading || loadingPlans}
            onClick={() => setCycle("annual")}
            type="button"
          >
            Anual
          </button>
        </div>

        {loadingPlans ? (
          <div className="text-sm text-zinc-400">Carregando planos…</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {plans.map((p) => (
              <div
                key={p.planId}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-zinc-500">{p.description || "—"}</div>

                <div className="text-xs text-zinc-500">
                  Modalidade:{" "}
                  <span className="text-zinc-300">{cycleLabel}</span>
                </div>

                <button
                  className="btn btn-primary w-fit"
                  disabled={loading}
                  onClick={() => onChoose(p.planId)}
                  type="button"
                >
                  {loading ? "Abrindo…" : "Escolher"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
