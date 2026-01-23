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

// ✅ regra permanente: nicknameDefined OU dialogueNickname preenchido
function hasDialogueNickname(status: any): boolean {
  const byFlag = status?.nicknameDefined === true;
  const byValue =
    typeof status?.dialogueNickname === "string" && status.dialogueNickname.trim().length > 0;
  return byFlag || byValue;
}

function computePaidPostVerifyTarget(status: any): string {
  const subscriptionActive = status?.subscriptionActive === true;
  if (subscriptionActive) return "/app";

  const nickOk = hasDialogueNickname(status);
  if (!nickOk) return "/app/onboarding/identity?next=%2Fapp%2Fbilling%2Fplan";

  return "/app/billing/plan";
}

function readPendingPasswordFromSession(): string {
  try {
    // ✅ compat: PAID antigo e chaves atuais do projeto
    return (
      sessionStorage.getItem("signup_pending_password") ||
      sessionStorage.getItem("decoder_pending_verify_password") ||
      ""
    );
  } catch {
    return "";
  }
}

// ✅ aceita undefined (Next types)
function sanitizeEmail(v: string | null | undefined): string {
  return String(v || "").trim();
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

  // ⚠️ next é preferência, nunca autoridade. Mantemos só para fallback extremo.
  const nextParam = sp?.get("next") ?? null;
  const fallbackNext = useMemo(() => {
    const raw = typeof nextParam === "string" ? nextParam.trim() : "";
    if (!raw) return "/app/billing/plan";
    if (raw === "/") return "/app/billing/plan";
    if (raw.startsWith("/app")) return raw;
    return "/app/billing/plan";
  }, [nextParam]);

  const [email, setEmail] = useState(sanitizeEmail(sp?.get("email")));
  const [code, setCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const eMail = sanitizeEmail(email);
    const otp = String(code || "").trim();

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

      // 2) login automático usando senha pendente
      const pendingPass = readPendingPasswordFromSession().trim();

      if (!pendingPass || pendingPass.length < 6) {
        router.replace(
          `/app/login?email=${encodeURIComponent(eMail)}&next=${encodeURIComponent(
            "/app/billing/plan",
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
          extractMessage(loginData) || "E-mail verificado, mas falha ao entrar. Faça login.";
        setError(msg);
        return;
      }

      // 3) ✅ REGRA PACOTE 4 (PAID): status → decisão → redirect (guard reforça)
      setInfo("E-mail confirmado. Continuando…");

      const stRes = await fetch("/api/onboarding/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const stCt = stRes.headers.get("content-type") ?? "";
      const stBody = stCt.includes("application/json")
        ? await stRes.json().catch(() => null)
        : await stRes.text().catch(() => null);

      if (!stRes.ok || !stBody || typeof stBody !== "object") {
        router.replace(fallbackNext || "/app/billing/plan");
        return;
      }

      const target = computePaidPostVerifyTarget(stBody);
      router.replace(target);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setError("");
    setInfo("");

    const eMail = sanitizeEmail(email);
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
        const msg = extractMessage(data) || "Não foi possível reenviar. Tente novamente.";
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
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Verificar e-mail</h1>
            <p className="mt-1 text-sm text-zinc-300/80">Digite o código que enviamos para seu e-mail.</p>
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

            <button type="button" className="btn w-full" disabled={loading} onClick={() => void onResend()}>
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
