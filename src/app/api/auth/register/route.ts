import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl || typeof baseUrl !== "string") {
      return NextResponse.json({ message: "MISSING_API_BASE" }, { status: 500 });
    }

    const base = baseUrl.trim().replace(/\/$/, "");
    if (!base) {
      return NextResponse.json({ message: "INVALID_API_BASE" }, { status: 500 });
    }

    const upstreamUrl = `${base}/auth/register`;

    // ✅ Blindagem contra quoting/escape do terminal:
    // parseia como JSON e re-serializa.
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ message: "INVALID_JSON_BODY" }, { status: 400 });
    }

    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");

    return new NextResponse(text || "", {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" },
    });
  } catch {
    return NextResponse.json({ message: "REGISTER_PROXY_FAILED" }, { status: 500 });
  }
}
