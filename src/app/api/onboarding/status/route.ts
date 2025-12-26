import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = "http://localhost:4100";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  const res = await fetch(`${BACKEND_URL}/api/v1/onboarding/status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    return NextResponse.json(payload ?? { message: "Falha ao buscar status." }, { status: res.status });
  }

  return NextResponse.json(payload);
}
