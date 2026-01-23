"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type RegisterStep = "FORM" | "CODE" | "DONE";

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

/**
 * ✅ REGRA DE NEGÓCIO (confirmada por você):
 * Entradas:
 * 1) Assinar (Home MKT) => jornada PAID => Planos públicos (/planos)
 * 2) /signup => jornada PAID => Planos públicos (/planos)
 * 3) /register => jornada TRIAL
 */
function routeForStage(stage: string, journey?: string | null): string {
  const s = String(stage || "").toUpperCase().trim();
  const j = String(journey || "").toUpperCase().trim();

  if (s === "READY") return "/app";

  // =========================
  // BILLING
  // =========================
  // ✅ PAID + PLAN_SELECTION_REQUIRED => página pública de planos
  // ✅ TRIAL nunca deve cair em billing; volta pro app (degustação guiada mora no /app)
  if (s === "PLAN_SELECTION_REQUIRED") {
    if (j === "PAID") return "/planos";
    if (j === "TRIAL") return "/app";
    return "/app/billing/plan";
  }

  // (mantém compat)
  if (s === "PAYMENT_REQUIRED") {
    if (j === "PAID") return "/planos";
    if (j === "TRIAL") return "/app";
    return "/app/billing/plan";
  }

  if (s === "PAYMENT_PENDING") return "/app/billing/pending";
  if (s === "PAYMENT_FAILED") return "/app/billing/failed";

  // Identity
  if (s === "NICKNAME_REQUIRED") return "/app/onboarding/identity";
  if (s === "IDENTITY_REQUIRED") return "/app/onboarding/identity";

  // Tutorial
  if (s === "TUTORIAL_REQUIRED") return "/app/tutorial";

  // Fallback seguro
  return "/app";
}

async function safeGetOnboardingTarget(): Promise<string | null> {
  try {
    const res = await fetch("/api/onboarding/status", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return "/app";

    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return "/app";

    const stage = String(data?.onboardingStage || "").trim();
    const journey = typeof data?.journey === "string" ? data.journey : null;

    return routeForStage(stage, journey);
  } catch {
    return "/app";
  }
}

function sanitizeNext(nextParam: string | null): string {
  const raw = typeof nextParam === "string" ? nextParam.trim() : "";
  if (!raw) return "/app";

  // bloqueia explicitamente home MKT
  if (raw === "/") return "/app";

  // só aceitamos navegação interna do app
  if (!raw.startsWith("/app")) return "/app";

  return raw;
}

async function markJourneyTrial() {
  try {
    await fetch("/api/journey/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ journey: "TRIAL" }),
    }).catch(() => null);
  } catch {
    // silencioso
  }
}

function readPendingFromSessionStorage() {
  try {
    const pendingEmail = sessionStorage.getItem("decoder_pending_verify_email") || "";
    const pendingPass = sessionStorage.getItem("decoder_pending_verify_password") || "";
    const pendingNext = sessionStorage.getItem("decoder_pending_verify_next") || "";
    return { pendingEmail, pendingPass, pendingNext };
  } catch {
    return { pendingEmail: "", pendingPass: "", pendingNext: "" };
  }
}

