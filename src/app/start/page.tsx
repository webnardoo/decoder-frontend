// FRONT — src/app/start/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

export default function StartPage() {
  const router = useRouter();
  const { status, loading, refreshStatus } = useOnboardingStatus();

  useEffect(() => {
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!status) return;

    /**
     * PRIORIDADE CANÔNICA (OBRIGATÓRIA)
     * 1) Nickname (sempre primeiro)
     * 2) Trial (degustação) -> onboardingStage === "TRIAL_ACTIVE"
     * 3) Planos/pagamento (sem assinatura)
     * 4) Tutorial (só pós-assinatura e pós-onboarding)
     */

    // 1) Nickname obrigatório
    if (status.nicknameDefined !== true || status.onboardingStage === "NICKNAME_REQUIRED") {
      router.replace("/onboarding/identity");
      return;
    }

    // 2) Degustação guiada (TRIAL)
    if (status.onboardingStage === "TRIAL_ACTIVE") {
      // A degustação acontece na HOME (Quick) com GuidedOverlay
      router.replace("/");
      return;
    }

    // 3) Sem assinatura -> planos
    if (status.subscriptionActive !== true) {
      router.replace("/billing/plan");
      return;
    }

    // 4) Tutorial (apenas para assinante, pós-onboarding)
    if (status.tutorialCompleted !== true) {
      router.replace("/tutorial");
      return;
    }

    // Default: app normal
    router.replace("/");
  }, [loading, status, router]);

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card p-6 md:p-7">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Configurando sua conta…</h1>
        <p className="mt-1 text-sm text-zinc-300/80">
          Aguarde enquanto validamos seu progresso.
        </p>

        <div className="mt-4 text-xs text-zinc-400/70">
          {loading ? "Carregando status…" : "Redirecionando…"}
        </div>

        <div className="mt-6">
          <button
            className="btn w-full"
            type="button"
            onClick={() => void refreshStatus()}
            disabled={loading}
          >
            {loading ? "Atualizando…" : "Atualizar status"}
          </button>
        </div>
      </div>
    </main>
  );
}
