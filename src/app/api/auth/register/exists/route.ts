import { NextResponse } from "next/server";

function apiBase() {
  // Ex.: http://localhost:4100/api/v1
  return (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4100/api/v1")
    .trim()
    .replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const res = await fetch(`${apiBase()}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "PROXY_REGISTER_FAILED", message: e?.message || "Failed to proxy register" },
      { status: 502 },
    );
  }
}
