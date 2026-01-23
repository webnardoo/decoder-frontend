"use client";

import React, { useState } from "react";
import Link from "next/link";

function isValidEmail(email: string) {
  const v = (email || "").trim();
  return v.includes("@") && v.includes(".");
}

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const eMail = (email || "").trim();
    if (!eMail) return setError("E-mail é obrigatório.");
    if (!isValidEmail(eMail)) return setError("Informe um e-mail válido.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail }),
      });

      const ct = res.headers.get("content-type") ?? "";
      const body = ct.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => "");

      // ✅ mesmo se der erro, mensagem não deve denunciar “email existe”
      if (!res.ok) {
        const msg = typeof body === "object" ? extractMessage(body) : null;
        // mensagem genérica
        setDone(true);
        setError(msg ? "" : "");
        return;
      }

      setDone(true);
    } catch {
      // conexão: aqui pode avisar, porque não revela existência de conta
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
              Esqueceu sua senha?
            </h1>
            <p className="mt-1 text-sm text-zinc-300/80">
              Informe seu e-mail para receber um link de redefinição.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {done ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha em
                alguns minutos.
              </div>

              <Link className="btn btn-cta w-full" href={`/app/login?email=${encodeURIComponent(email)}`}>
                Voltar para login
              </Link>
            </div>
          ) : (
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
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-cta w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar link"}
              </button>

              <Link className="btn w-full" href="/app/login">
                Voltar para login
              </Link>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
