// src/app/signup/page.tsx
"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function extractMessage(data: any): string | null {
  return (
    (typeof data?.message === "string" ? data.message : null) ??
    (typeof data?.error === "string" ? data.error : null) ??
    (typeof data?.error?.message === "string" ? data.error.message : null)
  );
}

function sanitizeNext(nextParam: string | null): string {
  const raw = typeof nextParam === "string" ? nextParam.trim() : "";
  if (!raw) return "/signup/nickname";
  if (raw === "/") return "/signup/nickname";

  // allowlist: só permite manter dentro do funil /signup
  if (raw.startsWith("/signup")) return raw;

  // default seguro do funil
  return "/signup/nickname";
}

type Journey = "PAID" | "TRIAL";

function normalizeJourney(v: any): Journey {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "TRIAL") return "TRIAL";
  return "PAID";
}

async function markJourney(journey: Journey) {
  try {
    await fetch("/api/journey/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ journey }),
    }).catch(() => null);
  } catch {
    // silencioso
  }
}

/**
 * =========================================================
 * Tracking (InLead → Hitch) — persistência first-party cookie
 * =========================================================
 */

type HitchTrack = {
  fbclid?: string | null;
  fbc?: string | null;
  fbp?: string | null;

  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  utm_id?: string | null;

  landing_url?: string | null;
  first_seen_at?: number | null;
};

const HITCH_TRACK_COOKIE = "hitch_track";
const HITCH_TRACK_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function safeTrim(v: string | null): string | null {
  const s = (v ?? "").trim();
  return s ? s : null;
}

