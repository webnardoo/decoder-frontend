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

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

async function isAuthenticated(): Promise<boolean> {
  // ✅ check real: server-side confirma cookie httpOnly (decoder_auth)
  const res = await fetch("/api/auth/session", { cache: "no-store" });

  if (res.status === 200) return true;
  if (res.status === 401 || res.status === 403) return false;

  throw new Error("Falha ao verificar sessão. Tente novamente.");
}

export default function PublicPlansClient() {
  const router = useRouter();

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

        const res = await fetch("/api/v1/billing/plans", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = extractMessage(data) || "Falha ao carregar planos.";
          throw new Error(msg);
        }

        const list = Array.isArray(data?.plans) ? (data.plans as PublicPlan[]) : [];
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

  async function ensureAuthBeforeCheckout(planId: string) {
    setChoosingPlanId(planId);
    setErr(null);

    try {
      const qs = new URLSearchParams({ planId, billingCycle: cycle });
      const checkoutNext = `/app/checkout?${qs.toString()}`;

      // ✅ Check confiável: sessão do app
      const authed = await isAuthenticated();

      // ✅ REGRA: nunca ir direto pro checkout; sempre passar pela jornada/guard
      if (authed) {
        try {
          sessionStorage.setItem("decoder_pending_checkout_next", checkoutNext);
        } catch {}
        router.push("/app");
        return;
      }

      // Não logado -> pede email (popup)
      const email = window.prompt("Digite seu e-mail para continuar:");
      const eMail = String(email || "").trim();
      if (!eMail) return;

      // Checa se já existe conta
     const existsRes = await fetch("/api/auth/register/exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail }),
      });

      const existsData = await existsRes.json().catch(() => ({}));
      if (!existsRes.ok) {
        const msg = extractMessage(existsData) || "Falha ao validar e-mail.";
        throw new Error(msg);
      }

      const exists = Boolean(existsData?.exists === true);

      if (!exists) {
        window.alert("Para assinar um plano você primeiro deve se cadastrar");
        router.push(
          `/app/register?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(checkoutNext)}`,
        );
        return;
      }

      router.push(
        `/app/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(checkoutNext)}`,
      );
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
              <div className="text-sm font-medium text-zinc-200">Nenhum plano disponível</div>
              <div className="mt-1 text-sm text-zinc-400">Tente novamente em instantes.</div>
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
                        <div className="font-semibold text-zinc-100 truncate">{p.name}</div>
                        <div className="mt-1 text-sm text-zinc-400">{p.description || "—"}</div>
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
                      Modalidade: <span className="text-zinc-300">{cycleLabel}</span>
                      {!canUseCycle && (
                        <span className="ml-2 text-red-300">• indisponível neste ciclo</span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        className="btn btn-primary w-full sm:w-fit"
                        disabled={isBusy || !canUseCycle}
                        onClick={() => void ensureAuthBeforeCheckout(p.planId)}
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
