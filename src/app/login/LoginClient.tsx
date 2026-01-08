"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

function isEmailNotVerified(msg: string | null): boolean {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("email not verified") ||
    m.includes("e-mail não verificado") ||
    m.includes("email não verificado") ||
    m.includes("email_not_verified") ||
    m.includes("not verified")
  );
}

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registerExists, setRegisterExists] = useState(false);

  const redirectTo = useMemo(() => {
    const next = sp.get("next");
    return typeof next === "string" && next.trim() ? next : "/conversas";
  }, [sp]);

  useEffect(() => {
    // prefill opcional
    const prefillEmail = sp.get("email");
    if (prefillEmail && typeof prefillEmail === "string") setEmail(prefillEmail);

    // Limpa erro antigo persistido
    try {
      const last = sessionStorage.getItem("decoder_login_error");
      if (last) {
        setErrorMsg(last);
        sessionStorage.removeItem("decoder_login_error");
      }
    } catch {}

    // Probe de registro
    (async () => {
      try {
        const res = await fetch("/api/auth/register/exists", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        setRegisterExists(Boolean(data?.exists));
      } catch {
        setRegisterExists(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const safeEmail = (email || "").trim();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: safeEmail, password }),
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);
      const backendMsg = extractMessage(data);

      if (res.ok) {
        // ✅ Cookie HttpOnly já foi setado pela API Route
        router.replace(redirectTo);
        return;
      }

      // 🔒 Caso novo: email não verificado -> manda pro fluxo OTP
      if (isEmailNotVerified(backendMsg)) {
        try {
          sessionStorage.setItem("decoder_pending_verify_email", safeEmail);
          sessionStorage.setItem("decoder_pending_verify_password", password);
          sessionStorage.setItem("decoder_pending_verify_next", redirectTo);
        } catch {}

        const nextQ = encodeURIComponent(redirectTo);
        const emailQ = encodeURIComponent(safeEmail);
        router.replace(`/register?verify=1&email=${emailQ}&next=${nextQ}`);
        return;
      }

      if (res.status === 401) {
        setErrorMsg(backendMsg ?? "Não autorizado.");
        setLoading(false);
        return;
      }

      if (res.status === 429) {
        setErrorMsg(backendMsg ?? "Muitas requisições.");
        setLoading(false);
        return;
      }

      if (res.status >= 500) {
        setErrorMsg(backendMsg ?? "Falha técnica ao autenticar. Tente novamente.");
        setLoading(false);
        return;
      }

      setErrorMsg(backendMsg ?? "Falha ao autenticar.");
      setLoading(false);
    } catch {
      setErrorMsg("Não foi possível conectar ao servidor.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <p className="mt-1 text-sm text-white/70">Use seu e-mail e senha para acessar.</p>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />

          <input
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-2 text-black disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          {registerExists && (
            <div className="pt-2 text-center text-sm text-white/70">
              <a href="/register" className="underline">
                Criar conta
              </a>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