export default function RegisterPage() {
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
      <div className="flex flex-1 items-center justify-center px-4">
        <RegisterPageInner />
      </div>
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // ✅ /register é TRIAL (sempre)
  useEffect(() => {
    void markJourneyTrial();
  }, []);

  const verifyMode = (sp?.get("verify") ?? "") === "1";
  const nextParam = sp?.get("next") ?? null;

  // ✅ Nunca permitir next apontar para "/" (home MKT) ou fora de "/app"
  const redirectNext = sanitizeNext(nextParam);

  const [step, setStep] = useState<RegisterStep>(verifyMode ? "CODE" : "FORM");
  const [email, setEmail] = useState(sp?.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const authApi = useMemo(() => "/api/auth", []);

  useEffect(() => {
    if (!verifyMode) return;

    const { pendingEmail, pendingPass } = readPendingFromSessionStorage();

    if (!email && pendingEmail) setEmail(pendingEmail);

    // ✅ CRÍTICO: garante password no state para permitir auto-login após OTP
    if (!password && pendingPass) setPassword(pendingPass);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function registerSubmit(e: React.FormEvent) {
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
      try {
        // ✅ persiste para auto-login no passo OTP (mesmo em verifyMode/refresh)
        sessionStorage.setItem("decoder_pending_verify_email", eMail);
        sessionStorage.setItem("decoder_pending_verify_password", password);
        sessionStorage.setItem("decoder_pending_verify_next", redirectNext);
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

      setInfo("Código enviado para seu e-mail. Digite abaixo para confirmar.");
      setStep("CODE");
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    // ✅ sempre tenta resgatar do sessionStorage para não perder no verifyMode
    const { pendingEmail, pendingPass, pendingNext } = readPendingFromSessionStorage();

    const eMail = ((email || "").trim() || pendingEmail || "").trim();
    const otp = (code || "").trim();

    if (!eMail) return setError("E-mail é obrigatório.");
    if (!otp) return setError("Código é obrigatório.");

    setLoading(true);
    try {
      const res = await fetch(`${authApi}/verify-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail, code: otp }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = extractMessage(data) || "Código inválido. Tente novamente.";
        setError(msg);
        return;
      }

      setInfo("E-mail verificado. Entrando…");

      // ✅ CRÍTICO: força auto-login usando pendingPass quando necessário
      const pass = (password || pendingPass || "").trim();
      const nextToUse = sanitizeNext(pendingNext || redirectNext);

      if (pass && pass.length >= 6) {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ email: eMail, password: pass }),
        });

        const loginData = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok) {
          const msg =
            extractMessage(loginData) ||
            "E-mail verificado, mas falha ao entrar. Faça login.";
          try {
            sessionStorage.setItem("decoder_login_error", msg);
          } catch {}

          router.replace(
            `/app/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(
              nextToUse,
            )}`,
          );
          return;
        }

        try {
          sessionStorage.removeItem("decoder_pending_verify_email");
          sessionStorage.removeItem("decoder_pending_verify_password");
          sessionStorage.removeItem("decoder_pending_verify_next");
        } catch {}

        setStep("DONE");

        // ✅ Com sessão válida, agora decide onboarding corretamente (nickname primeiro)
        const target = await safeGetOnboardingTarget();

        if (target && target !== "/app") {
          router.replace(target);
          return;
        }

        router.replace(nextToUse || "/app");
        return;
      }

      // Se não temos senha suficiente, cai pra login (mas agora isso só ocorre em caso extremo)
      router.replace(
        `/app/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(
          nextToUse,
        )}`,
      );
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

async function resendCode() {
  setError("");
  setInfo("");

  const { pendingPass } = readPendingFromSessionStorage();

  const eMail = (email || "").trim();
  const pass = (password || pendingPass || "").trim();

  if (!eMail) return setError("E-mail é obrigatório.");

  // se backend exige password, não tenta sem
  if (!pass || pass.length < 6) {
    return setError("Para reenviar o código, informe a senha novamente.");
  }

  setLoading(true);
  try {
    const res = await fetch(`${authApi}/resend-email-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email: eMail, password: pass }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        extractMessage(data) || "Não foi possível reenviar. Tente novamente.";
      setError(msg);
      return;
    }

    setInfo("Novo código enviado. Verifique seu e-mail.");
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
              {step === "CODE" ? "Verificar e-mail" : "Criar conta"}
            </h1>
            <p className="mt-1 text-sm text-zinc-300/80">
              {step === "CODE"
                ? "Digite o código que enviamos para seu e-mail."
                : "Comece sua jornada no Hitch com seu e-mail e senha."}
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

          {step === "FORM" && (
            <form onSubmit={registerSubmit} className="space-y-4">
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
                {loading ? "Criando..." : "Criar conta"}
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
          )}

          {step === "CODE" && (
            <form onSubmit={verifyCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="label" htmlFor="email2">
                  E-mail
                </label>
                <input
                  id="email2"
                  className="input"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="label" htmlFor="code">
                  Código
                </label>
                <input
                  id="code"
                  className="input"
                  inputMode="numeric"
                  placeholder="Digite o código"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-cta w-full" disabled={loading}>
                {loading ? "Validando..." : "Validar código"}
              </button>

              <button
                type="button"
                className="btn w-full"
                disabled={loading}
                onClick={resendCode}
              >
                {loading ? "Reenviando..." : "Reenviar código"}
              </button>

              <button
                type="button"
                className="btn w-full"
                onClick={() =>
                  router.push(`/app/login?email=${encodeURIComponent(email || "")}`)
                }
                disabled={loading}
              >
                Voltar para login
              </button>
            </form>
          )}

          {step === "DONE" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Conta confirmada. Vamos continuar.
              </div>
              <button className="btn-cta w-full" onClick={() => router.replace("/app")}>
                Continuar
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
