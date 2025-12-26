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
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Identidade</h1>
        <p className="text-sm text-zinc-400">Você será reconhecido no diálogo como esse nome.</p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-xs text-zinc-500">
          Créditos: <span className="text-zinc-300">{status?.creditsBalance ?? "—"}</span>
        </div>

        <input
          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Seu nome no diálogo"
        />

        {err && <div className="text-sm text-red-400">{err}</div>}

        <button className="btn btn-primary" onClick={() => void onSave()} disabled={loading}>
          {loading ? "Salvando…" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
