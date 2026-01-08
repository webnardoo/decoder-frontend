// FRONT — src/app/register/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RegisterStep = "FORM" | "DONE";

function getBackendBaseUrl() {
  // Prioridade: env público (client-side)
  return (
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_HITCH_BACKEND_BASE_URL ||
    "http://localhost:4100"
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  const [step, setStep] = useState<RegisterStep>("FORM");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const eMail = email.trim();
    if (!eMail) return setError("Informe seu e-mail.");
    if (!password || password.length < 6)
      return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== password2) return setError("As senhas não coincidem.");

    setLoading(true);
    try {
      const res = await fetch(`${backendBaseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // compatível com formatos comuns de backend
        body: JSON.stringify({ email: eMail, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message ||
          data?.error ||
          "Não foi possível criar sua conta. Tente novamente.";
        setError(typeof msg === "string" ? msg : "Erro ao criar conta.");
        return;
      }

      setStep("DONE");
      // Fluxo típico: após registro, ir para start/onboarding (verificação/degustação)
      router.push("/start");
    } catch {
      setError("Falha de conexão. Verifique o backend e tente novamente.");
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
              Criar conta
            </h1>
            <p className="mt-1 text-sm text-zinc-300/80">
              Comece sua jornada no Hitch com seu e-mail e senha.
            </p>
          </div>

          {step === "FORM" && (
            <form onSubmit={onSubmit} className="space-y-4">
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

              {error && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
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

          {step === "DONE" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Conta criada. Vamos continuar.
              </div>
              <button
                className="btn btn-primary w-full"
                onClick={() => router.push("/start")}
              >
                Ir para início
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-400/70 text-center">
          Dica: se der erro 404/500, confirme se o backend está em{" "}
          <span className="font-medium text-zinc-200/80">
            {backendBaseUrl}
          </span>
          .
        </p>
      </div>
    </main>
  );
}
