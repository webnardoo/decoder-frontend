// src/lib/api/http.ts
import { getApiBaseUrl } from "./baseUrl";
import { getJwtOrNull } from "./auth";

export type ApiError = {
  status: number;
  body: any;
};

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const inBrowser = typeof window !== "undefined";

  const rawPath = path.startsWith("/") ? path : `/${path}`;

  // ✅ Regra definitiva:
  // - Browser: SEMPRE chama o proxy do Next (/api/*)
  // - Server (Route Handlers): chama o backend real (base /api/v1)
  const finalUrl = inBrowser ? toNextProxyUrl(rawPath) : toBackendUrl(rawPath);

  const jwt = getJwtOrNull();

  const headers: Record<string, string> = {
    ...(init?.headers ? (init.headers as Record<string, string>) : {}),
  };

  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;

  if (!isFormData && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (jwt && !headers.Authorization) headers.Authorization = `Bearer ${jwt}`;

  const res = await fetch(finalUrl, {
    ...init,
    headers,
  });

  const text = await res.text().catch(() => "");
  const body = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const err: ApiError = { status: res.status, body };
    throw err;
  }

  return body as T;
}

function toNextProxyUrl(path: string) {
  if (path === "/api" || path.startsWith("/api/")) return path;
  return `/api${path}`;
}

function toBackendUrl(path: string) {
  const baseUrl = getApiBaseUrl();
  const base = String(baseUrl || "").trim().replace(/\/$/, "");
  return `${base}${path}`;
}

function safeJsonParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s };
  }
}
