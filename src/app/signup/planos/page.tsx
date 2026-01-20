"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

function sanitizeNext(nextParam: string | null): string {
  const raw = typeof nextParam === "string" ? nextParam.trim() : "";
  if (!raw) return "/app/checkout";
  if (raw === "/") return "/app/checkout";

  // allowlist: mantém dentro do funil signup OU checkout do app
  if (raw.startsWith("/signup")) return raw;
  if (raw.startsWith("/app/checkout")) return raw;

  return "/app/checkout";
}

export default function SignupPlansPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 px-4 py-10">
          <div className="mx-auto w-full max-w-6xl">
            <div className="card p-5 text-sm text-zinc-400">Carregando…</div>
          </div>
        </main>
      }
    >
      <SignupPlansInner />
    </Suspense>
  );
}

function SignupPlansInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextParam = sp?.get("next") ?? null;
  const redirectNext = useMemo(() => sanitizeNext(nextParam), [nextParam]);

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [choosingPlanId, setChoosingPlanId] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<PublicPlan[]>([]);

  const cycleLabel = useMemo(
    () => (cycle === "monthly" ? "Mensal" : "Anual"),
    [cycle],
  );

  const isBusy = loadingPlans || choosingPlanId != null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoadingPlans(true);
        setErr(null);

        // ✅ Reaproveita o proxy público já existente
        const res = await fetch("/api/v1/billing/plans", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = extractMessage(data) || "Falha ao carregar planos.";
          throw new Error(msg);
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

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubscribe(planId: string) {
    setChoosingPlanId(planId);
    setErr(null);

    try {
      // next CANÔNICO para checkout (app)
      const qs = new URLSearchParams({ planId, billingCycle: cycle });
      const checkoutNext = `/app/checkout?${qs.toString()}`;

      // Se já vier um next válido (ex.: /app/checkout...) respeita
      const target = redirectNext.startsWith("/app/checkout")
        ? redirectNext
        : checkoutNext;

      router.push(target);
    } catch (e: any) {
      setErr(String(e?.message || "Falha ao iniciar assinatura."));
    } finally {
      setChoosingPlanId(null);
    }
  }

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold">Planos</h1>
          <p className="text-sm text-zinc-400">Escolha um plano para assinar.</p>
        </div>

        <div className="card p-5 space-y-4">
          {err && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {err}
            </div>
          )}

          <div className="flex gap-2">
            <button
              className={cycle === "monthly" ? "btn btn-primary" : "btn"}
              disabled={isBusy}
              onClick={() => setCycle("monthly")}
              type="button"
            >
              Mensal
            </button>
            <button
              className={cycle === "annual" ? "btn btn-primary" : "btn"}
              disabled={isBusy}
              onClick={() => setCycle("annual")}
              type="button"
            >
              Anual
            </button>
          </div>

          {loadingPlans ? (
            <div className="text-sm text-zinc-400">Carregando planos…</div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-sm font-medium text-zinc-200">
                Nenhum plano disponível
              </div>
              <div className="mt-1 text-sm text-zinc-400">
                Tente novamente em instantes.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {plans.map((p) => {
                const canUseCycle = p.billingCycles?.includes(cycle);
                const isChoosingThis = choosingPlanId === p.planId;

                return (
                  <div key={p.planId} className="card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-100 truncate">
                          {p.name}
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">
                          {p.description || "—"}
                        </div>
                      </div>

                      {p.isUnlimited ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-1 text-xs text-zinc-300">
                          Ilimitado
                        </div>
                      ) : (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-1 text-xs text-zinc-300">
                          {p.monthlyCredits} créditos/mês
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-zinc-500">
                      Modalidade:{" "}
                      <span className="text-zinc-300">{cycleLabel}</span>
                      {!canUseCycle && (
                        <span className="ml-2 text-red-300">
                          • indisponível neste ciclo
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        className="btn btn-primary w-full sm:w-fit"
                        disabled={isBusy || !canUseCycle}
                        onClick={() => void onSubscribe(p.planId)}
                        type="button"
                      >
                        {isChoosingThis ? "Abrindo…" : "Assinar"}
                      </button>

                      <button
                        className="btn w-full sm:w-fit"
                        disabled={isBusy}
                        type="button"
                        onClick={() => void window.location.reload()}
                      >
                        Recarregar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
