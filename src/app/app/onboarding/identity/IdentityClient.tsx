"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOnboardingStatus } from "@/lib/onboarding/OnboardingStore";

const LOGGED_PLAN = "/app/app/billing/plan";

function sanitizeNext(nextParam: string | null) {
  const raw = typeof nextParam === "string" ? nextParam.trim() : "";

  if (!raw) return LOGGED_PLAN;

  // Nunca mandar para fluxo público após autenticado
  if (raw === "/planos" || raw.startsWith("/planos?")) return LOGGED_PLAN;

  // Se alguém ainda estiver passando a rota antiga, normaliza
  if (raw === "/app/billing/plan" || raw.startsWith("/app/billing/plan?")) return LOGGED_PLAN;

  // Protege loops antigos
  if (raw.startsWith("/app/app")) return LOGGED_PLAN;

  // Aceita apenas rotas internas
  if (!raw.startsWith("/")) return LOGGED_PLAN;

  return raw;
}

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

export default function IdentityClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const { refreshStatus } = useOnboardingStatus();

  const nextParam = sp?.get("next") ?? null;
  const next = sanitizeNext(nextParam);

  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ endpoint local (Next route) que faz proxy pro backend
  const endpoint = useMemo(() => "/api/onboarding/dialogue-nickname", []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const value = nickname.trim();
    if (!value) {
      setError("Digite seu nickname (como você quer aparecer nas análises).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ dialogueNickname: value }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(extractMessage(data) || "Não foi possível salvar seu nickname.");
        return;
      }

      // ✅ Ponto crítico: garante que o guard veja nicknameDefined=true antes do redirect
      await refreshStatus();

      router.replace(next);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card card-premium p-6 md:p-7">
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Escolha seu nickname
            </h1>
            <p className="mt-1 text-sm text-zinc-300/80">
              Esse nome aparece no app e ajuda a personalizar suas análises.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="label" htmlFor="nickname">
                Nickname
              </label>
              <input
                id="nickname"
                className="input"
                placeholder="Ex.: Leo"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>

            <button type="submit" className="btn-cta w-full" disabled={loading}>
              {loading ? "Salvando..." : "Continuar"}
            </button>

            <button
              type="button"
              className="btn w-full"
              onClick={() => router.replace(LOGGED_PLAN)}
              disabled={loading}
            >
              Voltar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
