"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const APP_HOME = "/app";

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

function normalizeJourney(v: any): "PAID" | "TRIAL" | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "PAID") return "PAID";
  if (s === "TRIAL") return "TRIAL";
  return null;
}

function hasNickname(status: any): boolean {
  const byFlag = status?.nicknameDefined === true;
  const byValue =
    typeof status?.dialogueNickname === "string" && status.dialogueNickname.trim().length > 0;
  return byFlag || byValue;
}

function resolveNextAfterNickname(status: any, nextParam: string | null): string {
  const journey = normalizeJourney(status?.journey);
  const stage = String(status?.onboardingStage || "").toUpperCase().trim();

  // TRIAL: planos só depois da análise guiada, não aqui
  if (journey === "TRIAL") return APP_HOME;

  const raw = (nextParam || "").trim();
  if (raw && raw.startsWith("/app") && !raw.startsWith("/app/onboarding/identity")) return raw;

  if (stage === "PLAN_SELECTION_REQUIRED") return "/planos";

  return APP_HOME;
}

async function fetchOnboardingStatus(): Promise<any | null> {
  try {
    const res = await fetch("/api/onboarding/status", { method: "GET", cache: "no-store" });
    if (!res.ok) return { __httpStatus: res.status };

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return null;

    const data = await res.json().catch(() => null);
    return data;
  } catch {
    return null;
  }
}

export default function IdentityClient() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="card card-premium p-6 md:p-7">
              <div className="text-sm text-zinc-300/80">Carregando…</div>
            </div>
          </div>
        </div>
      }
    >
      <IdentityInner />
    </Suspense>
  );
}

function IdentityInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextParam = sp?.get("next") ?? null;

  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // proxy do Next → backend
  const apiUrl = useMemo(() => "/api/onboarding/dialogue-nickname", []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setBootLoading(true);
      const status = await fetchOnboardingStatus();
      if (!alive) return;

      const http = Number(status?.__httpStatus || 0);
      if (http === 401 || http === 403) {
        setBootLoading(false);
        router.replace("/app/login");
        return;
      }

      if (status && hasNickname(status)) {
        const target = resolveNextAfterNickname(status, nextParam);
        router.replace(target);
        return;
      }

      setBootLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, nextParam]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const value = (nickname || "").trim();
    if (!value) {
      setError("Informe seu nome/apelido.");
      return;
    }

    setLoading(true);
    try {
      // backend aceita PATCH (POST pode dar 404)
      const res = await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ dialogueNickname: value }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = extractMessage(data) || "Não foi possível salvar seu nome. Tente novamente.";
        setError(msg);
        return;
      }

      setInfo("Salvo. Continuando…");

      // ✅ evita loop por store/stale: navegação HARD para o destino final
      const status = await fetchOnboardingStatus();
      const target = resolveNextAfterNickname(status, nextParam);

      window.location.assign(target);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (bootLoading) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="card card-premium p-6 md:p-7">
            <div className="text-sm text-zinc-300/80">Carregando…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card card-premium p-6 md:p-7">
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Como você quer aparecer nas análises?
            </h1>
            <p className="mt-1 text-sm text-zinc-300/80">
              Esse nome entra no diálogo como “VOCÊ (seu nome)”.
            </p>
          </div>

          {info && (
            <div className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {info}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="label" htmlFor="nickname">
                Seu nome/apelido
              </label>
              <input
                id="nickname"
                className="input"
                placeholder="Ex.: Leo"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-cta w-full" disabled={loading}>
              {loading ? "Salvando..." : "Continuar"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
