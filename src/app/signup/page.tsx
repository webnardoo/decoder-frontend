"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
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
  if (!raw) return "/signup/nickname";
  if (raw === "/") return "/signup/nickname";

  // allowlist: só permite manter dentro do funil /signup
  if (raw.startsWith("/signup")) return raw;

  // default seguro do funil
  return "/signup/nickname";
}

type Journey = "PAID" | "TRIAL";

function normalizeJourney(v: any): Journey {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "TRIAL") return "TRIAL";
  return "PAID";
}

async function markJourney(journey: Journey) {
  try {
    await fetch("/api/journey/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ journey }),
    }).catch(() => null);
  } catch {
    // silencioso
  }
}

export default function SignupPage() {
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
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextParam = sp?.get("next") ?? null;
  const redirectNext = useMemo(() => sanitizeNext(nextParam), [nextParam]);

  const journeyParam = sp?.get("journey");
  const journey = useMemo(() => normalizeJourney(journeyParam), [journeyParam]);

  // ✅ /signup é PAID por padrão, mas se vier journey na URL, respeita.
  // ✅ isso só funciona se /api/journey/start setar cookie hitch_journey.
  useEffect(() => {
    void markJourney(journey);
  }, [journey]);

  const [email, setEmail] = useState(sp?.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const authApi = useMemo(() => "/api/auth", []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const eMail = (email || "").trim();
    if (!eMail) return setError("Informe seu e-mail.");
    if (!password || password.length < 6)
      return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== password2) return setError("As senhas não coincidem.");

    setLoading(true);
    try {
      // guarda para a etapa de OTP
      try {
        sessionStorage.setItem("signup_pending_email", eMail);
        sessionStorage.setItem("signup_pending_password", password);
        sessionStorage.setItem("signup_pending_next", redirectNext);
        sessionStorage.setItem("hitch_journey", journey); // debug/apoio client
      } catch {}

      const res = await fetch(`${authApi}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          extractMessage(data) ||
          "Não foi possível criar sua conta. Tente novamente.";
        setError(msg);
        return;
      }

      setInfo("Código enviado. Redirecionando…");
      router.replace(
        `/signup/verify?email=${encodeURIComponent(
          eMail
        )}&next=${encodeURIComponent(redirectNext)}&journey=${encodeURIComponent(
          journey
        )}`
      );
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card card-premium p-6 md:p-7">
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Criar conta
            </h1>
            <p className="mt-1 text-sm text-zinc-300/80">
              Cadastre-se para continuar.
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

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="label" htmlFor="password2">
                Confirmar senha
              </label>
              <input
                id="password2"
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-cta w-full" disabled={loading}>
              {loading ? "Criando..." : "Continuar"}
            </button>

            <button
              type="button"
              className="btn w-full"
              onClick={() => router.push("/app/login")}
              disabled={loading}
            >
              Já tenho conta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
