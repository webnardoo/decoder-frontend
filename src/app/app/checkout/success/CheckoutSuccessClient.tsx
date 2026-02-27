// src/app/app/checkout/success/CheckoutSuccessClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function hasDialogueNickname(status: any): boolean {
  const byFlag = status?.nicknameDefined === true;
  const byValue =
    typeof status?.dialogueNickname === "string" &&
    status.dialogueNickname.trim().length > 0;
  return byFlag || byValue;
}

/**
 * ✅ NOVA REGRA (Signup sem obrigatoriedade de plano)
 * Fonte da verdade: GET /api/onboarding/status
 * Decisão:
 * - sem nickname -> /app/onboarding/identity (SEM next billing)
 * - com nickname e onboardingStage READY -> /app
 * - assinatura/pagamento NÃO determinam navegação do onboarding
 */
function computePostCheckoutTarget(status: any): string {
  const nickOk = hasDialogueNickname(status);
  if (!nickOk) return "/app/onboarding/identity";

  const stage = String(status?.onboardingStage ?? "").toUpperCase().trim();
  if (stage === "READY") return "/app";

  // fallback seguro: nunca manda para billing como parte do onboarding
  return "/app";
}

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

function safeNumber(v: any): number | null {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export default function CheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = useMemo(
    () => searchParams?.get("session_id") ?? null,
    [searchParams]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  /**
   * ✅ B) Purchase via Browser no /checkout/success (Stripe é externa)
   * - Dispara 1x por session_id (refresh não duplica)
   * - eventID estável (baseado no session_id) para dedupe futuro
   */
  useEffect(() => {
    try {
      const key = sessionId
        ? `hitch_meta_purchase_${sessionId}`
        : "hitch_meta_purchase_fired";

      const fired = sessionStorage.getItem(key);
      if (fired === "1") return;

      const fbqFn = (globalThis as any)?.fbq;
      if (typeof fbqFn !== "function") return;

      const eventId = sessionId ? `stripe_cs_${sessionId}_purchase` : `stripe_cs_purchase`;

      const planId = sessionStorage.getItem("hitch_last_plan_id") || undefined;
      const planCode = sessionStorage.getItem("hitch_last_plan_code") || undefined;
      const billingCycle = sessionStorage.getItem("hitch_last_billing_cycle") || undefined;

      const valueRaw = sessionStorage.getItem("hitch_last_plan_value");
      const value = safeNumber(valueRaw);

      const params: Record<string, any> = {
        currency: "BRL",
        content_category: "subscription",
      };

      if (typeof planCode === "string" && planCode.trim()) params.content_name = planCode.trim();
      if (typeof planId === "string" && planId.trim()) params.content_ids = [planId.trim()];
      if (typeof billingCycle === "string" && billingCycle.trim())
        params.billing_cycle = billingCycle.trim();

      if (value != null) params.value = value;

      fbqFn("track", "Purchase", params, { eventID: eventId });

      sessionStorage.setItem(key, "1");
    } catch {
      // silencioso
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ✅ Meta Pixel: Subscribe 1x por session_id
  useEffect(() => {
    try {
      const key = sessionId
        ? `hitch_meta_subscribe_${sessionId}`
        : "hitch_meta_subscribe_fired";

      const fired = sessionStorage.getItem(key);
      if (fired === "1") return;

      const fbqFn = (globalThis as any)?.fbq;
      if (typeof fbqFn === "function") {
        const eventId = sessionId ? `stripe_cs_${sessionId}_subscribe` : `stripe_success_subscribe`;

        fbqFn("track", "Subscribe", {}, { eventID: eventId });

        sessionStorage.setItem(key, "1");
      }
    } catch {
      // silencioso
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleOk() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      try {
        sessionStorage.setItem("hitch_skip_onboarding_once", "1");
        if (sessionId) sessionStorage.setItem("hitch_last_stripe_session_id", sessionId);
      } catch {
        // silencioso
      }

      const res = await fetch("/api/onboarding/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const ct = res.headers.get("content-type") ?? "";
      const body = ct.includes("application/json")
        ? await res.json().catch(() => null)
        : await res.text().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        router.replace("/app/login");
        return;
      }

      if (!res.ok) {
        const msg =
          (typeof body === "object" ? extractMessage(body) : null) ||
          "Não foi possível validar seu status. Tente novamente.";
        setError(msg);
        return;
      }

      if (!body || typeof body !== "object") {
        setError("Resposta inválida ao validar seu status. Tente novamente.");
        return;
      }

      const target = computePostCheckoutTarget(body);
      router.replace(target);
    } catch {
      setError("Falha de conexão ao validar seu status. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card p-6 md:p-7">
        <div className="flex flex-col items-center text-center gap-4">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            Pagamento Confirmado
          </h1>

          {error && (
            <div className="w-full rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="pt-1 w-full">
            <button
              type="button"
              className="btn btn-cta w-full"
              onClick={handleOk}
              disabled={loading}
            >
              {loading ? "Validando..." : "Ok"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}