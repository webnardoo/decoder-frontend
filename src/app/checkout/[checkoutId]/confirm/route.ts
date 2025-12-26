import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = "http://localhost:4100";

export async function POST(req: Request, ctx: { params: { checkoutId: string } }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("decoder_auth")?.value;

    if (!token) {
      return NextResponse.json({ message: "UNAUTHENTICATED" }, { status: 401 });
    }

    const checkoutId = String(ctx?.params?.checkoutId || "").trim();
    if (!checkoutId) {
      return NextResponse.json({ message: "CHECKOUT_ID_REQUIRED" }, { status: 400 });
    }

    const body = await req.text();

    const upstream = await fetch(`${BACKEND_URL}/api/v1/checkout/${encodeURIComponent(checkoutId)}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");

    return new NextResponse(text || "", {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json({ message: "CHECKOUT_CONFIRM_PROXY_FAILED" }, { status: 500 });
  }
}
