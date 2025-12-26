import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4100";
const API_PREFIX = "/api/v1";

function buildAuthHeaderFromRequestOrCookie(req: Request, cookieToken: string | null) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth;

  if (cookieToken && cookieToken.trim().length > 0) {
    return `Bearer ${cookieToken.trim()}`;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // ✅ Next (no teu setup): cookies() é Promise
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get("decoder_auth")?.value ?? null;

    const authorization = buildAuthHeaderFromRequestOrCookie(req, cookieToken);

    const res = await fetch(`${BACKEND_URL}${API_PREFIX}/quick/tutorial`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();

    // Repassa status + payload do backend (json ou texto)
    try {
      const json = text ? JSON.parse(text) : null;
      return NextResponse.json(json ?? { ok: true }, { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        message: "fetch failed",
        detail: String(err?.message ?? err),
      },
      { status: 502 }
    );
  }
}
