import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4100";

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";

    const res = await fetch(`${BACKEND_URL}/api/v1/onboarding/tutorial/ack`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { authorization: auth } : {}),
      },
    });

    const text = await res.text();
    const isJson = res.headers.get("content-type")?.includes("application/json");

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": isJson ? "application/json" : "text/plain",
      },
    });
  } catch {
    return NextResponse.json({ message: "fetch failed" }, { status: 502 });
  }
}
