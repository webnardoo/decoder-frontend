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
      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6">
        <h1 className="text-lg font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-zinc-400">Use seu e-mail e senha para acessar.</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <input
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-700"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-700"
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button
            disabled={loading}
            className={`w-full rounded-xl px-4 py-2 text-sm font-semibold ${
              loading ? "bg-zinc-800 text-zinc-400" : "bg-white text-black hover:bg-zinc-100"
            }`}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
