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

type RegisterExistsResponse = {
  exists: boolean;
  shouldStartOnboarding: boolean;
  shouldLogin: boolean;
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

const PRICE_MAP: Record<string, string> = {
  standard: "R$ 29,90",
  pro: "R$ 49,90",
  unlimited: "R$ 79,90",
};

const PLAN_UI: Record<
  string,
  {
    topPill: string;
    topPillBg: string;
    topPillBorder: string;
    title: string;
    price: string;
    midLine: string;
    bodyShort: string;
    bodyLong: string;
    cta: string;
    hint: string;
    glow: string;
    ctaBg: string;
    ctaBorder: string;
    ctaText: string;
  }
> = {
  standard: {
    topPill: "▶  Para uso pessoal e decisões pontuais",
    topPillBg: "bg-blue-500/12",
    topPillBorder: "border-blue-400/25",
    title: "STANDART",
    price: PRICE_MAP.standard,
    midLine: "Mais de 140 análises por mês",
    bodyShort: "Para conversas importantes do dia a dia",
    bodyLong:
      "Pensado para quem quer clareza nas conversas que realmente importam, sem excesso. Ideal para decisões pontuais, momentos sensíveis e respostas estratégicas.",
    cta: "Começar com clareza",
    hint: "Ideal para uso consciente",
    glow:
      "radial-gradient(closest-side, rgba(59,130,246,0.35), rgba(59,130,246,0.0))",
    ctaBg:
      "linear-gradient(180deg, rgba(37,99,235,0.85), rgba(37,99,235,0.55))",
    ctaBorder: "rgba(96,165,250,0.30)",
    ctaText: "#EAF2FF",
  },
  pro: {
    topPill: "▶  Mais vendido",
    topPillBg: "bg-violet-500/12",
    topPillBorder: "border-violet-400/25",
    title: "PRO",
    price: PRICE_MAP.pro,
    midLine: "+340 análises/mês",
    bodyShort: "Para quem analisa antes de responder",
    bodyLong:
      "Para quem conversa com frequência e não decide no escuro. Ideal para analisar múltiplas interações, revisitar diálogos e ajustar respostas com vantagem.",
    cta: "Analisar com vantagem",
    hint: "Para quem conversa com frequência",
    glow:
      "radial-gradient(closest-side, rgba(139,92,246,0.35), rgba(139,92,246,0.0))",
    ctaBg:
      "linear-gradient(180deg, rgba(124,58,237,0.85), rgba(124,58,237,0.55))",
    ctaBorder: "rgba(167,139,250,0.30)",
    ctaText: "#F3ECFF",
  },
  unlimited: {
    topPill: "•  Sem limites",
    topPillBg: "bg-amber-500/12",
    topPillBorder: "border-amber-300/25",
    title: "ILIMITADO",
    price: PRICE_MAP.unlimited,
    midLine: "Análises ilimitadas",
    bodyShort: "Para quem vive de conexões",
    bodyLong:
      "Feito para quem vive de relacionamentos e conexões. Ideal para quem gerencia muitas contas, negociações constantes e alta exposição social — sem se preocupar com limites.",
    cta: "Usar sem limites",
    hint: "Para alto volume de conexões",
    glow:
      "radial-gradient(closest-side, rgba(245,158,11,0.30), rgba(245,158,11,0.0))",
    ctaBg:
      "linear-gradient(180deg, rgba(180,83,9,0.85), rgba(180,83,9,0.55))",
    ctaBorder: "rgba(252,211,77,0.22)",
    ctaText: "#FFF2DE",
  },
};

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

function normalizeEmail(input: string): string {
  return (input || "").trim().toLowerCase();
}

function codeKey(code: string) {
  const c = (code || "").trim().toLowerCase();
  if (c === "standart") return "standard";
  if (c === "ilimitado") return "unlimited";
  return c;
}

function buildLoggedPlanNext(planId: string, cycle: BillingCycle) {
  // ✅ ROTA LOGADA REAL (base do APP): /app/app/*
  const qs = new URLSearchParams({ planId, billingCycle: cycle });
  return `/app/app/billing/plan?${qs.toString()}`;
}

export default function PublicPlansClient() {
  const router = useRouter();

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [choosingPlanId, setChoosingPlanId] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [plans, setPlans] = useState<PublicPlan[]>([]);

  const [loadingMe, setLoadingMe] = useState(true);
  const [me, setMe] = useState<BillingMeResponse | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        setLoadingPlans(true);
        setErr(null);

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

    async function loadMe() {
      try {
        setLoadingMe(true);
        const res = await fetch("/api/v1/billing/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setMe(null);
          return;
        }
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
      setErr(`Você já é assinante do plano ${planNameForMsg} selecione outro plano.`);
      return;
    }

    setChoosingPlanId(planId);
    setErr(null);

    try {
      const nextLoggedPlan = buildLoggedPlanNext(planId, cycle);

      const email = window.prompt("Digite seu e-mail para continuar:");
      const eMail = normalizeEmail(String(email || ""));
      if (!eMail) return;

      const existsRes = await fetch("/api/auth/register/exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail }),
      });

      const existsData =
        (await existsRes.json().catch(() => ({}))) as Partial<RegisterExistsResponse>;

      if (!existsRes.ok) {
        const msg = extractMessage(existsData) || "Falha ao validar e-mail.";
        throw new Error(msg);
      }

      const exists = existsData?.exists === true;
      const shouldStartOnboarding = existsData?.shouldStartOnboarding === true;
      const shouldLogin = existsData?.shouldLogin === true;

      if (!exists) {
        router.push(
          `/register-otp?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(nextLoggedPlan)}`,
        );
        return;
      }

      if (shouldStartOnboarding && !shouldLogin) {
        router.push(
          `/register-otp?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(nextLoggedPlan)}`,
        );
        return;
      }

      // ✅ login real do APP (não alias /app/login)
      router.push(
        `/app/app/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(nextLoggedPlan)}`,
      );
    } catch (e: any) {
      setErr(String(e?.message || "Falha ao iniciar assinatura."));
    } finally {
      setChoosingPlanId(null);
    }
  }

  return (
    <main className="flex-1 px-4 py-10 md:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="text-center space-y-4">
          <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-zinc-100">
            Escolha quanto controle você quer
            <br className="hidden md:block" />
            ter sobre suas conversas
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-2xl mx-auto">
            Quanto mais análises, mais clareza para decidir responder e agir no momento certo.
          </p>

          <div className="pt-2 flex items-center justify-center">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 backdrop-blur p-1 gap-2">
              <button
                className={
                  cycle === "monthly"
                    ? "px-5 py-2 rounded-full text-sm text-zinc-100 bg-white/10 border border-white/10"
                    : "px-5 py-2 rounded-full text-sm text-zinc-300 hover:text-zinc-100"
                }
                disabled={isBusy}
                onClick={() => setCycle("monthly")}
                type="button"
              >
                Mensal
              </button>
              <button
                className={
                  cycle === "annual"
                    ? "px-5 py-2 rounded-full text-sm text-zinc-100 bg-white/10 border border-white/10"
                    : "px-5 py-2 rounded-full text-sm text-zinc-300 hover:text-zinc-100"
                }
                disabled={isBusy}
                onClick={() => setCycle("annual")}
                type="button"
              >
                Anual
              </button>
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-8 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        <div className="mt-8 md:mt-10">
          {loadingPlans ? (
            <div className="text-sm text-zinc-400 text-center">Carregando planos…</div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-center">
              <div className="text-sm font-medium text-zinc-200">Nenhum plano disponível</div>
              <div className="mt-1 text-sm text-zinc-400">Tente novamente em instantes.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {plans
                .slice()
                .sort((a, b) => {
                  const oa = codeKey(a.code) === "pro" ? 2 : codeKey(a.code) === "unlimited" ? 3 : 1;
                  const ob = codeKey(b.code) === "pro" ? 2 : codeKey(b.code) === "unlimited" ? 3 : 1;
                  return oa - ob;
                })
                .map((p) => {
                  const key = codeKey(p.code);
                  const ui = PLAN_UI[key] ?? PLAN_UI.standard;
                  const canUseCycle = p.billingCycles?.includes(cycle);
                  const isChoosingThis = choosingPlanId === p.planId;

                  const isCurrentPlan =
                    !loadingMe && currentPlanKey != null && key === currentPlanKey;

                  const planDisplayName = currentPlanName || ui.title;

                  return (
                    <div
                      key={p.planId}
                      className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_14px_55px_rgba(0,0,0,0.55)] overflow-hidden"
                    >
                      <div
                        aria-hidden
                        className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[520px] h-[220px] blur-2xl opacity-90"
                        style={{ background: ui.glow }}
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 opacity-55"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))",
                        }}
                      />

                      <div className="relative p-5 md:p-6 flex flex-col min-h-[420px]">
                        <div className="mb-3">
                          <div
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] text-zinc-200 border ${ui.topPillBorder} ${ui.topPillBg}`}
                          >
                            {ui.topPill}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="text-sm font-semibold tracking-wide text-zinc-200">
                            {ui.title}
                          </div>

                          <div className="text-3xl font-semibold tracking-tight text-zinc-100">
                            {ui.price}
                          </div>

                          <div className="text-sm text-zinc-200/90">{ui.midLine}</div>

                          <div className="text-sm text-zinc-400 leading-relaxed md:hidden">
                            {ui.bodyShort}
                          </div>

                          <div className="hidden md:block text-sm text-zinc-400 leading-relaxed">
                            {ui.bodyLong}
                          </div>
                        </div>

                        <div className="mt-5">
                          <button
                            className="w-full rounded-full px-4 py-3 text-sm font-semibold transition-transform active:scale-[0.99] disabled:opacity-60"
                            disabled={isBusy || !canUseCycle || isCurrentPlan}
                            onClick={() => void onSubscribe(p.planId, p.code, planDisplayName)}
                            type="button"
                            style={{
                              background: ui.ctaBg,
                              border: `1px solid ${ui.ctaBorder}`,
                              color: ui.ctaText,
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                            }}
                          >
                            {isCurrentPlan ? "Plano atual" : isChoosingThis ? "Abrindo…" : ui.cta}
                          </button>

                          <div className="mt-2 text-xs text-zinc-400 text-center">{ui.hint}</div>

                          <div className="mt-2 text-[11px] text-zinc-500 text-center">
                            Modalidade: <span className="text-zinc-300">{cycleLabel}</span>
                            {!canUseCycle && (
                              <span className="ml-2 text-red-300">• indisponível neste ciclo</span>
                            )}
                          </div>

                          {isCurrentPlan && (
                            <div className="mt-2 text-sm text-zinc-200/80 text-center">
                              Você já é assinante do plano{" "}
                              <span className="text-zinc-100 font-semibold">{planDisplayName}</span>{" "}
                              selecione outro plano.
                            </div>
                          )}
                        </div>

                        {isChoosingThis && (
                          <div className="sr-only" aria-live="polite">
                            Abrindo…
                          </div>
                        )}
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
