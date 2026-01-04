import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

async function getAuthTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();
  const token =
    jar.get("accessToken")?.value ||
    jar.get("token")?.value ||
    jar.get("hint_access_token")?.value ||
    null;

  return token;
}

export async function GET(req: Request) {
  const token = await getAuthTokenFromCookies();
  const url = new URL(req.url);

  const model = (url.searchParams.get("model") ?? "").trim();
  const qs = model ? `?model=${encodeURIComponent(model)}` : "";

  const res = await fetch(`${BACKEND_URL}/api/v1/admin/credit-v2/config/model${qs}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return NextResponse.json(
      { message: "Resposta inválida do backend (não-JSON)." },
      { status: 502 },
    );
  }

  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(req: Request) {
  const token = await getAuthTokenFromCookies();
  const url = new URL(req.url);

  const model = (url.searchParams.get("model") ?? "").trim();
  const qs = model ? `?model=${encodeURIComponent(model)}` : "";

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const res = await fetch(`${BACKEND_URL}/api/v1/admin/credit-v2/config/model${qs}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return NextResponse.json(
      { message: "Resposta inválida do backend (não-JSON)." },
      { status: 502 },
    );
  }

  return NextResponse.json(data, { status: res.status });
}
