/*src/app/api/v1/notifications/stream/route.ts*/
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const backendBase =
    process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!backendBase) {
    return NextResponse.json(
      { ok: false, error: "BACKEND_URL (ou NEXT_PUBLIC_API_BASE_URL) não configurado" },
      { status: 500 }
    );
  }

  const upstreamUrl = new URL("/api/v1/notifications/stream", backendBase);

  const upstream = await fetch(upstreamUrl.toString(), {
    method: "GET",
    headers: {
      cookie: req.headers.get("cookie") || "",
      accept: "text/event-stream",
    },
    cache: "no-store",
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new NextResponse(text || "Upstream SSE error", {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "text/plain",
      },
    });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}