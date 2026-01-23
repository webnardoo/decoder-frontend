"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

const APP_HOME = "/app";

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
  return byFlag || byValue;
}

function normalizeJourney(v: any): "PAID" | "TRIAL" | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "TRIAL") return "TRIAL";
  return null;
}

function buildIdentityUrl(nextPath: string, reason: string) {
  const next = encodeURIComponent(nextPath || APP_HOME);
  return `/app/onboarding/identity?next=${next}&reason=${encodeURIComponent(reason)}`;
}

/**
 * Rotas públicas: não exigem status/onboarding.
 * (Mantive sua lógica, só deixei explícito o que é público.)
 */
function isPublicRoute(path: string): boolean {
  if (!path) return false;

  // Auth pública
  if (path === "/app/login") return true;
  if (path === "/app/register") return true;

  // Billing/checkout públicos (fluxo pode iniciar antes de sessão)
  if (path.startsWith("/app/checkout")) return true;
  if (path.startsWith("/app/billing")) return true;

  return false;
}

export function OnboardingRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isPublic = isPublicRoute(pathname);

  if (isPublic) return <>{children}</>;

  return <PrivateOnboardingGuard pathname={pathname}>{children}</PrivateOnboardingGuard>;
}

function PrivateOnboardingGuard({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const router = useRouter();
  const safePathname = pathname ?? "";

  const isLogin = safePathname === "/app/login";
  const onBilling = safePathname.startsWith("/app/billing");
  const onIdentity = safePathname.startsWith("/app/onboarding/identity");

  // ✅ HOME REAL DO APP É /app (não /app/app)
  const onAppHome = safePathname === APP_HOME || safePathname.startsWith(`${APP_HOME}/`);

  const { status, loading, error, refreshStatus } = useOnboardingStatus();
  const didRetryRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    const http = getHttpStatusFromError(error);

    // Sessão inválida → login
    if (http === 401 || http === 403) {
      if (safePathname !== "/app/login") router.replace("/app/login");
      return;
    }

    if (error) return;

    // Se status não veio, tenta 1x refresh antes de redirecionar
    if (!status) {
      if (!didRetryRef.current) {
        didRetryRef.current = true;
        void refreshStatus();
        return;
      }
      if (safePathname !== "/app/start") router.replace("/app/start?reason=NO_STATUS");
      return;
    }

    didRetryRef.current = false;

    const stage = String(status.onboardingStage || "").toUpperCase().trim();
    const journey = normalizeJourney((status as any)?.journey);
    const nickOk = hasDialogueNickname(status);
    const subscriptionActive = status.subscriptionActive === true;

    // Assinante ativo → APP_HOME
    if (subscriptionActive) {
      if (!onAppHome) router.replace(APP_HOME);
      return;
    }

    // TRIAL → não passa por billing agora; nickname obrigatório; home = /app
    if (journey === "TRIAL") {
      if (onBilling) {
        router.replace(APP_HOME);
        return;
      }

      if (!nickOk) {
        if (!onIdentity) router.replace(buildIdentityUrl(APP_HOME, "TRIAL_NEEDS_NICKNAME"));
        return;
      }

      if (!onAppHome && !onIdentity && !isLogin) {
        router.replace(APP_HOME);
      }
      return;
    }

    // PAID logado, sem assinatura → planos
    if (stage === "PLAN_SELECTION_REQUIRED") {
      if (!onBilling) router.replace("/app/billing/plan");
      return;
    }

    // PAID com assinatura pendente, mas em billing ok
    if (onBilling) return;

    // PAID: nickname obrigatório antes de billing
    if (!nickOk) {
      if (!onIdentity) router.replace(buildIdentityUrl("/app/billing/plan", "NEEDS_NICKNAME"));
      return;
    }

    router.replace("/app/billing/plan");
  }, [
    loading,
    error,
    status,
    safePathname,
    router,
    refreshStatus,
    onBilling,
    onIdentity,
    onAppHome,
    isLogin,
  ]);

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
