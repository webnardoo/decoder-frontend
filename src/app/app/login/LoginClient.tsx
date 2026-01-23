"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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

export const dynamic = "force-dynamic";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const presetEmail = useMemo(() => {
    try {
      const e = sp?.get("email") ?? "";
      return (e || "").trim();
    } catch {
      return "";
    }
  }, [sp]);

  const nextPath = useMemo(() => {
    try {
      const n = sp?.get("next") ?? "";
      return (n || "").trim();
    } catch {
      return "";
    }
  }, [sp]);

  const [email, setEmail] = useState(presetEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const eMail = (email || "").trim();
    if (!eMail) return setError("E-mail é obrigatório.");
    if (!isValidEmail(eMail)) return setError("Informe um e-mail válido.");
    if (!password) return setError("Senha é obrigatória.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail, password }),
      });

      const ct = res.headers.get("content-type") ?? "";
      const body = ct.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => "");

      if (!res.ok) {
        const msg = typeof body === "object" ? extractMessage(body) : null;
        setError(msg || "Falha ao entrar. Tente novamente.");
        return;
      }

      // pós-login: respeita next se existir, senão vai pro home do app
      const dest = nextPath || "/app";
      router.replace(dest);
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
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Entrar</h1>
            <p className="mt-1 text-sm text-zinc-300/80">Use seu e-mail e senha para acessar.</p>
          </div>

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
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-end">
              <Link className="text-sm text-zinc-300/80 hover:text-zinc-100" href="/forgot-password">
                Esqueceu a senha?
              </Link>
            </div>

            <button type="submit" className="btn-cta w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <div className="pt-1 text-center">
              <Link className="text-sm text-zinc-300/80 hover:text-zinc-100" href="/app/register">
                Criar conta
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
