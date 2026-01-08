"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApiError = { message?: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json().catch(() => null)) as ApiError | null;

      if (!res.ok) {
        setError(String(data?.message || "Falha no login."));
        return;
      }

      router.replace("/conversas");
    } catch (err: any) {
      setError(String(err?.message || "Falha no login."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card p-6">
        <h1 className="title text-lg font-semibold">Entrar</h1>
        <p className="muted mt-1 text-sm">Use seu e-mail e senha para acessar.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <input
            className="input"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="input"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button disabled={loading} className={loading ? "btn w-full opacity-60" : "btn-primary w-full"}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
