"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

function routeForStage(stage: string): string {
  const s = String(stage || "").toUpperCase().trim();

  // ✅ APP “home” nesta branch é /app
  if (s === "READY") return "/app";

  // Billing (rotas reais: /app/billing/*)
  if (s === "PAYMENT_REQUIRED") return "/app/billing/plan";
  if (s === "PLAN_SELECTION_REQUIRED") return "/app/billing/plan";
  if (s === "PAYMENT_PENDING") return "/app/billing/pending";
  if (s === "PAYMENT_FAILED") return "/app/billing/failed";

  // Identity (rota real: src/app/app/onboarding/identity/page.tsx)
  if (s === "NICKNAME_REQUIRED") return "/app/onboarding/identity";
  if (s === "IDENTITY_REQUIRED") return "/app/onboarding/identity";

  // Tutorial (rota real: src/app/app/tutorial/page.tsx)
  if (s === "TUTORIAL_REQUIRED") return "/app/tutorial";

  // Fallback seguro (rota real existe)
  return "/app/start";
}

function getHttpStatusFromError(err: any): number | null {
  if (!err) return null;

  if (typeof err?.status === "number") return err.status;
  if (typeof err?.statusCode === "number") return err.statusCode;

  if (typeof err?.body?.statusCode === "number") return err.body.statusCode;
  if (typeof err?.body?.status === "number") return err.body.status;

  if (typeof err?.backendStatus === "number") return err.backendStatus;
  if (typeof err?.backendBody?.statusCode === "number")
    return err.backendBody.statusCode;

  return null;
}

export function OnboardingRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = pathname ?? "";

  const { status, loading, error, refreshStatus } = useOnboardingStatus();

  useEffect(() => {
    if (loading) return;

    // ✅ 401/403 = sessão/login
    const http = getHttpStatusFromError(error);
    if (http === 401 || http === 403) {
      // login real nesta branch: /app/login
      if (safePathname !== "/app/login") router.replace("/app/login");
      return;
    }

    // outros erros: mantém UI de erro
    if (error) return;

    // sem status: manda pro start real do app
    if (!status) {
      router.replace("/app/start");
      return;
    }

    // ✅ assinante ativo nunca fica preso em jornada
    if (status.subscriptionActive === true) {
      const isJourneyRoute =
        safePathname === "/app/tutorial" ||
        safePathname === "/app/start" ||
        safePathname.startsWith("/app/onboarding") ||
        safePathname.startsWith("/app/billing") ||
        safePathname.startsWith("/app/checkout");

      if (isJourneyRoute) router.replace("/app");
      return;
    }

    // ✅ permite permanecer em /app/checkout enquanto NÃO é assinante
    if (safePathname.startsWith("/app/checkout")) {
      if (String(status.onboardingStage || "").toUpperCase().trim() === "READY") {
        router.replace("/app");
      }
      return;
    }

    // ✅ tutorialPopupsPending manda pro tutorial real
    if (status.tutorialPopupsPending && safePathname !== "/app/tutorial") {
      router.replace("/app/tutorial");
      return;
    }

    const target = routeForStage(status.onboardingStage);
    if (safePathname !== target) router.replace(target);
  }, [loading, error, status, safePathname, router]);

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
