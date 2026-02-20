// src/components/onboarding/OnboardingRouteGuard.tsx
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

/**
 * Rotas públicas: não exigem status/onboarding.
 * IMPORTANTE: cobrir /app/* e também rotas "raiz" (/login etc)
 */
function isPublicRoute(path: string): boolean {
  if (!path) return false;

  // /app/*
  if (path === "/app/login") return true;
  if (path === "/app/register") return true;
  if (path === "/app/forgot-password") return true;
  if (path === "/app/reset-password") return true;

  // Checkout é público (Stripe externo)
  if (path.startsWith("/app/checkout")) return true;

  // Billing pode existir como rota, mas NÃO é parte do onboarding
  if (path.startsWith("/app/billing")) return true;

  // raiz
  if (path === "/login") return true;
  if (path === "/register") return true;
  if (path === "/forgot-password") return true;
  if (path === "/reset-password") return true;

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

  const isLogin = safePathname === "/app/login" || safePathname === "/login";
  const onIdentity = safePathname.startsWith("/app/onboarding/identity");

  const { status, loading, error, refreshStatus } = useOnboardingStatus();
  const didRetryRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    const http = getHttpStatusFromError(error);

    // Sessão inválida → login
    if (http === 401 || http === 403) {
      if (!isLogin) router.replace("/app/login");
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
    const nickOk = hasDialogueNickname(status);

    /**
     * ✅ NOVA REGRA (Signup sem obrigatoriedade de plano)
     * - Se não tem nickname => /app/onboarding/identity
     * - Se tem nickname e onboardingStage READY => /app
     * - subscriptionActive/paymentStatus/journey NÃO determinam navegação do onboarding
     */

    // Nickname ausente → identity (SEM next, SEM billing)
    if (!nickOk) {
      if (!onIdentity) router.replace("/app/onboarding/identity");
      return;
    }

    // Nickname ok: não permitir ficar no identity
    if (onIdentity) {
      router.replace(APP_HOME);
      return;
    }

    // Se READY: garantir que /app/start não fique “preso”
    if (stage === "READY") {
      if (safePathname === "/app/start") router.replace(APP_HOME);
      return;
    }

    // Fallback seguro: com nickname, entra no app e não empurra billing
    if (safePathname === "/app/start") {
      router.replace(APP_HOME);
      return;
    }
  }, [loading, error, status, safePathname, router, refreshStatus, onIdentity, isLogin]);

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