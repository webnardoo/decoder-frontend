/* serc/app/(marketing)/planos/PublicPlansClient.tsx*/
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

type PixCheckoutResponse =
  | {
      ok: true;
      provider: "ASAAS";
      addOn: {
        id: string;
        code: string;
        name: string;
        credits: number;
        priceCents: number;
        currency: string;
      };
      payment: {
        id: string;
        status?: string | null;
        invoiceUrl?: string | null;
        externalReference: string;
        value: number;
        dueDate: string;
      };
      pixQrCode: {
        encodedImage?: string | null;
        payload?: string | null;
        expirationDate?: string | null;
      };
    }
  | {
      ok?: false;
      message?: string;
      error?: any;
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
  const qs = new URLSearchParams({ planId, billingCycle: cycle });
  return `/app/app/billing/plan?${qs.toString()}`;
}

// ✅ redireciona para página LOGADA já no modo "Comprar Créditos" + addon selecionado
function buildLoggedCreditsNext(addOnCode: string) {
  const qs = new URLSearchParams({
    tab: "credits",
    pix: "1",
    addon: addOnCode,
  });
  return `/app/app/billing/plan?${qs.toString()}`;
}

function fireInitiateCheckout(params: {
  planId: string;
  planCode: string;
  cycle: BillingCycle;
}) {
  try {
    if (typeof window === "undefined") return;
    const fbqFn = (window as any)?.fbq;
    if (typeof fbqFn !== "function") return;

    fbqFn("track", "InitiateCheckout", {
      content_category: "subscription",
      content_name: params.planCode,
      content_ids: [params.planId],
      currency: "BRL",
      value: PRICE_NUMERIC_MAP[params.planCode] ?? 0,
      billing_cycle: params.cycle,
    });
  } catch {}
}

type AddOnUi = {
  code: "addon_starter" | "addon_essential" | "addon_medium";
  label: string;
  credits: number;
  price: string;
  priceValue: number;
  perCredit: string;
  tagline: string;
  badges?: string[];
  accent: {
    border: string;
    glow: string;
    bg: string;

    badgeBg: string;
    badgeBorder: string;
    badgeText: string;

    badgeBgSelected: string;
    badgeBorderSelected: string;
    badgeTextSelected: string;

    check: string;
  };
};

const ADDONS: AddOnUi[] = [
  {
    code: "addon_starter",
    label: "Starter",
    credits: 30,
    price: "R$ 14,90",
    priceValue: 14.9,
    perCredit: "R$ 0,49 por crédito",
    tagline: "Entrada prática.",
    badges: ["Compra única", "Créditos permanentes"],
    accent: {
      border: "rgba(96,165,250,0.30)",
      glow:
        "radial-gradient(closest-side, rgba(59,130,246,0.28), rgba(59,130,246,0.0))",
      bg:
        "linear-gradient(180deg, rgba(59,130,246,0.10), rgba(255,255,255,0.035))",
      badgeBg: "bg-blue-500/12",
      badgeBorder: "border-blue-400/25",
      badgeText: "text-blue-500",
      badgeBgSelected: "bg-blue-500/18",
      badgeBorderSelected: "border-blue-300/40",
      badgeTextSelected: "text-blue-50",
      check: "text-blue-200",
    },
  },
  {
    code: "addon_essential",
    label: "Essential",
    credits: 75,
    price: "R$ 29,90",
    priceValue: 29.9,
    perCredit: "R$ 0,39 por crédito",
    tagline: "Melhor custo por crédito.",
    badges: ["🔥 Destaque", "Melhor custo"],
    accent: {
      border: "rgba(252,211,77,0.26)",
      glow:
        "radial-gradient(closest-side, rgba(245,158,11,0.28), rgba(245,158,11,0.0))",
      bg:
        "linear-gradient(180deg, rgba(245,158,11,0.10), rgba(255,255,255,0.035))",
      badgeBg: "bg-amber-300/40",
      badgeBorder: "border-amber-300/65",
      badgeText: "text-amber-950",
      badgeBgSelected: "bg-amber-300/60",
      badgeBorderSelected: "border-amber-200/80",
      badgeTextSelected: "text-amber-950",
      check: "text-amber-200",
    },
  },
  {
    code: "addon_medium",
    label: "Medium",
    credits: 50,
    price: "R$ 22,90",
    priceValue: 22.9,
    perCredit: "R$ 0,46 por crédito",
    tagline: "Melhor equilíbrio entre valor e volume.",
    badges: ["Mais crédito", "Sem renovação"],
    accent: {
      border: "rgba(167,139,250,0.30)",
      glow:
        "radial-gradient(closest-side, rgba(139,92,246,0.28), rgba(139,92,246,0.0))",
      bg:
        "linear-gradient(180deg, rgba(139,92,246,0.10), rgba(255,255,255,0.035))",
      badgeBg: "bg-violet-500/14",
      badgeBorder: "border-violet-400/25",
      badgeText: "text-violet-500",
      badgeBgSelected: "bg-violet-500/20",
      badgeBorderSelected: "border-violet-300/40",
      badgeTextSelected: "text-violet-50",
      check: "text-violet-200",
    },
  },
];

