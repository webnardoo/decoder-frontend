// src/app/api/onboarding/trial/complete/ack/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4100";

function pickTokenFromCookieStore(store: Awaited<ReturnType<typeof cookies>>) {
  return (
    store.get("accessToken")?.value ||
    store.get("token")?.value ||
    store.get("decoder_access_token")?.value ||
    store.get("decoder_auth")?.value || // ✅ compat com teu guard/cookie
    ""
  );
}

export async function POST() {
  const store = await cookies();
  const token = pickTokenFromCookieStore(store);

  // ✅ BACK correto: /trial/complete (não existe /ack no backend)
  const res = await fetch(`${BACKEND_URL}/api/v1/onboarding/trial/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return NextResponse.json(
      { message: "Falha ao concluir degustação.", backend: text || null },
      { status: res.status },
    );
  }

  // ✅ devolve payload do backend (útil pro front avançar etapa)
  try {
    const data = text ? JSON.parse(text) : { ok: true };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ ok: true });
  }
}
