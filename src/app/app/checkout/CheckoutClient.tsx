"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type BillingCycle = "monthly" | "annual";

export default function CheckoutClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const planId = String(sp?.get("planId") || "").trim();
  const billingCycle = String(sp?.get("billingCycle") || "").trim() as BillingCycle;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Checkout</h1>
        <p className="text-sm text-zinc-400">
          Esta rota deve redirecionar via Server Component (page.tsx). Se você está vendo esta tela,
          algum import/uso do CheckoutClient ainda está ativo.
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <div className="text-sm">
          <div className="text-zinc-400">Plano</div>
          <div className="text-zinc-100 font-medium">{planLabel}</div>
          <div className="text-zinc-500 text-xs">Ciclo: {cycleLabel}</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-2">
          <div className="text-sm font-medium">Ação necessária</div>
          <div className="text-sm text-zinc-400">
            Remover o uso deste componente e manter apenas o redirect do arquivo:
            <span className="text-zinc-200"> src/app/app/checkout/page.tsx</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn w-fit" onClick={() => router.push("/app/billing/plan")} type="button">
              Voltar para planos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
