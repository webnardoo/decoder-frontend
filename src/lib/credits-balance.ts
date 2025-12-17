export type CreditsBalance = {
  userId: string;
  balance: number;
};

export async function fetchCreditsBalance(): Promise<CreditsBalance> {
  const res = await fetch("/api/v1/credits/balance", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Falha ao carregar saldo de créditos (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as any;

  return {
    userId: typeof data?.userId === "string" ? data.userId : "",
    balance: typeof data?.balance === "number" ? data.balance : 0,
  };
}
