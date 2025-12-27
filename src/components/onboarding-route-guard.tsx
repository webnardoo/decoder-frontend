"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

function routeForStage(stage: string): string {
  const s = String(stage || "").toUpperCase().trim();

  if (s === "READY") return "/conversas";
  if (s === "PAYMENT_REQUIRED") return "/billing/plan";
  if (s === "PAYMENT_PENDING") return "/billing/pending";
  if (s === "PAYMENT_FAILED") return "/billing/failed";
  if (s === "NICKNAME_REQUIRED") return "/onboarding/identity";
  if (s === "IDENTITY_REQUIRED") return "/onboarding/identity";
  if (s === "TUTORIAL_REQUIRED") return "/tutorial";

  return "/start";
}

export function OnboardingRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, loading, error, refreshStatus } = useOnboardingStatus();

  useEffect(() => {
    if (loading) return;
    if (error) return;

    if (!status) {
      router.replace("/start");
      return;
    }

    // ✅ REGRA CANÔNICA: assinante ativo NUNCA é obrigado a tutorial/onboarding/billing.
    // Se estiver em qualquer rota de jornada, força saída para Home.
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
      // se já está READY, não faz sentido ficar em checkout
      if (String(status.onboardingStage || "").toUpperCase().trim() === "READY") {
        router.replace("/conversas");
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
