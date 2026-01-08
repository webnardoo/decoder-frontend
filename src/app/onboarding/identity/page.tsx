// FRONT — src/app/onboarding/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateDialogueNickname } from "@/lib/onboarding/onboarding.api";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

export default function IdentityPage() {
  const router = useRouter();
  const { status, refreshStatus } = useOnboardingStatus();

  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setValue(status?.dialogueNickname ?? "");
  }, [status?.dialogueNickname]);

  async function onSave() {
    const nick = value.trim();
    if (!nick) {
      setErr("Informe um nome.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      await updateDialogueNickname(nick);

      await refreshStatus();
      window.dispatchEvent(new Event("onboarding:refresh"));

      // ✅ CANÔNICO: deixa o /start decidir TRIAL vs tutorial vs planos
      router.push("/start");
    } catch (e: any) {
      setErr("Falha ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card p-6 md:p-7 space-y-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Identidade
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Você será reconhecido no diálogo como esse nome.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-zinc-500">
              Créditos:{" "}
              <span className="text-zinc-200 font-medium">
                {status?.creditsBalance ?? "—"}
              </span>
            </div>

            <div className="space-y-2">
              <label className="label" htmlFor="dialogueNickname">
                Seu nome no diálogo
              </label>
              <input
                id="dialogueNickname"
                className="input w-full"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ex.: Assinante"
                disabled={loading}
              />
            </div>

            {err && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {err}
              </div>
            )}

            <button
              className="btn btn-primary w-full"
              onClick={() => void onSave()}
              disabled={loading}
            >
              {loading ? "Salvando…" : "Continuar"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
