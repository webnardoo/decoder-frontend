"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function isValidEmail(email: string): boolean {
  const e = (email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// ✅ impede next apontar pro login (loop)
function sanitizeNextForLogin(next: string | null): string {
  const n = (next || "").trim();
  if (!n) return "/app";
  if (n === "/") return "/app";
  if (n === "/app/login" || n.startsWith("/app/login?")) return "/app";
  return n;
}

export default function ForgotPasswordClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const redirectTo = useMemo(() => {
    const next = sp?.get("next");
    return sanitizeNextForLogin(typeof next === "string" ? next : null);
  }, [sp]);

  const prefillEmail = useMemo(() => {
    const raw = sp?.get("email");
    return typeof raw === "string" ? raw.trim().toLowerCase() : "";
  }, [sp]);

  const [email, setEmail] = useState(prefillEmail);
  const [loading, setLoading] = useState(false);

  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setInfo(null);
    setError(null);

    const safeEmail = (email || "").trim().toLowerCase();
    if (!isValidEmail(safeEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      // Backend ainda não existe: resposta genérica (não vaza existência do email)
      await new Promise((r) => setTimeout(r, 450));
      setSent(true);
      setInfo(
        "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha."
      );
    } catch {
      setError("Não foi possível solicitar a redefinição. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function goToLogin() {
    const safeEmail = (email || "").trim().toLowerCase();
    router.replace(
      `/app/login?email=${encodeURIComponent(safeEmail)}&next=${encodeURIComponent(redirectTo)}`
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card card-premium p-6 md:p-7">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
          Esqueceu a senha?
        </h1>
        <p className="mt-1 text-sm text-zinc-300/80">
          Informe seu e-mail para receber o link de redefinição.
        </p>

        {info && (
          <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {info}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            className="input"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || sent}
            required
            autoComplete="email"
          />

          {!sent ? (
            <button type="submit" disabled={loading} className="btn-cta w-full">
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          ) : (
            <button type="button" onClick={goToLogin} className="btn-cta w-full">
              Voltar para entrar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
