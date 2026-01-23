"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

function getHttpStatusFromError(err: any): number | null {
  if (!err) return null;
  if (typeof err?.status === "number") return err.status;
  if (typeof err?.statusCode === "number") return err.statusCode;
  if (typeof err?.body?.statusCode === "number") return err.body.statusCode;
  if (typeof err?.body?.status === "number") return err.body.status;
  if (typeof err?.backendStatus === "number") return err.backendStatus;
  if (typeof err?.backendBody?.statusCode === "number") return err.backendBody.statusCode;
  return null;
}

function hasDialogueNickname(status: any): boolean {
  const byFlag = status?.nicknameDefined === true;
  const byValue =
    typeof status?.dialogueNickname === "string" && status.dialogueNickname.trim().length > 0;

  // ✅ considera ambos (flag ou valor)
  return byFlag || byValue;
}

function buildIdentityUrl(nextPath: string, reason: string) {
  const next = encodeURIComponent(nextPath || "/app/billing/plan");
  return `/app/onboarding/identity?next=${next}&reason=${encodeURIComponent(reason)}`;
}

export function OnboardingRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname ?? "";

  const { status, loading, error, refreshStatus } = useOnboardingStatus();

  // ✅ evita redirect “cedo demais” quando o store ainda não populou status
  const didRetryRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    // Sessão inválida → login
    const http = getHttpStatusFromError(error);
    if (http === 401 || http === 403) {
      if (safePathname !== "/app/login") router.replace("/app/login");
      return;
    }

    if (error) return;

    // ✅ Se o status ainda não veio, tenta 1x refresh antes de qualquer redirect
    if (!status) {
      if (!didRetryRef.current) {
        didRetryRef.current = true;
        void refreshStatus();
        return;
      }

      // fallback seguro (após 1 retry)
      if (safePathname !== "/app/start") router.replace("/app/start?reason=NO_STATUS");
      return;
    }

    // status ok → reseta retry
    didRetryRef.current = false;

    const stage = String(status.onboardingStage || "").toUpperCase().trim();
    const onIdentity = safePathname.startsWith("/app/onboarding/identity");
    const onBilling = safePathname.startsWith("/app/billing");
    const onLogin = safePathname.startsWith("/app/login");

    const nickOk = hasDialogueNickname(status);
    const subscriptionActive = status.subscriptionActive === true;

    /**
     * ============================
     * ASSINANTE ATIVO → APP
     * ============================
     */
    if (subscriptionActive) {
      if (!safePathname || onLogin || onIdentity || onBilling) {
        if (safePathname !== "/app") router.replace("/app");
      } else if (safePathname !== "/app") {
        router.replace("/app");
      }
      return;
    }

    /**
     * ============================
     * NÃO ASSINANTE (LOGADO)
     * Regra do produto: página de planos logada deve abrir.
     * ============================
     */

    // Se backend mandar PLAN_SELECTION_REQUIRED, garante billing (sem travar em nickname)
    if (stage === "PLAN_SELECTION_REQUIRED") {
      if (!onBilling) router.replace("/app/billing/plan");
      return;
    }

    // ✅ Billing nunca deve ser bloqueado por nickname (evita loop “volta pro nickname”)
    if (onBilling) {
      return;
    }

    // Nickname obrigatório antes de continuar o funil (exceto billing, acima)
    if (!nickOk) {
      if (!onIdentity) {
        const target = buildIdentityUrl("/app/billing/plan", "NEEDS_NICKNAME");
        router.replace(target);
      }
      return;
    }

    // Nickname ok → vai para planos logados
    if (!onBilling) {
      router.replace("/app/billing/plan");
    }
  }, [loading, error, status, safePathname, router, refreshStatus]);

  if (loading) {
    return <div className="card p-5 text-sm text-zinc-400">Carregando…</div>;
  }

  const http = getHttpStatusFromError(error);

  if (http === 401 || http === 403) {
    return (
      <div className="card p-5 space-y-2">
        <div className="text-sm font-medium">Sessão expirada. Faça login novamente.</div>
        <button className="btn btn-primary" onClick={() => router.replace("/app/login")}>
          Ir para login
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 space-y-2">
        <div className="text-sm font-medium">Falha ao carregar seu status.</div>
        <button className="btn btn-primary" onClick={() => void refreshStatus()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
