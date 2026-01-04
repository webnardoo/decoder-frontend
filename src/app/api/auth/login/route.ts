import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: "Resposta inválida do backend (não-JSON)." };
  }

  // repassa erro sem setar cookie
  if (!res.ok) {
    return NextResponse.json(data ?? { message: "Falha no login." }, { status: res.status });
  }

  const token = data?.accessToken ?? null;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ message: "Login OK, mas backend não retornou accessToken." }, { status: 502 });
  }

  const response = NextResponse.json(
    { ok: true, user: data?.user ?? null },
    { status: 200 },
  );

  // cookie HTTPOnly pra SSR/Route Handlers conseguirem ler com cookies()
  response.cookies.set({
    name: "accessToken",
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: false, // dev/local
    path: "/",
  });

  return response;
}
