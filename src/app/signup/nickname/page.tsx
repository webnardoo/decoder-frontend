"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

function sanitizeNext(nextParam: string | null): string {
  const raw = typeof nextParam === "string" ? nextParam.trim() : "";
  if (!raw) return "/signup/planos";
  if (raw === "/") return "/signup/planos";

  // allowlist: funil /signup ou checkout do app
  if (raw.startsWith("/signup")) return raw;
  if (raw.startsWith("/app/checkout")) return raw;

  return "/signup/planos";
}

export default function SignupNicknamePage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="card p-6 md:p-7">
              <div className="text-sm text-zinc-400">Carregando…</div>
            </div>
          </div>
        </main>
      }
    >
      <SignupNicknameInner />
    </Suspense>
  );
}

function SignupNicknameInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextParam = sp?.get("next") ?? null;
  const redirectNext = useMemo(() => sanitizeNext(nextParam), [nextParam]);

  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  async function onSave() {
    const nick = value.trim();
    if (!nick) {
      setErr("Informe um nome.");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      // proxy existente no front
      const res = await fetch("/api/onboarding/dialogue-nickname", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ dialogueNickname: nick }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = extractMessage(data) || "Falha ao salvar. Tente novamente.";
        setErr(msg);
        return;
      }

      // depois do nickname, SEMPRE planos
      // se redirectNext já for /signup/planos, mantém; se for /app/checkout, carrega planos primeiro e mantém /app/checkout como next
      const target =
        redirectNext.startsWith("/signup/planos")
          ? redirectNext
          : `/signup/planos?next=${encodeURIComponent(redirectNext)}`;

      router.replace(target);
    } catch {
      setErr("Falha de conexão. Tente novamente.");
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
