// src/lib/api/baseUrl.ts
import { getBackendBaseUrl } from "@/lib/backend/base-url";

function isBrowser() {
  return typeof window !== "undefined";
}

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

/**
 * Retorna a BASE da API (COM /api/v1), ex:
 * - http://127.0.0.1:4100/api/v1
 * - https://hitchai-backend-production.up.railway.app/api/v1
 *
 * Regra:
 * - PRD: proibido localhost (se env não estiver correta, lança erro).
 * - Local: pode cair em localhost.
 */
export function getApiBaseUrl(): string {
  // Sempre deriva da BASE do backend, e adiciona /api/v1
  const backendBase = getBackendBaseUrl().replace(/\/+$/, "");

  // Se alguém já setou uma env COM /api/v1, respeita (mas valida PRD)
  const explicit =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL_PRD ||
    "";

  const raw = String(explicit || "").trim().replace(/\/+$/, "");
  let apiBase = raw || `${backendBase}/api/v1`;

  // Normaliza: se ficou sem /api/v1, adiciona
  if (!apiBase.endsWith("/api/v1")) apiBase = `${apiBase}/api/v1`;

  // ✅ Regra PRD: nunca permitir localhost como API
  if (isPrd() && /localhost|127\.0\.0\.1/.test(apiBase)) {
    throw new Error(
      "PRD: API base URL inválida (localhost). Verifique envs do Vercel."
    );
  }

  // No browser em PRD, essa função NÃO deveria ser usada pra montar URL absoluta.
  // Mesmo assim, protege.
  if (isBrowser() && isPrd() && /localhost|127\.0\.0\.1/.test(apiBase)) {
    throw new Error(
      "PRD (browser): tentativa de usar API base localhost. Use proxy /api do Next."
    );
  }

  return apiBase;
}
