"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";
import { runQuickTutorial, completeTutorial, ackTutorialPopups } from "@/lib/onboarding/onboarding.api";

const TRIAL_MIN = 60;
const TRIAL_MAX = 200;

function clampText(input: string) {
  const t = input ?? "";
  if (t.length <= TRIAL_MAX) return t;
  return t.slice(0, TRIAL_MAX);
}

export default function TutorialPage() {
  const router = useRouter();
  const { status, loading, error, refreshStatus } = useOnboardingStatus();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // ✅ HARD OVERRIDE: assinante ativo NÃO pode ficar em /tutorial
  useEffect(() => {
    if (loading) return;
    if (!status) return;

    if (status.subscriptionActive === true) {
      router.replace("/");
      return;
    }
  }, [loading, status, router]);

  const effectiveText = useMemo(() => clampText(text), [text]);
  const chars = effectiveText.length;
  const charsOk = chars >= TRIAL_MIN && chars <= TRIAL_MAX;

  async function onRunTutorial() {
    if (busy) return;
    setBanner(null);

    if (!charsOk) {
      setBanner(`Use entre ${TRIAL_MIN} e ${TRIAL_MAX} caracteres.`);
      return;
    }

    setBusy(true);
    try {
      await runQuickTutorial(effectiveText);

      // opcional: marcar popups/ack se existir
      try {
        await ackTutorialPopups();
      } catch {
        // silencioso (não quebra tutorial)
      }

      // conclui tutorial no backend
      await completeTutorial();

      // atualiza status e segue fluxo normal
      await refreshStatus();
      router.replace("/");
    } catch (e: any) {
      setBanner(
        e?.message ||
          e?.body?.message ||
          "Falha ao executar o tutorial. Tente novamente."
      );
    } finally {
      setBusy(false);
    }
  }

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

  // se já tiver status mas ainda não redirecionou, renderiza tutorial (não-assinante)
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Tutorial</h1>
        <p className="text-sm text-zinc-400">
          A análise utiliza a capacidade disponível no seu plano.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm text-zinc-300">
          Créditos: {typeof status?.creditsBalance === "number" ? status.creditsBalance : 0}
        </div>
        <div className="text-sm text-zinc-300">
          Você será reconhecido no diálogo como:{" "}
          <span className="text-zinc-100">{status?.dialogueNickname ?? "—"}</span>
        </div>

        <textarea
          className="w-full rounded-xl border p-3 min-h-45"
          value={effectiveText}
          onChange={(e) => setText(clampText(e.target.value))}
          placeholder={`Cole aqui um trecho (${TRIAL_MIN}–${TRIAL_MAX} caracteres)...`}
          disabled={busy}
        />

        <div className="flex items-center justify-between text-xs">
          <div className={charsOk ? "text-emerald-400" : "text-red-400"}>
            Caracteres: {chars}/{TRIAL_MAX}
          </div>
          <div className="text-zinc-400">Restante: {Math.max(0, TRIAL_MAX - chars)}</div>
        </div>

        <button
          className="btn btn-primary"
          type="button"
          onClick={onRunTutorial}
          disabled={busy || !charsOk}
        >
          {busy ? "Executando…" : "Executar tutorial"}
        </button>

        {banner && (
          <div className="rounded-xl border p-3 text-sm">
            <div className="font-medium">Falha</div>
            <div className="text-muted-foreground">{banner}</div>
          </div>
        )}
      </div>
    </div>
  );
}
