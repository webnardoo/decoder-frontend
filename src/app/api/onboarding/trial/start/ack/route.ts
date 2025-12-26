// src/app/api/onboarding/trial/start/ack/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4100";

function pickTokenFromCookieStore(store: Awaited<ReturnType<typeof cookies>>) {
  return (
    store.get("accessToken")?.value ||
    store.get("token")?.value ||
    store.get("decoder_access_token")?.value ||
    ""
  );
}

export async function POST() {
  const store = await cookies(); // ✅ cookies() é async no Next 16
  const token = pickTokenFromCookieStore(store);

  // ✅ rota real do backend
  const res = await fetch(`${BACKEND_URL}/api/v1/onboarding/trial/ack`, {
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
      { message: "Falha ao confirmar início da degustação.", backend: text || null },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true });
}
