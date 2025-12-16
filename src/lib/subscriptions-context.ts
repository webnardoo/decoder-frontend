export type PlanContext = {
  plan: "FREE" | "BASIC" | "PRO" | "UNLIMITED";
  isUnlimited: boolean;
};

export async function fetchPlanContext(): Promise<PlanContext> {
  const res = await fetch("/api/v1/subscriptions/context", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    // fora do contrato: tratar como 500 na UI
    throw new Error(`Falha ao carregar contexto do plano (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as any;

  return {
    plan: data?.plan,
    isUnlimited: Boolean(data?.isUnlimited),
  } as PlanContext;
}