function onlyDigits(s: string) {
  return (s || "").replace(/\D+/g, "");
}

export default function PublicPlansClient() {
  const router = useRouter();

  const [tab, setTab] = useState<"credits" | "plans">("credits");

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [choosingPlanId, setChoosingPlanId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const [loadingMe, setLoadingMe] = useState(true);
  const [me, setMe] = useState<BillingMeResponse | null>(null);

  const cycleLabel = useMemo(
    () => (cycle === "monthly" ? "Mensal" : "Anual"),
    [cycle],
  );

  const isBusyPlans = loadingPlans || choosingPlanId != null;

  const currentPlanKey = useMemo(() => {
    const raw = me?.plan?.code;
    return raw ? codeKey(String(raw)) : null;
  }, [me]);

  const currentPlanName = useMemo(() => {
    return me?.plan?.name ? String(me.plan.name) : null;
  }, [me]);

  // ✅ usado só para decidir se precisa disparar fluxo público (email/OTP/login)
  const isAuthed = useMemo(() => !loadingMe && me != null, [loadingMe, me]);

  const [selectedAddOn, setSelectedAddOn] = useState<AddOnUi["code"]>(
    "addon_essential",
  );
  const [pixStep, setPixStep] = useState<"idle" | "cpf" | "loading" | "ready">(
    "idle",
  );
  const [cpfCnpj, setCpfCnpj] = useState<string>("");
  const [pixErr, setPixErr] = useState<string | null>(null);
  const [pixRes, setPixRes] = useState<PixCheckoutResponse | null>(null);

  const creditsIsSelected = tab === "credits";
  const plansIsSelected = tab === "plans";

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

        const list = Array.isArray(data?.plans) ? (data.plans as PublicPlan[]) : [];
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
        const res = await fetch("/api/v1/billing/me", {
          cache: "no-store",
          credentials: "include",
        });
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

  const selected = useMemo(
    () => ADDONS.find((a) => a.code === selectedAddOn) ?? ADDONS[1],
    [selectedAddOn],
  );

  function resetPixUi() {
    setPixErr(null);
    setPixRes(null);
    setPixStep("idle");
    setCpfCnpj("");
  }

  async function ensureUserThenGo(nextUrl: string) {
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

    // Não existe usuário -> OTP cria + loga -> next
    if (!exists) {
      router.push(
        `/register-otp?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(nextUrl)}`,
      );
      return;
    }

    // Existe e ainda precisa onboarding -> OTP -> next
    if (shouldStartOnboarding && !shouldLogin) {
      router.push(
        `/register-otp?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(nextUrl)}`,
      );
      return;
    }

    // Existe -> login -> next
    router.push(
      `/app/app/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(nextUrl)}`,
    );
  }

  async function onPixPrimaryClick() {
    setPixErr(null);
    setPixRes(null);

    // ✅ PASSO 1 (público): garantir identidade antes de qualquer PIX
    if (pixStep === "idle") {
      // se não está logado, dispara o mesmo fluxo público (email → exists → OTP/login)
      if (!isAuthed) {
        try {
          const nextLoggedCredits = buildLoggedCreditsNext(selected.code);
          await ensureUserThenGo(nextLoggedCredits);
        } catch (e: any) {
          setPixErr(String(e?.message || "Falha ao iniciar pagamento."));
        }
        return;
      }

      // logado: pode seguir com CPF
      setPixStep("cpf");
      return;
    }

    // ✅ PASSO 2: CPF
    if (pixStep === "cpf") {
      const digits = onlyDigits(cpfCnpj);
      if (digits.length < 11) {
        setPixErr("Informe seu CPF/CNPJ para emissão do pagamento.");
        return;
      }

      setPixStep("loading");
      try {
        const res = await fetch("/api/v1/billing/addons/asaas/pix-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          credentials: "include",
          body: JSON.stringify({
            addOnCode: selected.code,
            cpfCnpj: digits,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as PixCheckoutResponse;

        if (!res.ok || (data as any)?.ok !== true) {
          const msg = extractMessage(data) || "Falha ao gerar PIX.";
          throw new Error(msg);
        }

        setPixRes(data);
        setPixStep("ready");
      } catch (e: any) {
        setPixErr(String(e?.message || "Falha ao gerar PIX."));
        setPixStep("cpf");
      }
    }
  }

  async function onSubscribe(planId: string, planCode: string, planNameForMsg: string) {
    if (currentPlanKey && codeKey(planCode) === currentPlanKey) {
      setErr(`Você já é assinante do plano ${planNameForMsg} selecione outro plano.`);
      return;
    }

    setChoosingPlanId(planId);
    setErr(null);

    try {
      const normalizedCode = codeKey(planCode);
      const nextLoggedPlan = buildLoggedPlanNext(planId, cycle);

      fireInitiateCheckout({ planId, planCode: normalizedCode, cycle });

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
    <main className="flex-1 px-4 py-6 md:py-8">
      <div className="mx-auto w-full max-w-6xl">
  {/* HEADER TOPO (mais alto) */}
  <div className="text-center">
    <h1 className="text-2xl md:text-4xl font-semibold tracking-tight text-zinc-100">
      Escolha como deseja utilizar seus créditos
    </h1>

    <p className="mt-2 text-sm md:text-base text-zinc-400 max-w-3xl mx-auto">
      Adquira <span className="text-zinc-200">Pacotes de Créditos</span> sob demanda ou opte por um{" "}
      <span className="text-zinc-200">Plano Mensal</span> recorrente. Ambas as opções funcionam juntas e oferecem total flexibilidade.
    </p>
  </div>

  {/* TABS (centralizado abaixo do header) */}
  <div className="mt-4 flex items-center justify-center">
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 backdrop-blur p-1 gap-2">
      <button
  className={
    creditsIsSelected
      ? "px-5 py-2 rounded-full text-sm text-zinc-100 bg-white/10 border border-white/10"
      : "px-5 py-2 rounded-full text-sm text-zinc-300 hover:text-zinc-100"
  }
  onClick={() => {
    setTab("credits");
    setErr(null);
  }}
  type="button"
>
  <span className="flex flex-col leading-tight">
    <span>Comprar Créditos</span>
    <span>Pix</span>
  </span>
</button>

      <button
        className={
          plansIsSelected
            ? "px-5 py-2 rounded-full text-sm text-zinc-100 bg-white/10 border border-white/10"
            : "px-5 py-2 rounded-full text-sm text-zinc-300 hover:text-zinc-100"
        }
        onClick={() => {
          setTab("plans");
          resetPixUi();
        }}
        type="button"
      >
        Planos Mensais
      </button>
    </div>
 
        </div>

        {err && plansIsSelected && (
          <div className="mt-8 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        )}

        {pixErr && creditsIsSelected && (
          <div className="mt-8 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm text-zinc-200">
            {pixErr}
          </div>
        )}

        {creditsIsSelected && (
          <section className="mt-10">
            <div className="mx-auto max-w-4xl text-center">
              <div className="text-sm font-semibold text-zinc-200">
                Expanda sua capacidade no seu ritmo
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Sem assinatura. Sem renovação automática. Sem prazo para utilizar.
              </div>
              <div className="mt-4 text-sm text-zinc-400 leading-relaxed">
                Os Pacotes de Créditos oferecem flexibilidade para ampliar seu uso sempre que desejar — seja para intensificar análises em um período específico ou reforçar seu saldo a qualquer momento.
                Podem ser adquiridos de forma independente ou como complemento ao seu plano mensal.
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {ADDONS.map((a) => {
                const isSelected = a.code === selectedAddOn;

                const flatShadow = "shadow-[0_10px_26px_rgba(0,0,0,0.18)]";
                const selectedShadow = "shadow-[0_22px_72px_rgba(0,0,0,0.58)]";

                const scaleClass = isSelected ? "scale-[1.04]" : "scale-100";
                const z = isSelected ? "z-10" : "z-0";

                const border = isSelected
                  ? `2px solid ${a.accent.border}`
                  : "1px solid rgba(255,255,255,0.10)";

                return (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => {
                      setSelectedAddOn(a.code);
                      resetPixUi();
                    }}
                    className={[
                      "relative text-left rounded-2xl overflow-hidden",
                      "bg-white/5 backdrop-blur-xl",
                      "transition-all duration-200 ease-out",
                      "transform-gpu",
                      isSelected ? selectedShadow : flatShadow,
                      scaleClass,
                      z,
                      "active:scale-[1.01]",
                    ].join(" ")}
                    style={{ border }}
                    aria-pressed={isSelected}
                  >
                    <div
                      aria-hidden
                      className={[
                        "absolute -bottom-24 left-1/2 -translate-x-1/2 w-[520px] h-[240px] blur-2xl",
                        isSelected ? "opacity-90" : "opacity-28",
                        "transition-all duration-200 ease-out",
                      ].join(" ")}
                      style={{ background: a.accent.glow }}
                    />
                    <div
                      aria-hidden
                      className={[
                        "absolute inset-0 transition-all duration-200 ease-out",
                        isSelected ? "opacity-60" : "opacity-52",
                      ].join(" ")}
                      style={{ background: a.accent.bg }}
                    />

                    <div className="relative p-5 md:p-6 min-h-[330px] flex flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[12px] font-semibold tracking-wide text-zinc-200">
                            {a.label.toUpperCase()}
                          </div>

                          <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
                            {a.price}
                          </div>

                          <div className="mt-1 text-sm text-zinc-200/95">
                            <span className="font-semibold">{a.credits}</span> créditos
                            <span className="mx-2 text-zinc-400">•</span>
                            <span className="text-zinc-200">{a.perCredit}</span>
                          </div>
                        </div>

                        {isSelected ? (
                          <div className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold border border-white/22 bg-white/12 text-zinc-100">
                            Selecionado
                          </div>
                        ) : (
                          <div className="inline-flex items-center rounded-full px-3 py-1 text-[11px] border border-white/10 bg-transparent text-zinc-500">
                            Selecionar
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {(a.badges ?? []).map((b) => (
                          <span
                            key={b}
                            className={[
                              "inline-flex items-center rounded-full px-3 py-1 text-[11px] border",
                              isSelected
                                ? `${a.accent.badgeBgSelected} ${a.accent.badgeBorderSelected} ${a.accent.badgeTextSelected}`
                                : `${a.accent.badgeBg} ${a.accent.badgeBorder} ${a.accent.badgeText}`,
                              "transition-all duration-200 ease-out",
                            ].join(" ")}
                          >
                            {b}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 text-sm text-zinc-300 leading-relaxed">
                        {a.tagline}
                      </div>

                      <div className="mt-auto pt-5">
                        <ul className="text-xs text-zinc-300 space-y-1">
                          <li className="flex items-center gap-2">
                            <span className={a.accent.check}>✔</span> Compra única
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={a.accent.check}>✔</span> Créditos permanentes
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={a.accent.check}>✔</span> Compatível com plano mensal
                          </li>
                          <li className="flex items-center gap-2">
                            <span className={a.accent.check}>✔</span> Liberação automática após confirmação
                          </li>
                        </ul>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 mx-auto max-w-3xl">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-100">
                      Pacote selecionado:{" "}
                      <span className="text-zinc-200">{selected.label}</span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Pagamento via Pix. Créditos adicionados automaticamente após confirmação.
                    </div>
                  </div>
                </div>

                {pixStep !== "idle" && (
                  <div className="mt-4">
                    <div className="text-xs text-zinc-400">
                      Informe seu CPF/CNPJ para emissão do pagamento.
                    </div>

                    <div className="mt-2 flex flex-col md:flex-row gap-3">
                      <input
                        value={cpfCnpj}
                        onChange={(e) => setCpfCnpj(e.target.value)}
                        autoFocus
                        placeholder="CPF/CNPJ"
                        inputMode="numeric"
                        className="w-full md:flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-300 focus:ring-0"
                      />

                      <div className="text-xs text-zinc-500 md:w-[220px] md:self-center">
                        Somente para emissão do pagamento no Asaas.
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void onPixPrimaryClick()}
                    disabled={pixStep === "loading"}
                    className="rounded-xl px-6 py-2.5 text-sm font-semibold transition-all duration-200 ease-out disabled:opacity-60 active:scale-[0.99]"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(37,99,235,0.90), rgba(124,58,237,0.65))",
                      border: "1px solid rgba(167,139,250,0.28)",
                      color: "#EEF2FF",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
                      minWidth: "240px",
                    }}
                  >
                    {pixStep === "loading"
                      ? "Gerando PIX…"
                      : pixStep === "cpf"
                        ? "Confirmar e Gerar PIX"
                        : "Pagar com PIX"}
                  </button>
                </div>

                {pixStep === "ready" && pixRes && (pixRes as any)?.ok === true && (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-white p-4 md:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-zinc-900">
                        PIX gerado com sucesso
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-zinc-600">Copia e cola</div>
                        <textarea
                          readOnly
                          value={String((pixRes as any)?.pixQrCode?.payload ?? "")}
                          className="mt-2 w-full h-[120px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-300"
                        />
                        <div className="mt-2 text-[11px] text-zinc-500">
                          Use no app do seu banco para pagar.
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-zinc-600">QR Code</div>
                        <div className="mt-2 rounded-xl border border-zinc-200 bg-white p-3 flex items-center justify-center min-h-[160px]">
                          {(pixRes as any)?.pixQrCode?.encodedImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              alt="QR Code PIX"
                              className="max-h-[220px] w-auto"
                              src={`data:image/png;base64,${String(
                                (pixRes as any).pixQrCode.encodedImage,
                              )}`}
                            />
                          ) : (
                            <div className="text-xs text-zinc-500">
                              QR não disponível. Use o “copia e cola”.
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-[11px] text-zinc-500">
                          Expiração:{" "}
                          <span className="text-zinc-700">
                            {String((pixRes as any)?.pixQrCode?.expirationDate ?? "—")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {plansIsSelected && (
          <section className="mt-10">
            <div className="text-center">
              <div className="text-sm text-zinc-400">
                Modalidade:{" "}
                <span className="text-zinc-200 font-semibold">{cycleLabel}</span>
              </div>
            </div>

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
                      const oa =
                        codeKey(a.code) === "pro"
                          ? 2
                          : codeKey(a.code) === "unlimited"
                            ? 3
                            : 1;
                      const ob =
                        codeKey(b.code) === "pro"
                          ? 2
                          : codeKey(b.code) === "unlimited"
                            ? 3
                            : 1;
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
                                disabled={isBusyPlans || !canUseCycle || isCurrentPlan}
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
          </section>
        )}
      </div>
    </main>
  );
}