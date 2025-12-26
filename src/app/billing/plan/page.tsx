"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BillingCycle = "monthly" | "annual";

export default function BillingPlanPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  // ✅ ids canônicos (iguais ao BillingService e ao Plan.code esperado no checkout)
  const plans = useMemo(
    () => [
      { id: "standart", name: "Standart", desc: "Acesso padrão para começar." },
      { id: "pro", name: "PRO", desc: "Mais capacidade e prioridade." },
      { id: "ilimitado", name: "Ilimitado", desc: "Uso sem limites aparentes (fair use interno)." },
    ],
    [],
  );

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
        <p className="text-sm text-zinc-400">Escolha um plano e siga para o checkout.</p>
      </div>

      <div className="card p-5 space-y-4">
        {err && <div className="text-sm text-red-400">{err}</div>}

        <div className="flex gap-2">
          <button
            className={cycle === "monthly" ? "btn btn-primary" : "btn"}
            disabled={loading}
            onClick={() => setCycle("monthly")}
            type="button"
          >
            Mensal
          </button>
          <button
            className={cycle === "annual" ? "btn btn-primary" : "btn"}
            disabled={loading}
            onClick={() => setCycle("annual")}
            type="button"
          >
            Anual
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-zinc-500">{p.desc}</div>
              <button
                className="btn btn-primary w-fit"
                disabled={loading}
                onClick={() => onChoose(p.id)}
                type="button"
              >
                {loading ? "Abrindo…" : "Escolher"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
