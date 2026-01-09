"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

function routeForStage(stage: string): string {
  const s = String(stage || "").toUpperCase().trim();

if (s === "READY") return "/";
if (s === "PAYMENT_REQUIRED") return "/billing/plan";
if (s === "PLAN_SELECTION_REQUIRED") return "/billing/plan";
if (s === "PAYMENT_PENDING") return "/billing/pending";
if (s === "PAYMENT_FAILED") return "/billing/failed";
if (s === "NICKNAME_REQUIRED") return "/onboarding/identity";
if (s === "IDENTITY_REQUIRED") return "/onboarding/identity";
if (s === "TUTORIAL_REQUIRED") return "/tutorial";

  return "/start";
}

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

export function OnboardingRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, loading, error, refreshStatus } = useOnboardingStatus();

  useEffect(() => {
    if (loading) return;

    // ✅ SE DER 401/403: NÃO É ONBOARDING. É LOGIN.
    const http = getHttpStatusFromError(error);
    if (http === 401 || http === 403) {
      // evita loop se já estiver no /login
      if (pathname !== "/login") router.replace("/login");
      return;
    }

    // outros erros: mantém tela de erro com "tentar novamente"
    if (error) return;

    if (!status) {
      router.replace("/start");
      return;
    }

    // ✅ REGRA CANÔNICA: assinante ativo NUNCA é obrigado a tutorial/onboarding/billing.
    if (status.subscriptionActive === true) {
      const isJourneyRoute =
        pathname === "/tutorial" ||
        pathname === "/start" ||
        pathname.startsWith("/onboarding") ||
        pathname.startsWith("/billing") ||
        pathname.startsWith("/checkout");

      if (isJourneyRoute) {
        router.replace("/");
      }
      return;
    }

    // ✅ exceção canônica do GAP: permite ficar em /checkout (sem loop) enquanto NÃO é assinante
    if (pathname.startsWith("/checkout")) {
      if (String(status.onboardingStage || "").toUpperCase().trim() === "READY") {
        router.replace("/");
      }
      return;
    }

    // ⚠️ tutorialPopupsPending só vale para não-assinantes
    if (status.tutorialPopupsPending && pathname !== "/tutorial") {
      router.replace("/tutorial");
      return;
    }

    const target = routeForStage(status.onboardingStage);

    if (pathname !== target) {
      router.replace(target);
      return;
    }
  }, [loading, error, status, pathname, router]);

  if (loading) {
    return <div className="card p-5 text-sm text-zinc-400">Carregando…</div>;
  }

  const http = getHttpStatusFromError(error);

  // ✅ em 401/403 não renderiza “Falha ao carregar status” (isso gera confusão)
  if (http === 401 || http === 403) {
    return (
      <div className="card p-5 space-y-2">
        <div className="text-sm font-medium">Sessão expirada. Faça login novamente.</div>
        <button className="btn btn-primary" onClick={() => router.replace("/login")}>
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
