import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBackendBaseUrl } from "@/lib/backend/base-url";

function normalizeToken(raw: string | null | undefined) {
  const v = (raw || "").trim();
  if (!v) return "";
  return v.toLowerCase().startsWith("bearer ") ? v.slice(7).trim() : v;
}

async function getToken(): Promise<string | null> {
  const jar = await cookies();
  const token =
    jar.get("accessToken")?.value ||
    jar.get("token")?.value ||
    jar.get("hint_access_token")?.value ||
    jar.get("decoder_auth")?.value ||
    null;

  const t = normalizeToken(token);
  return t || null;
}

// Contrato:
// GET -> 200 { ok:true } se sessão/token válida
//     -> 401 { ok:false } se não autenticado
export async function GET() {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const base = getBackendBaseUrl();

    // Check barato e real: se token é válido, balance responde 200; inválido responde 401/403
    const upstream = await fetch(`${base}/api/v1/credits/balance`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        Cookie: `decoder_auth=${token}`,
      },
      cache: "no-store",
    });

    if (upstream.status === 200) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (upstream.status === 401 || upstream.status === 403) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    // Qualquer coisa fora do esperado = não confiar
    return NextResponse.json(
      { ok: false, message: "SESSION_CHECK_UNEXPECTED_STATUS", status: upstream.status },
      { status: 502 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "SESSION_CHECK_FAILED", detail: e?.message || "unknown" },
      { status: 502 },
    );
  }
}
