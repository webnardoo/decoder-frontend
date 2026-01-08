// FRONT — src/app/register/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type RegisterStep = "FORM" | "CODE" | "DONE";

function getBackendBaseUrl() {
  // Client-side
  return (
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_HITCH_BACKEND_BASE_URL ||
    "http://localhost:4100"
  );
}

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  const verifyMode = sp.get("verify") === "1";
  const nextParam = sp.get("next");
  const redirectNext =
    typeof nextParam === "string" && nextParam.trim() ? nextParam : "/start";

  const [step, setStep] = useState<RegisterStep>(verifyMode ? "CODE" : "FORM");
  const [email, setEmail] = useState(sp.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  useEffect(() => {
    // Se veio do login, tenta recuperar senha pra auto-login após validar OTP
    if (verifyMode) {
      try {
        const pendingEmail = sessionStorage.getItem("decoder_pending_verify_email") || "";
        const pendingPass = sessionStorage.getItem("decoder_pending_verify_password") || "";
        const pendingNext = sessionStorage.getItem("decoder_pending_verify_next") || "";

        if (!email && pendingEmail) setEmail(pendingEmail);
        if (!password && pendingPass) setPassword(pendingPass);

        if (pendingNext && pendingNext.trim()) {
          // se o next do query não veio, mantém o do storage (não sobrescreve query)
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function registerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const eMail = (email || "").trim();
    if (!eMail) return setError("Informe seu e-mail.");
    if (!password || password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== password2) return setError("As senhas não coincidem.");

    setLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = extractMessage(data) || "Não foi possível criar sua conta. Tente novamente.";
        setError(msg);
        return;
      }

      setInfo("Código enviado para seu e-mail. Digite abaixo para confirmar.");
      setStep("CODE");
    } catch {
      setError("Falha de conexão. Verifique o backend e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const eMail = (email || "").trim();
    const otp = (code || "").trim();

    if (!eMail) return setError("E-mail é obrigatório.");
    if (!otp) return setError("Código é obrigatório.");

    setLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/api/v1/auth/verify-email-code`, {
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

      // ✅ Email verificado no BACK
      setInfo("E-mail verificado. Entrando…");

      // tenta auto-login (se temos senha do fluxo atual OU recuperada do sessionStorage)
      const pass = password || "";

      if (pass && pass.length >= 6) {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ email: eMail, password: pass }),
        });

        const loginData = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok) {
          const msg = extractMessage(loginData) || "E-mail verificado, mas falha ao entrar. Faça login.";
          // guarda erro pra tela de login exibir
          try {
            sessionStorage.setItem("decoder_login_error", msg);
          } catch {}
          router.replace(`/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(redirectNext)}`);
          return;
        }

        // limpa pendências
        try {
          sessionStorage.removeItem("decoder_pending_verify_email");
          sessionStorage.removeItem("decoder_pending_verify_password");
          sessionStorage.removeItem("decoder_pending_verify_next");
        } catch {}

        setStep("DONE");
        router.replace(redirectNext);
        return;
      }

      // sem senha -> manda pro login
      router.replace(`/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(redirectNext)}`);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setError("");
    setInfo("");

    const eMail = (email || "").trim();
    if (!eMail) return setError("E-mail é obrigatório.");

    setLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/api/v1/auth/resend-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = extractMessage(data) || "Não foi possível reenviar. Tente novamente.";
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
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="card p-6 md:p-7">
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
            <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {info}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
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
                  className="input w-full"
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
                  className="input w-full"
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
                  className="input w-full"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar conta"}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => router.push("/login")}
                  disabled={loading}
                >
                  Já tenho conta
                </button>
              </div>
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
                  className="input w-full"
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
                  className="input w-full"
                  inputMode="numeric"
                  placeholder="Digite o código"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? "Validando..." : "Validar código"}
              </button>

              <button type="button" className="btn w-full" disabled={loading} onClick={resendCode}>
                {loading ? "Reenviando..." : "Reenviar código"}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  className="btn w-full"
                  onClick={() => router.push(`/login?email=${encodeURIComponent(email || "")}`)}
                  disabled={loading}
                >
                  Voltar para login
                </button>
              </div>
            </form>
          )}

          {step === "DONE" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Conta confirmada. Vamos continuar.
              </div>
              <button className="btn btn-primary w-full" onClick={() => router.replace(redirectNext)}>
                Continuar
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-400/70 text-center">
          Backend atual:{" "}
          <span className="font-medium text-zinc-200/80">{backendBaseUrl}</span>
        </p>
      </div>
    </main>
  );
}
