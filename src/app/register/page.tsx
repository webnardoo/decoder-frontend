"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginResponse = {
  accessToken?: string;
  token?: string;
};

function persistToken(raw: string) {
  const token = String(raw || "").trim();
  if (!token) return;

  try {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("token", token);
    localStorage.setItem("decoder_access_token", token);
  } catch {}

  try {
    document.cookie = `accessToken=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}`;
    document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}`;
  } catch {}
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const emailTrim = email.trim();
      const passTrim = password.trim();

      if (!emailTrim || !passTrim) {
        setError("Preencha email e senha.");
        return;
      }

      // 1) REGISTER via proxy Next
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrim, password: passTrim }),
      });

      const regText = await regRes.text().catch(() => "");
      if (!regRes.ok) throw new Error(regText || "Falha ao criar conta.");

      // 2) LOGIN via proxy Next
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrim, password: passTrim }),
      });

      const loginText = await loginRes.text().catch(() => "");
      if (!loginRes.ok) {
        throw new Error(loginText || "Conta criada, mas falha ao entrar. Faça login.");
      }

      let loginJson: LoginResponse;
      try {
        loginJson = JSON.parse(loginText) as LoginResponse;
      } catch {
        throw new Error("Login não retornou JSON válido.");
      }

      const token = loginJson.accessToken || loginJson.token;
      if (!token) throw new Error("Login não retornou token (accessToken/token).");

      persistToken(token);

      // ✅ 3) Roteador canônico da jornada (decide Nickname → Trial → Planos/Tutorial)
      router.replace("/start");
    } catch (err: any) {
      setError(err?.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Criar conta</h1>
        <p className="text-sm text-zinc-400">
          Cadastre-se para iniciar a jornada do cliente.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-zinc-300">Email</label>
          <input
            className="w-full rounded-xl bg-zinc-900/70 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-zinc-300">Senha</label>
          <input
            className="w-full rounded-xl bg-zinc-900/70 border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            autoComplete="new-password"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <button className="btn btn-primary w-full" disabled={loading} type="submit">
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <div className="text-xs text-zinc-500">
          Ao criar conta, você seguirá para concluir a jornada.
        </div>
      </form>
    </div>
  );
}
