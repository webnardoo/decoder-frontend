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
  if (!raw) return "/signup/nickname";
  if (raw === "/") return "/signup/nickname";
  if (raw.startsWith("/signup")) return raw;
  return "/signup/nickname";
}

export default function SignupVerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="card card-premium p-6 md:p-7">
              <div className="text-sm text-zinc-300/80">Carregando…</div>
            </div>
          </div>
        </main>
      }
    >
      <SignupVerifyInner />
    </Suspense>
  );
}

function SignupVerifyInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextParam = sp?.get("next") ?? null;
  const redirectNext = useMemo(() => sanitizeNext(nextParam), [nextParam]);

  const [email, setEmail] = useState(sp?.get("email") ?? "");
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const eMail = (email || "").trim();
    const otp = (code || "").trim();

    if (!eMail) return setError("E-mail é obrigatório.");
    if (!otp) return setError("Código é obrigatório.");

    setLoading(true);
    try {
      // 1) verify otp
      const res = await fetch("/api/auth/verify-email-code", {
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

      // 2) login automático usando password guardado
      const pendingPass =
        (() => {
          try {
            return sessionStorage.getItem("signup_pending_password") || "";
          } catch {
            return "";
          }
        })() || "";

      if (!pendingPass || pendingPass.length < 6) {
        // sem senha em sessão, manda pro login do app
        router.replace(
          `/app/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(
            "/signup/nickname",
          )}`,
        );
        return;
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail, password: pendingPass }),
      });

      const loginData = await loginRes.json().catch(() => ({}));
      if (!loginRes.ok) {
        const msg =
          extractMessage(loginData) ||
          "E-mail verificado, mas falha ao entrar. Faça login.";
        setError(msg);
        return;
      }

      // 3) obrigatório: nickname -> planos -> checkout
      setInfo("E-mail confirmado. Continuando…");

      const safeNext = redirectNext || "/signup/nickname";
      router.replace(
        `/signup/nickname?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(
          safeNext,
        )}`,
      );
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError("");
    setInfo("");

    const eMail = (email || "").trim();
    if (!eMail) return setError("E-mail é obrigatório.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-email-code", {
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
              Verificar e-mail
            </h1>
            <p className="mt-1 text-sm text-zinc-300/80">
              Digite o código que enviamos para seu e-mail.
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

          <form onSubmit={onVerify} className="space-y-4">
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
              onClick={() => void onResend()}
            >
              {loading ? "Reenviando..." : "Reenviar código"}
            </button>

            <button
              type="button"
              className="btn w-full"
              onClick={() => router.push(`/app/login?email=${encodeURIComponent(email || "")}`)}
              disabled={loading}
            >
              Voltar para login
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
