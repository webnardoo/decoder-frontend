import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

type SearchParams = {
  planId?: string;
  billingCycle?: "monthly" | "annual" | string;
};

function getApiBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4100";
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

function buildCheckoutSessionEndpoint(base: string) {
  return base.endsWith("/api/v1")
    ? `${base}/billing/stripe/checkout-session`
    : `${base}/api/v1/billing/stripe/checkout-session`;
}

function buildSelfCheckoutUrl(planId: string, billingCycle: "monthly" | "annual") {
  return `/app/app/checkout?planId=${encodeURIComponent(planId)}&billingCycle=${encodeURIComponent(
    billingCycle,
  )}`;
}

function firstIpFromXff(xff: string | null): string | null {
  const v = (xff ?? "").trim();
  if (!v) return null;
  const first = v.split(",")[0]?.trim();
  return first || null;
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

  // ✅ Login do APP é /app/login (NÃO /app/app/login)
  if (!token) {
    redirect(
      `/app/login?next=${encodeURIComponent(buildSelfCheckoutUrl(planId, billingCycle))}`,
    );
  }

  // ✅ Captura match fields no request do usuário (browser -> Next server)
  const cookieStore = await cookies();
  const h = await headers();

  const fbp = (cookieStore.get("_fbp")?.value ?? "").trim() || null;
  const fbc = (cookieStore.get("_fbc")?.value ?? "").trim() || null;

  const ua = (h.get("user-agent") ?? "").trim() || null;

  // Em local geralmente vem vazio; em prod pode vir via proxy.
  const ip =
    firstIpFromXff(h.get("x-forwarded-for")) ||
    (h.get("x-real-ip") ?? "").trim() ||
    null;

  const base = getApiBaseUrl();
  const endpoint = buildCheckoutSessionEndpoint(base);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
    body: JSON.stringify({
      planId,
      billingCycle,

      // ✅ match boosters (opcional)
      fbp,
      fbc,
      clientIpAddress: ip,
      clientUserAgent: ua,
    }),
  });

  const payload = await fetchJsonOrText(res);

  if (!res.ok) {
    const msg =
      typeof payload === "string"
        ? payload
        : payload?.message || payload?.error || JSON.stringify(payload);

    redirect(
      `/app/app/checkout/result?ok=0&msg=${encodeURIComponent(
        String(msg).slice(0, 180),
      )}`,
    );
  }

  const checkoutUrl = extractCheckoutUrl(payload);
  if (!checkoutUrl) {
    redirect(
      `/app/app/checkout/result?ok=0&msg=${encodeURIComponent(
        "Backend não retornou checkout URL.",
      )}`,
    );
  }

  redirect(checkoutUrl);
}
