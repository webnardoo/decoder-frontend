// src/app/checkout/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

type SearchParams = {
  planId?: string;
  billingCycle?: "monthly" | "annual" | string;
};

function getApiBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4100/api/v1";
  return base.replace(/\/+$/, "");
}

function mustPlanId(planId?: string) {
  const v = (planId ?? "").trim();
  if (!v) throw new Error("planId é obrigatório.");
  return v;
}

function normalizeCycle(v?: string): "monthly" | "annual" {
  const s = (v ?? "").toLowerCase().trim();
  return s === "annual" ? "annual" : "monthly";
}

async function getTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  const a = store.get("accessToken")?.value;
  const b = store.get("token")?.value;
  const c = store.get("decoder_auth")?.value;
  return (a || b || c || "").trim() || null;
}

async function fetchJsonOrText(res: Response) {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return await res.json().catch(() => ({}));
  }
  return await res.text().catch(() => "");
}

function extractCheckoutUrl(payload: any): string | null {
  const u =
    payload?.url ||
    payload?.checkoutUrl ||
    payload?.sessionUrl ||
    payload?.redirectUrl;
  return typeof u === "string" && u.trim().length > 0 ? u.trim() : null;
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const planId = mustPlanId(sp.planId);
  const billingCycle = normalizeCycle(sp.billingCycle);

  const token = await getTokenFromCookies();
  if (!token) {
    redirect(
      `/login?next=${encodeURIComponent(
        `/checkout?planId=${planId}&billingCycle=${billingCycle}`,
      )}`,
    );
  }

  const base = getApiBaseUrl();

  // ✅ CONTRATO REAL DO BACKEND
  const res = await fetch(`${base}/billing/stripe/checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: JSON.stringify({
      planId,
      billingCycle,
    }),
  });

  const payload = await fetchJsonOrText(res);

  if (!res.ok) {
    const msg =
      typeof payload === "string"
        ? payload
        : payload?.message || payload?.error || JSON.stringify(payload);
    redirect(
      `/checkout/result?ok=0&msg=${encodeURIComponent(
        String(msg).slice(0, 180),
      )}`,
    );
  }

  const checkoutUrl = extractCheckoutUrl(payload);
  if (!checkoutUrl) {
    redirect(
      `/checkout/result?ok=0&msg=${encodeURIComponent(
        "Backend não retornou checkout URL.",
      )}`,
    );
  }

  redirect(checkoutUrl);
}
