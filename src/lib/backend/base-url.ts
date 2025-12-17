// src/lib/backend/base-url.ts

export function getBackendBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "";

  const url = raw.trim().replace(/\/+$/, "");

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL (ou NEXT_PUBLIC_BACKEND_URL) não configurada."
    );
  }

  // Exige http(s) para evitar apontamento inválido.
  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      `Backend URL inválida: "${raw}". Use formato http(s)://...`
    );
  }

  return url;
}
