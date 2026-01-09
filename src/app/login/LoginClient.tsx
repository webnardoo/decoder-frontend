// FRONT — src/app/login/LoginClient.tsx
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
    return typeof next === "string" && next.trim() ? next : "/";
  }, [sp]);

  useEffect(() => {
    const prefillEmail = sp.get("email");
    if (prefillEmail && typeof prefillEmail === "string") setEmail(prefillEmail);

    try {
      const last = sessionStorage.getItem("decoder_login_error");
      if (last) {
        setErrorMsg(last);
        sessionStorage.removeItem("decoder_login_error");
      }
    } catch {}

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
        router.replace(redirectTo);
        return;
      }

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
    <>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md card card-premium p-6 md:p-7">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="mt-1 text-sm text-zinc-300/80">
            Use seu e-mail e senha para acessar.
          </p>

          {errorMsg && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <input
              className="input"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              autoComplete="email"
            />

            <input
              className="input"
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              autoComplete="current-password"
            />

            <button type="submit" disabled={loading} className="btn-cta w-full">
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {registerExists && (
              <div className="pt-2 text-center text-sm text-zinc-300/80">
                <a href="/register" className="underline hover:text-zinc-200 transition">
                  Criar conta
                </a>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Fix visual do autofill (Chrome) para manter o padrão escuro do .input */}
      <style jsx global>{`
        input.input:-webkit-autofill,
        input.input:-webkit-autofill:hover,
        input.input:-webkit-autofill:focus,
        textarea.input:-webkit-autofill,
        textarea.input:-webkit-autofill:hover,
        textarea.input:-webkit-autofill:focus,
        select.input:-webkit-autofill,
        select.input:-webkit-autofill:hover,
        select.input:-webkit-autofill:focus {
          -webkit-text-fill-color: rgba(255, 255, 255, 0.92) !important;
          caret-color: rgba(255, 255, 255, 0.92) !important;

          /* força fundo escuro (mesma pegada do register) */
          box-shadow: 0 0 0px 1000px rgba(8, 10, 18, 0.92) inset !important;

          /* evita “flash” claro */
          transition: background-color 99999s ease-in-out 0s !important;
        }
      `}</style>
    </>
  );
}
