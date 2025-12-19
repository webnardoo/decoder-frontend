import { NextRequest, NextResponse } from "next/server";

type LoginBody = {
  email?: string;
  password?: string;
};

function normalizeBackendBaseUrl(raw?: string) {
  const v = (raw || "").trim();
  if (!v) return "http://localhost:4100";
  return v.replace("http://127.0.0.1", "http://localhost").replace("https://127.0.0.1", "https://localhost");
}

function getBackendBaseUrl() {
  return normalizeBackendBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginBody;

    const email = (body.email ?? "").trim();
    const password = (body.password ?? "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const backendUrl = `${getBackendBaseUrl()}/api/v1/auth/login`;

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const contentType = backendRes.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await backendRes.json().catch(() => null) : await backendRes.text();

    if (!backendRes.ok) {
      return NextResponse.json(
        {
          error: "AUTH_FAILED",
          status: backendRes.status,
          message:
            (payload && (payload.message || payload.error?.message)) ||
            `Falha ao autenticar. Status ${backendRes.status}`,
          payload,
        },
        { status: backendRes.status }
      );
    }

    const token: string | undefined = payload?.accessToken;
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        {
          error: "AUTH_INVALID_RESPONSE",
          message: "Backend não retornou accessToken.",
          payload,
        },
        { status: 502 }
      );
    }

    const res = NextResponse.json(
      {
        ok: true,
        user: payload?.user ?? null,
      },
      { status: 200 }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookies.set({
      name: "decoder_auth",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "AUTH_PROXY_ERROR",
        message: "Falha inesperada no /api/auth/login.",
        detail: err?.message ?? String(err),
      },
      { status: 502 }
    );
  }
}