function getCookie(name: string): string | null {
  try {
    const all = typeof document !== "undefined" ? document.cookie : "";
    if (!all) return null;

    const parts = all.split(";").map((p) => p.trim());
    for (const p of parts) {
      if (p.startsWith(name + "=")) {
        return decodeURIComponent(p.substring(name.length + 1));
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Define Domain= para evitar perda de cookie entre:
 * - hitchai.online  <-> www.hitchai.online (PRD)
 * - hml.hitchai.online <-> www.hml.hitchai.online (HML, se existir)
 */
function resolveCookieDomainAttr(): string {
  try {
    if (typeof window === "undefined") return "";
    const host = window.location.hostname.toLowerCase();

    // PRD: hitchai.online e www.hitchai.online
    if (host === "hitchai.online" || host === "www.hitchai.online") {
      return "; Domain=.hitchai.online";
    }

    // HML (se existir www.hml.hitchai.online)
    if (host === "hml.hitchai.online" || host === "www.hml.hitchai.online") {
      return "; Domain=.hml.hitchai.online";
    }

    return "";
  } catch {
    return "";
  }
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  try {
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";

    const domainAttr = resolveCookieDomainAttr();

    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}${domainAttr}`;
  } catch {
    // silencioso
  }
}

function readHitchTrackCookie(): HitchTrack | null {
  const raw = getCookie(HITCH_TRACK_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as HitchTrack;
    return null;
  } catch {
    return null;
  }
}

function writeHitchTrackCookie(track: HitchTrack) {
  setCookie(
    HITCH_TRACK_COOKIE,
    JSON.stringify(track),
    HITCH_TRACK_MAX_AGE_SECONDS
  );
}

/**
 * Formato padrão do Meta:
 * fbc = fb.1.<timestamp>.<fbclid>
 */
function buildFbcFromFbclid(fbclid: string, nowMs: number): string {
  const ts = Math.floor(nowMs / 1000);
  return `fb.1.${ts}.${fbclid}`;
}

function hasMarketingParams(sp: URLSearchParams | null): boolean {
  if (!sp) return false;
  const keys = [
    "fbclid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_id",
  ];
  return keys.some((k) => {
    const v = sp.get(k);
    return v != null && String(v).trim().length > 0;
  });
}

function stripMarketingParamsKeepingFlowParams(
  sp: URLSearchParams | null
): string {
  // mantém apenas os params do funil (não marketing)
  const keep = new URLSearchParams();

  const next = sp?.get("next");
  const journey = sp?.get("journey");
  const email = sp?.get("email");

  if (next) keep.set("next", next);
  if (journey) keep.set("journey", journey);
  if (email) keep.set("email", email);

  const q = keep.toString();
  return q ? `?${q}` : "";
}

function pickNonNull<T>(
  incoming: T | null | undefined,
  existing: T | null | undefined
): T | null | undefined {
  return incoming != null ? incoming : existing;
}

/**
 * Merge seguro: nunca sobrescreve valor existente com null.
 * Também preserva first_seen_at e landing_url do primeiro toque.
 */
function mergeTrackSafe(
  existing: HitchTrack | null,
  incoming: HitchTrack
): HitchTrack {
  const base: HitchTrack = existing ?? {};

  return {
    fbclid: pickNonNull(incoming.fbclid, base.fbclid) ?? null,
    fbc: pickNonNull(incoming.fbc, base.fbc) ?? null,
    fbp: pickNonNull(incoming.fbp, base.fbp) ?? null,

    utm_source: pickNonNull(incoming.utm_source, base.utm_source) ?? null,
    utm_medium: pickNonNull(incoming.utm_medium, base.utm_medium) ?? null,
    utm_campaign: pickNonNull(incoming.utm_campaign, base.utm_campaign) ?? null,
    utm_content: pickNonNull(incoming.utm_content, base.utm_content) ?? null,
    utm_term: pickNonNull(incoming.utm_term, base.utm_term) ?? null,
    utm_id: pickNonNull(incoming.utm_id, base.utm_id) ?? null,

    // preserva o primeiro
    landing_url: (base.landing_url ?? incoming.landing_url) ?? null,
    first_seen_at: (base.first_seen_at ?? incoming.first_seen_at) ?? null,
  };
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md">
            <div className="card card-premium p-6 md:p-7">
              <div className="text-sm text-zinc-300/80">Carregando…</div>
            </div>
          </div>
        </div>
      }
    >
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextParam = sp?.get("next") ?? null;
  const redirectNext = useMemo(() => sanitizeNext(nextParam), [nextParam]);

  const journeyParam = sp?.get("journey");
  const journey = useMemo(() => normalizeJourney(journeyParam), [journeyParam]);

  useEffect(() => {
    void markJourney(journey);
  }, [journey]);

  /**
   * Tracking capture robusto e persistência em cookie.
   * Importante: não sobrescrever com null após a limpeza da URL.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const now = Date.now();
    const existing = readHitchTrackCookie();

    // leitura robusta do momento atual
    const qs = new URLSearchParams(window.location.search);

    const fbclid = safeTrim(qs.get("fbclid"));
    const utm_source = safeTrim(qs.get("utm_source"));
    const utm_medium = safeTrim(qs.get("utm_medium"));
    const utm_campaign = safeTrim(qs.get("utm_campaign"));
    const utm_content = safeTrim(qs.get("utm_content"));
    const utm_term = safeTrim(qs.get("utm_term"));
    const utm_id = safeTrim(qs.get("utm_id"));

    // lê _fbp se existir (cookie do pixel)
    const fbp = safeTrim(getCookie("_fbp"));

    // só gera fbc quando fbclid existe
    const fbc = fbclid ? buildFbcFromFbclid(fbclid, now) : null;

    const anyMarketing =
      !!fbclid ||
      !!utm_source ||
      !!utm_medium ||
      !!utm_campaign ||
      !!utm_content ||
      !!utm_term ||
      !!utm_id;

    /**
     * Regra anti-wipe:
     * - se NÃO há marketing params agora e já existe cookie, NÃO escreve nada.
     * - evita sobrescrever campos com null após router.replace limpar a URL.
     */
    const shouldWrite = anyMarketing || (!existing && !!fbp);

    if (shouldWrite) {
      const incoming: HitchTrack = {
        fbclid,
        fbc,
        fbp,

        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        utm_id,

        landing_url: window.location.href,
        first_seen_at: now,
      };

      const merged = mergeTrackSafe(existing, incoming);
      writeHitchTrackCookie(merged);
    }

    // limpa URL para não carregar marketing params no funil
    // usa sp (Next) para preservar next/journey/email
    if (sp) {
      const spNative = new URLSearchParams(sp.toString());
      if (hasMarketingParams(spNative)) {
        const kept = stripMarketingParamsKeepingFlowParams(spNative);
        router.replace(`/signup${kept}`);
      }
    }
  }, [sp, router]);

  const [email, setEmail] = useState(sp?.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const authApi = useMemo(() => "/api/auth", []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    const eMail = (email || "").trim();
    if (!eMail) return setError("Informe seu e-mail.");
    if (!password || password.length < 6)
      return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== password2) return setError("As senhas não coincidem.");

    setLoading(true);
    try {
      // guarda para a etapa de OTP
      try {
        sessionStorage.setItem("signup_pending_email", eMail);
        sessionStorage.setItem("signup_pending_password", password);
        sessionStorage.setItem("signup_pending_next", redirectNext);
        sessionStorage.setItem("hitch_journey", journey); // debug/apoio client
      } catch {}

      const res = await fetch(`${authApi}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: eMail, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          extractMessage(data) ||
          "Não foi possível criar sua conta. Tente novamente.";
        setError(msg);
        return;
      }

      setInfo("Código enviado. Redirecionando…");
      router.replace(
        `/signup/verify?email=${encodeURIComponent(
          eMail
        )}&next=${encodeURIComponent(redirectNext)}&journey=${encodeURIComponent(
          journey
        )}`
      );
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="card card-premium p-6 md:p-7">
          <div className="mb-6">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              Criar conta
            </h1>
            <p className="mt-1 text-sm text-zinc-300/80">
              Cadastre-se para continuar.
            </p>
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
                className="input"
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
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="btn-cta w-full" disabled={loading}>
              {loading ? "Criando..." : "Continuar"}
            </button>

            <button
              type="button"
              className="btn w-full"
              onClick={() => router.push("/app/login")}
              disabled={loading}
            >
              Já tenho conta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}