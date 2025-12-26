import { NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:4100";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    const accessToken = String(data?.accessToken ?? "").trim();

    if (!upstream.ok || !accessToken) {
      return NextResponse.json(
        { message: "Login não retornou token (accessToken/token)." },
        { status: 401 },
      );
    }

    const res = NextResponse.json(data, { status: 200 });
    res.cookies.set("decoder_auth", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch {
    return NextResponse.json({ message: "LOGIN_PROXY_FAILED" }, { status: 500 });
  }
}
