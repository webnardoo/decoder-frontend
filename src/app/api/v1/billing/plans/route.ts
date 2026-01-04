import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("decoder_auth")?.value;

    if (!token) {
      return NextResponse.json({ message: "UNAUTHENTICATED" }, { status: 401 });
    }

    const upstream = await fetch(`${BACKEND_URL}/api/v1/billing/plans`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
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
  } catch {
    return NextResponse.json(
      { message: "BILLING_PLANS_PROXY_FAILED" },
      { status: 500 },
    );
  }
}
