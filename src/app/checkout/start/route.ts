import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4100/api/v1";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("decoder_auth")?.value;

    if (!token) {
      return NextResponse.json({ message: "UNAUTHENTICATED" }, { status: 401 });
    }

    const body = await req.text();

    const upstream = await fetch(
      `${BACKEND_URL}/billing/stripe/checkout-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
        cache: "no-store",
      }
    );

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ||
          "application/json; charset=utf-8",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "CHECKOUT_PROXY_FAILED" },
      { status: 500 }
    );
  }
}
