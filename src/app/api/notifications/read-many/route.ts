/*src/app/api/notifications/read-many/route.ts*/
import { NextResponse } from "next/server";

function getBackendBaseUrl() {
  const base =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL;

  if (!base) {
    throw new Error(
      "Missing BACKEND_URL (preferred) or NEXT_PUBLIC_API_BASE_URL in environment."
    );
  }

  return base.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const baseUrl = getBackendBaseUrl();
    const upstreamUrl = `${baseUrl}/api/v1/notifications/read-many`;

    const body = await req.text();

    const res = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": req.headers.get("content-type") ?? "application/json",
        cookie: req.headers.get("cookie") ?? "",
        authorization: req.headers.get("authorization") ?? "",
        accept: "application/json",
      },
      body,
      cache: "no-store",
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "PROXY_NOTIFICATION_READ_MANY_FAILED", message: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}