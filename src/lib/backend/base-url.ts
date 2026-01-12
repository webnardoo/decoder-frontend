// src/lib/backend/base-url.ts

function isPrd(): boolean {
  const appEnv = String(process.env.APP_ENV || "").trim().toLowerCase();
  const nextPublicAppEnv = String(process.env.NEXT_PUBLIC_APP_ENV || "")
    .trim()
    .toLowerCase();

  // Vercel define VERCEL_ENV=production em PRD
  const vercelEnv = String(process.env.VERCEL_ENV || "").trim().toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || "").trim().toLowerCase();

  return (
    appEnv === "prd" ||
    nextPublicAppEnv === "prd" ||
    vercelEnv === "production" ||
    nodeEnv === "production"
  );
}

/**
 * Retorna a BASE do backend (SEM /api/v1), ex:
 * - http://127.0.0.1:4100
 * - https://hitchai-backend-production.up.railway.app
 */
export function getBackendBaseUrl(): string {
  // Ordem: preferir variáveis que você já tem no Vercel
  const raw =
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL_PRD ||
    process.env.NEXT_PUBLIC_API_BASE_URL_PRD ||
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.BACKEND_URL_LOCAL ||
    process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL ||
    "http://127.0.0.1:4100";

  let base = String(raw || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("Backend base URL não definido");

  // Se vier com /api/v1, remove (helper devolve BASE sem /api/v1)
  if (base.endsWith("/api/v1")) base = base.slice(0, -"/api/v1".length);

  // ✅ Regra PRD: nunca permitir localhost como BASE
  if (isPrd() && /localhost|127\.0\.0\.1/.test(base)) {
    throw new Error(
      "PRD: Backend base URL inválida (localhost). Verifique envs do Vercel."
    );
  }

  return base;
}
