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

function sanitizeNext(nextParam: string | null): string {
  const raw = typeof nextParam === "string" ? nextParam.trim() : "";
  if (!raw) return "/planos";

  // bloqueia home mkt
  if (raw === "/" || raw === "/app") return "/planos";

  // aqui aceitamos apenas rotas públicas seguras desta jornada
  // (planos e checkout do app serão re-roteados depois de login)
  if (raw.startsWith("/planos")) return raw;

  return "/planos";
}

export default function RegisterOtpClient() {
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
        <RegisterOtpInner />
      </div>
    </Suspense>
  );
}

function RegisterOtpInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextParam = sp?.get("next") ?? null;
  const redirectNext = sanitizeNext(nextParam);

  const presetEmail = (sp?.get("email") ?? "").trim();

  const [step, setStep] = useState<RegisterStep>(presetEmail ? "FORM" : "FORM");
  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const authApi = useMemo(() => "/api/auth", []);

  useEffect(() => {
    // mantém email preenchido quando vindo de /planos
    if (presetEmail && !email) setEmail(presetEmail);
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
      // persistir para o verify (se usuário der refresh)
      try {
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

    const eMail = (email || "").trim();
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

      // login automático para ganhar cookie e seguir pra checkout depois
      const pass =
        password ||
        ((): string => {
          try {
            return sessionStorage.getItem("decoder_pending_verify_password") || "";
          } catch {
            return "";
          }
        })();

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
              "/planos",
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

        // ✅ regra desta jornada: após verify -> voltar para /planos
        router.replace(redirectNext || "/planos");
        return;
      }

      // fallback seguro
      router.replace(
        `/app/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(
          "/planos",
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

    const eMail = (email || "").trim();
    if (!eMail) return setError("E-mail é obrigatório.");

    setLoading(true);
    try {
      const res = await fetch(`${authApi}/resend-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail }),
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
                : "Crie sua conta para continuar com a assinatura."}
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
                onClick={() => void resendCode()}
              >
                {loading ? "Reenviando..." : "Reenviar código"}
              </button>

              <button
                type="button"
                className="btn w-full"
                onClick={() => router.push(`/planos`)}
                disabled={loading}
              >
                Voltar para planos
              </button>
            </form>
          )}

          {step === "DONE" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Conta confirmada. Redirecionando…
              </div>
              <button className="btn-cta w-full" onClick={() => router.replace("/planos")}>
                Ir para planos
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
