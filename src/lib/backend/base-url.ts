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

function normalizeBase(raw: unknown): string {
  let base = String(raw || "").trim().replace(/\/+$/, "");
  if (!base) return "";

  // Se vier com /api/v1, remove (helper devolve BASE sem /api/v1)
  if (base.endsWith("/api/v1")) base = base.slice(0, -"/api/v1".length);

  return base;
}

/**
 * Retorna a BASE do backend (SEM /api/v1), ex:
 * - http://127.0.0.1:4100
 * - https://hitchai-backend-production.up.railway.app
 */
export function getBackendBaseUrl(): string {
  const candidates: Array<[string, string]> = [
    ["NEXT_PUBLIC_DECODER_BACKEND_BASE_URL", normalizeBase(process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL)],
    ["DECODER_BACKEND_BASE_URL", normalizeBase(process.env.DECODER_BACKEND_BASE_URL)],
    ["NEXT_PUBLIC_BACKEND_URL", normalizeBase(process.env.NEXT_PUBLIC_BACKEND_URL)],
    ["BACKEND_URL_PRD", normalizeBase(process.env.BACKEND_URL_PRD)],
    ["NEXT_PUBLIC_API_BASE_URL_PRD", normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL_PRD)],
    ["BACKEND_URL", normalizeBase(process.env.BACKEND_URL)],
    ["NEXT_PUBLIC_API_BASE_URL", normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL)],
    ["BACKEND_URL_LOCAL", normalizeBase(process.env.BACKEND_URL_LOCAL)],
    ["NEXT_PUBLIC_API_BASE_URL_LOCAL", normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL)],
  ];

  const picked = candidates.find(([, v]) => !!v)?.[1] || "";

  // ✅ PRD: se não existe env válida, NÃO faz fallback pra localhost (pra não mascarar erro)
  if (isPrd()) {
    if (!picked) {
      const keysTried = candidates.map(([k]) => k).join(", ");
      throw new Error(
        `PRD: Backend base URL não definida no runtime. Keys verificadas: ${keysTried}. ` +
          `Confirme que a variável está no PROJECT CORRETO do Vercel e salva para Production.`
      );
    }

    if (/localhost|127\.0\.0\.1/.test(picked)) {
      throw new Error(
        "PRD: Backend base URL inválida (localhost). Verifique envs do Vercel."
      );
    }

    return picked;
  }

  // DEV/preview/local: fallback permitido
  return picked || "http://127.0.0.1:4100";
}

export function __debugBackendBaseUrlSnapshot() {
  const snapshot = {
    isPrd: isPrd(),
    APP_ENV: process.env.APP_ENV ?? null,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
    keys: {
      NEXT_PUBLIC_DECODER_BACKEND_BASE_URL: !!process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL,
      DECODER_BACKEND_BASE_URL: !!process.env.DECODER_BACKEND_BASE_URL,
      NEXT_PUBLIC_BACKEND_URL: !!process.env.NEXT_PUBLIC_BACKEND_URL,
      BACKEND_URL_PRD: !!process.env.BACKEND_URL_PRD,
      NEXT_PUBLIC_API_BASE_URL_PRD: !!process.env.NEXT_PUBLIC_API_BASE_URL_PRD,
      BACKEND_URL: !!process.env.BACKEND_URL,
      NEXT_PUBLIC_API_BASE_URL: !!process.env.NEXT_PUBLIC_API_BASE_URL,
      BACKEND_URL_LOCAL: !!process.env.BACKEND_URL_LOCAL,
      NEXT_PUBLIC_API_BASE_URL_LOCAL: !!process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL,
    },
  };

  return snapshot;
}
