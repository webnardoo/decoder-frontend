"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { runQuickTutorial, completeTutorial } from "@/lib/onboarding/onboarding.api";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

export default function TutorialPage() {
  const router = useRouter();
  const { status, refreshStatus, loading: statusLoading } = useOnboardingStatus();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  // ✅ Gate: se TRIAL estiver ativo, tutorial não pode abrir
  useEffect(() => {
    if (statusLoading) return;
    if (!status) return;

    if ((status as any)?.onboardingStage === "TRIAL_ACTIVE") {
      router.replace("/");
      return;
    }

    // tutorial só faz sentido com assinatura ativa
    if (status.subscriptionActive !== true) {
      router.replace("/billing/plan");
      return;
    }
  }, [statusLoading, status, router]);

  const remaining = useMemo(() => 200 - (text?.length ?? 0), [text]);
  const count = useMemo(() => (text?.length ?? 0), [text]);
  const countOk = count >= 60;

  async function onRun() {
    const t = text.trim();
    if (t.length < 60) {
      setErr("Texto muito curto (mínimo 60 caracteres).");
      return;
    }
    if (t.length > 200) {
      setErr("Texto excede 200 caracteres.");
      return;
    }

    setLoading(true);
    setErr(null);
    try {
      const r = await runQuickTutorial(t);
      setResult(r);
    } catch (e: any) {
      const msg =
        e?.body?.error === "NICKNAME_REQUIRED"
          ? "Defina sua identidade antes do tutorial."
          : "Falha ao executar tutorial.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onCompleteFlow() {
    setLoading(true);
    setErr(null);
    try {
      await completeTutorial();

      await refreshStatus();
      window.dispatchEvent(new Event("onboarding:refresh"));
      // Gate externo decide o próximo passo
    } catch {
      setErr("Falha ao concluir tutorial.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Tutorial</h1>
        <p className="text-sm text-zinc-400">
          A análise utiliza a capacidade disponível no seu plano.
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-xs text-zinc-500">
          Créditos: <span className="text-zinc-300">{status?.creditsBalance ?? "—"}</span>
          <br />
          Você será reconhecido no diálogo como:{" "}
          <span className="text-zinc-300">{status?.dialogueNickname ?? "—"}</span>
        </div>

        <textarea
          className="w-full min-h-[140px] rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm"
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (v.length <= 200) setText(v);
            else setText(v.slice(0, 200));
          }}
          placeholder="Cole aqui um trecho (60–200 caracteres)…"
        />

        <div className="flex items-center justify-between text-xs">
          <div className={countOk ? "text-emerald-400" : "text-red-400"}>
            Caracteres: {count}/200
          </div>
          <div className="text-zinc-500">
            Restante: <span className="text-zinc-300">{remaining}</span>
          </div>
        </div>

        {err && <div className="text-sm text-red-400">{err}</div>}

        {!result && (
          <button className="btn btn-primary" onClick={() => void onRun()} disabled={loading}>
            {loading ? "Processando…" : "Executar tutorial"}
          </button>
        )}

        {result && (
          <div className="space-y-3">
            <div className="text-xs text-zinc-500">
              Disclaimer: As análises são interpretações baseadas em padrões de linguagem e não representam verdades absolutas.
            </div>

            <div className="card p-4 space-y-2">
              <div className="text-sm font-medium">
                Score: {result?.score?.value} • {result?.score?.label}
              </div>
              <div className="text-sm text-zinc-300 whitespace-pre-line">
                {result?.analysis}
              </div>
              <div className="text-xs text-zinc-500">
                creditsUsed: <span className="text-zinc-300">{result?.creditsUsed ?? "—"}</span>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => void onCompleteFlow()} disabled={loading}>
              {loading ? "Concluindo…" : "Concluir tutorial"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
