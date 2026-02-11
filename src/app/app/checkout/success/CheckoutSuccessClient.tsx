"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

function hasDialogueNickname(status: any): boolean {
  const byFlag = status?.nicknameDefined === true;
  const byValue =
    typeof status?.dialogueNickname === "string" && status.dialogueNickname.trim().length > 0;
  return byFlag || byValue;
}

/**
 * ✅ PACOTE 5 (PAID Success)
 * Fonte da verdade: GET /api/onboarding/status
 * Decisão:
 * - subscriptionActive=true -> /app
 * - subscriptionActive=false -> /app/billing/plan
 * - sem nickname -> identity (next=/app/billing/plan)
 */
function computePostCheckoutTarget(status: any): string {
  const subscriptionActive = status?.subscriptionActive === true;
  if (subscriptionActive) return "/app";

  const nickOk = hasDialogueNickname(status);
  if (!nickOk) return "/app/onboarding/identity?next=%2Fapp%2Fbilling%2Fplan";

  return "/app/billing/plan";
}

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

export default function CheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionId = useMemo(() => searchParams?.get("session_id") ?? null, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // ✅ Meta Pixel: dispara Subscribe 1x ao carregar a página de success
  useEffect(() => {
    try {
      const key = "hitch_meta_subscribe_fired";
      const fired = sessionStorage.getItem(key);
      if (fired === "1") return;

      const fbqFn = (globalThis as any)?.fbq;
      if (typeof fbqFn === "function") {
        const eventId = sessionId ? `stripe_${sessionId}` : `stripe_success_${Date.now()}`;
        // 3º argumento: params; 4º argumento: options (eventID p/ dedupe)
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
      // ✅ bypass one-shot: impede guided trial/popup ao voltar pra Home
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

      // Sem sessão -> login (sem loop)
      if (res.status === 401 || res.status === 403) {
        router.replace("/app/login");
        return;
      }

      if (!res.ok) {
        const msg =
          (typeof body === "object" ? extractMessage(body) : null) ||
          "Não foi possível validar sua assinatura. Tente novamente.";
        setError(msg);
        return;
      }

      if (!body || typeof body !== "object") {
        setError("Resposta inválida ao validar sua assinatura. Tente novamente.");
        return;
      }

      const target = computePostCheckoutTarget(body);
      router.replace(target);
    } catch {
      setError("Falha de conexão ao validar sua assinatura. Tente novamente.");
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
