"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";
import { ackTutorialPopups } from "@/lib/onboarding/onboarding.api";

type UiState = "idle" | "submitting" | "error";

export function TutorialPopupsGate() {
  const router = useRouter();
  const pathname = usePathname();

  const { status, loading, refreshStatus } = useOnboardingStatus();

  const [open, setOpen] = useState(false);
  const [ui, setUi] = useState<UiState>("idle");

  const introSeenKey = "hint:tutorial_intro_seen";

  const popupStep = useMemo<1 | 2 | null>(() => {
    if (loading) return null;
    if (!status) return null;

    // POPUP 2 (final)
    if (status.tutorialPopupsPending && status.tutorialCompleted) {
      return 2;
    }

    // POPUP 1 (entrada do tutorial)
    const isInTutorial = pathname?.startsWith("/tutorial");
    const isTutorialStage = status.onboardingStage === "TUTORIAL_REQUIRED";
    const notCompleted = status.tutorialCompleted !== true;

    if (isInTutorial && isTutorialStage && notCompleted) {
      if (typeof window !== "undefined") {
        const seen = window.sessionStorage.getItem(introSeenKey) === "1";
        if (!seen) return 1;
      }
    }

    return null;
  }, [loading, status, pathname]);

  const shouldShow = popupStep !== null;

  useEffect(() => {
    if (shouldShow) setOpen(true);
  }, [shouldShow]);

  useEffect(() => {
    const handler = () => void refreshStatus();
    window.addEventListener("onboarding:refresh", handler);
    return () => window.removeEventListener("onboarding:refresh", handler);
  }, [refreshStatus]);

  const closeOnly = useCallback(() => {
    if (popupStep === 1 && typeof window !== "undefined") {
      window.sessionStorage.setItem(introSeenKey, "1");
    }
    setOpen(false);
    setUi("idle");
  }, [popupStep]);

  async function handleAck() {
    try {
      setUi("submitting");

      if (popupStep === 1) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(introSeenKey, "1");
        }
        setUi("idle");
        setOpen(false);
        return;
      }

      await ackTutorialPopups();

      setUi("idle");
      setOpen(false);

      await refreshStatus();

      router.push("/conversas");
    } catch {
      setUi("error");
    }
  }

  if (!open || popupStep === null) return null;

  const title = popupStep === 1 ? "Dicas rápidas" : "Tutorial concluído";
  const subtitle =
    popupStep === 1 ? "Antes de executar, confira estas regras rápidas." : "Você pode seguir para Conversas.";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-50">{title}</h2>
            <p className="mt-1 text-sm text-zinc-300">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={closeOnly}
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-60"
            aria-label="Fechar"
            disabled={ui === "submitting"}
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-zinc-900 bg-zinc-950/50 p-3">
          {popupStep === 1 ? (
            <p className="text-sm text-zinc-300">
              • Use textos reais (mínimo 60 caracteres).<br />
              • A análise é uma interpretação baseada em linguagem.<br />
              • No tutorial, não há consumo de créditos.
            </p>
          ) : (
            <p className="text-sm text-zinc-300">
              • Tutorial concluído com sucesso.<br />
              • A partir da próxima análise, o uso será contabilizado conforme seu plano.<br />
              • Você pode seguir para Conversas.
            </p>
          )}
        </div>

        {ui === "error" && <div className="mt-3 text-sm text-red-400">Falha ao confirmar. Tente novamente.</div>}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeOnly}
            className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-60"
            disabled={ui === "submitting"}
          >
            Agora não
          </button>

          <button
            type="button"
            onClick={handleAck}
            className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:brightness-95 disabled:opacity-60"
            disabled={ui === "submitting"}
          >
            {ui === "submitting" ? "Confirmando..." : "Entendi"}
          </button>
        </div>
      </div>
    </div>
  );
}
