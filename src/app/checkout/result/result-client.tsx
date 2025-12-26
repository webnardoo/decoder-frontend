"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type OnboardingStatus = { onboardingStage: string };

function routeFromStage(stage: string) {
  const s = String(stage || "").toUpperCase().trim();
  if (s === "NICKNAME_REQUIRED") return "/onboarding/identity";
  if (s === "IDENTITY_REQUIRED") return "/onboarding/identity";
  if (s === "TUTORIAL_REQUIRED") return "/tutorial";
  if (s === "READY") return "/conversas";
  if (s === "PAYMENT_FAILED") return "/billing/failed";
  if (s === "PAYMENT_PENDING") return "/billing/pending";
  if (s === "PAYMENT_REQUIRED") return "/billing/plan";
  return "/start";
}

export default function ResultClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const checkoutId = String(sp.get("checkoutId") ?? "").trim();

  const ran = useRef(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function run() {
      try {
        if (!checkoutId) throw new Error("checkoutId ausente.");

        const res = await fetch(`/api/checkout/${encodeURIComponent(checkoutId)}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ providerResultRef: "any" }),
          cache: "no-store",
        });

        if (res.status === 401) {
          router.replace("/login");
          return;
        }

        // independente do retorno, obedecer backend onboardingStage
        const st = await fetch("/api/onboarding/status", { credentials: "include", cache: "no-store" });

        if (st.status === 401) {
          router.replace("/login");
          return;
        }

        const statusJson = (await st.json()) as OnboardingStatus;
        router.replace(routeFromStage(statusJson.onboardingStage));
      } catch (e: any) {
        setError(String(e?.message || "Falha ao processar checkout."));
      }
    }

    void run();
  }, [checkoutId, router]);

  return (
    <div className="card p-5 space-y-2">
      <div className="text-sm font-medium">Checkout</div>
      <div className="text-sm text-zinc-400">Finalizando confirmação…</div>
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
