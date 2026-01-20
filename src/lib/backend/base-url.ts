// src/lib/backend/base-url.ts

function isPrd(): boolean {
  const appEnv = String(process.env.APP_ENV || "").trim().toLowerCase();
  const nextPublicAppEnv = String(process.env.NEXT_PUBLIC_APP_ENV || "")
    .trim()
    .toLowerCase();

  const vercelEnv = String(process.env.VERCEL_ENV || "").trim().toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || "").trim().toLowerCase();

  return (
    appEnv === "prd" ||
    nextPublicAppEnv === "prd" ||
    vercelEnv === "production" ||
    nodeEnv === "production"
  );
}

function hasEnv(name: string): boolean {
  const v = (process.env as any)?.[name];
  return typeof v === "string" && v.trim().length > 0;
}

function readEnv(name: string): string {
  return String(((process.env as any)?.[name] as any) ?? "").trim();
}

function stripApiV1(input: string): string {
  let base = String(input || "").trim().replace(/\/+$/, "");
  if (base.endsWith("/api/v1")) base = base.slice(0, -"/api/v1".length);
  return base;
}

/**
 * Snapshot para debug em runtime (Vercel).
 * Não vaza valores sensíveis; só presença/ausência e metadados do deploy.
 */
export function __debugBackendBaseUrlSnapshot() {
  const prd = isPrd();

  const knownKeys = [
    "APP_ENV",
    "NEXT_PUBLIC_APP_ENV",

    // Preferidas por ambiente
    "BACKEND_URL_LOCAL",
    "BACKEND_URL_PRD",

    // Alternativas/legado (mantidas por compatibilidade)
    "NEXT_PUBLIC_API_BASE_URL",
    "NEXT_PUBLIC_API_BASE_URL_LOCAL",
    "NEXT_PUBLIC_API_BASE_URL_PRD",
    "NEXT_PUBLIC_DECODER_BACKEND_BASE_URL",
    "DECODER_BACKEND_BASE_URL",
    "NEXT_PUBLIC_BACKEND_URL",
    "BACKEND_URL",
  ];

  return {
    isPrd: prd,
    APP_ENV: readEnv("APP_ENV") || null,
    NEXT_PUBLIC_APP_ENV: readEnv("NEXT_PUBLIC_APP_ENV") || null,
    VERCEL_ENV: readEnv("VERCEL_ENV") || null,
    NODE_ENV: readEnv("NODE_ENV") || null,

    VERCEL_GIT_COMMIT_SHA: readEnv("VERCEL_GIT_COMMIT_SHA") || null,
    VERCEL_GIT_COMMIT_REF: readEnv("VERCEL_GIT_COMMIT_REF") || null,
    VERCEL_URL: readEnv("VERCEL_URL") || null,
    VERCEL_REGION: readEnv("VERCEL_REGION") || null,

    keys: Object.fromEntries(knownKeys.map((k) => [k, hasEnv(k)])),
  };
}

/**
 * Retorna a BASE do backend (SEM /api/v1), ex:
 * - http://127.0.0.1:4100
 * - https://hitchai-backend-production.up.railway.app
 */
export function getBackendBaseUrl(): string {
  const prd = isPrd();

  // ✅ Seleção por ambiente (isso corrige teu caso)
  const envPicked = prd
    ? readEnv("BACKEND_URL_PRD") ||
      readEnv("NEXT_PUBLIC_API_BASE_URL_PRD") ||
      readEnv("NEXT_PUBLIC_API_BASE_URL") ||
      readEnv("BACKEND_URL")
    : readEnv("BACKEND_URL_LOCAL") ||
      readEnv("NEXT_PUBLIC_API_BASE_URL_LOCAL") ||
      readEnv("NEXT_PUBLIC_API_BASE_URL") ||
      readEnv("BACKEND_URL");

  const base = stripApiV1(envPicked || "http://127.0.0.1:4100");

  if (!base) throw new Error("Backend base URL não definido");

  // ✅ Regra PRD: nunca permitir localhost como BASE
  if (prd && /localhost|127\.0\.0\.1/.test(base)) {
    throw new Error(
      "PRD: Backend base URL inválida (localhost). Verifique envs do Vercel."
    );
  }

  return base;
}
