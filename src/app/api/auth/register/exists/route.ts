import { NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/backend/base-url";

type Body = {
  email?: string;
};

// Proxy server-side: valida se email já existe no backend
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = String(body.email || "").trim();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "email é obrigatório" },
        { status: 400 }
      );
    }

    const base = getBackendBaseUrl();
    const upstream = await fetch(`${base}/api/v1/auth/register/exists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ email }),
    });

    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || "", {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ||
          "application/json; charset=utf-8",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        message: e?.message || "REGISTER_EXISTS_PROXY_FAILED",
      },
      { status: 500 }
    );
  }
}
