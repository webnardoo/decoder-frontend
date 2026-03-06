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

  if (raw.startsWith("/signup")) return raw;

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

function resolveCookieDomainAttr(): string {
  try {
    if (typeof window === "undefined") return "";
    const host = window.location.hostname.toLowerCase();

    if (host === "hitchai.online" || host === "www.hitchai.online") {
      return "; Domain=.hitchai.online";
    }

    if (host === "hml.hitchai.online" || host === "www.hml.hitchai.online") {
      return "; Domain=.hml.hitchai.online";
    }

    return "";
  } catch {
    return "";
  }
}

function deleteHostOnlyCookie(name: string) {
  try {
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";

    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  } catch {
    // silencioso
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

    if (domainAttr) {
      deleteHostOnlyCookie(name);
    }
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

function buildFbcFromFbclid(fbclid: string, nowMs: number): string {
  const ts = Math.floor(nowMs / 1000);
  return `fb.1.${ts}.${fbclid}`;
}

function hasMarketingParams(sp: URLSearchParams | null): boolean {
  if (!sp) return false;
  const keys = [
    "fbclid",
    "fbc",
    "fbp",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "utm_id",
    "src_url",
    "landing_url",
  ];
  return keys.some((k) => {
    const v = sp.get(k);
    return v != null && String(v).trim().length > 0;
  });
}

function stripMarketingParamsKeepingFlowParams(
  sp: URLSearchParams | null
): string {
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

function isHitchSignupUrl(v: string | null | undefined): boolean {
  const s = safeTrim(v ?? null);
  if (!s) return false;

  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    const isHitchHost =
      host === "hitchai.online" ||
      host === "www.hitchai.online" ||
      host === "hml.hitchai.online" ||
      host === "www.hml.hitchai.online";

    return isHitchHost && path.startsWith("/signup");
  } catch {
    return false;
  }
}

function chooseLandingUrl(
  existing: string | null | undefined,
  incoming: string | null | undefined
): string | null {
  const ex = safeTrim(existing ?? null);
  const inc = safeTrim(incoming ?? null);

  if (!ex && !inc) return null;
  if (!ex && inc) return inc;
  if (ex && !inc) return ex;

  // se o existente é ruim (/signup do próprio Hitch) e o incoming é externo/correto, substitui
  if (isHitchSignupUrl(ex) && inc && !isHitchSignupUrl(inc)) {
    return inc;
  }

  // se ambos existem, preserva o primeiro bom
  return ex ?? inc ?? null;
}

/**
 * Merge seguro:
 * - nunca sobrescreve campos válidos com null
 * - preserva first_seen_at
 * - corrige landing_url quando o cookie antigo guardou /signup do Hitch
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

    landing_url: chooseLandingUrl(base.landing_url, incoming.landing_url),
    first_seen_at: (base.first_seen_at ?? incoming.first_seen_at) ?? null,
  };
}

function resolveLandingUrlFromSignup(
  qs: URLSearchParams,
  existing: HitchTrack | null
): string | null {
  const srcUrl = safeTrim(qs.get("src_url"));
  if (srcUrl) return srcUrl;

  const landingUrl = safeTrim(qs.get("landing_url"));
  if (landingUrl) return landingUrl;

  const existingLanding = safeTrim(existing?.landing_url ?? null);
  if (existingLanding && !isHitchSignupUrl(existingLanding)) {
    return existingLanding;
  }

  if (typeof document !== "undefined") {
    const ref = safeTrim(document.referrer);
    if (ref) return ref;
  }

  return null;
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const now = Date.now();
    const existing = readHitchTrackCookie();
    const qs = new URLSearchParams(window.location.search);

    const fbclid = safeTrim(qs.get("fbclid"));
    const utm_source = safeTrim(qs.get("utm_source"));
    const utm_medium = safeTrim(qs.get("utm_medium"));
    const utm_campaign = safeTrim(qs.get("utm_campaign"));
    const utm_content = safeTrim(qs.get("utm_content"));
    const utm_term = safeTrim(qs.get("utm_term"));
    const utm_id = safeTrim(qs.get("utm_id"));

    const fbp = safeTrim(qs.get("fbp")) ?? safeTrim(getCookie("_fbp"));
    const fbc =
      safeTrim(qs.get("fbc")) ??
      (fbclid ? buildFbcFromFbclid(fbclid, now) : null);

    const resolvedLandingUrl = resolveLandingUrlFromSignup(qs, existing);

    const anyMarketing =
      !!fbclid ||
      !!fbp ||
      !!fbc ||
      !!utm_source ||
      !!utm_medium ||
      !!utm_campaign ||
      !!utm_content ||
      !!utm_term ||
      !!utm_id ||
      !!resolvedLandingUrl;

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

        landing_url: resolvedLandingUrl,
        first_seen_at: now,
      };

      const merged = mergeTrackSafe(existing, incoming);
      writeHitchTrackCookie(merged);
    }

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
      try {
        sessionStorage.setItem("signup_pending_email", eMail);
        sessionStorage.setItem("signup_pending_password", password);
        sessionStorage.setItem("signup_pending_next", redirectNext);
        sessionStorage.setItem("hitch_journey", journey);
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