"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

const APP_BASE = "/app";

export default function StartPage() {
  const router = useRouter();
  const { status, loading, refreshStatus } = useOnboardingStatus();

  useEffect(() => {
    void refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading || !status) return;

    if (
      status.nicknameDefined !== true ||
      String(status.onboardingStage || "").toUpperCase().trim() === "NICKNAME_REQUIRED" ||
      String(status.onboardingStage || "").toUpperCase().trim() === "IDENTITY_REQUIRED"
    ) {
      router.replace(`${APP_BASE}/onboarding/identity`);
      return;
    }

    const stage = String(status.onboardingStage || "").toUpperCase().trim();

    if (stage === "TRIAL_ACTIVE") {
      router.replace(APP_BASE);
      return;
    }

    if (stage === "PAYMENT_PENDING") {
      router.replace(`${APP_BASE}/billing/pending`);
      return;
    }

    if (stage === "PAYMENT_FAILED") {
      router.replace(`${APP_BASE}/billing/failed`);
      return;
    }

    if (stage === "PAYMENT_REQUIRED" || stage === "PLAN_SELECTION_REQUIRED") {
      router.replace(`${APP_BASE}/billing/plan`);
      return;
    }

    if (stage === "TUTORIAL_REQUIRED") {
      router.replace(`${APP_BASE}/tutorial`);
      return;
    }

    router.replace(APP_BASE);
  }, [loading, status, router]);

  return (
    <main className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card p-6 md:p-7 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            Configurando sua conta…
          </h1>
          <p className="text-sm text-zinc-300/80">
            Aguarde enquanto validamos seu progresso.
          </p>
        </div>

        <div className="text-xs text-zinc-400/70">
          {loading ? "Carregando status…" : "Redirecionando…"}
        </div>

        <div className="pt-1 flex flex-col gap-2">
          <button
            className="btn w-full"
            type="button"
            onClick={() => void refreshStatus()}
            disabled={loading}
          >
            {loading ? "Atualizando…" : "Atualizar status"}
          </button>

          <Link
            href={`${APP_BASE}/conta`}
            className="text-center text-xs text-zinc-400 hover:text-zinc-200 transition"
          >
            Acessar conta
          </Link>
        </div>
      </div>
    </main>
  );
}
