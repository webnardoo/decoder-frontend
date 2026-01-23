import { NextResponse } from "next/server";

function getBackendBaseUrl(): string {
  const env = (process.env.APP_ENV || "local").toLowerCase().trim();

  const local = process.env.BACKEND_URL_LOCAL || "http://127.0.0.1:4100";
  const prd = process.env.BACKEND_URL_PRD || "";

  if (env === "prd" && prd) return prd;
  return local;
}

export async function GET(req: Request) {
  // Este endpoint existe no front só para telas/fluxos que dependem dele.
  // Ele deve devolver a mesma coisa que /api/v1/billing/me (front),
  // então reaproveitamos a mesma origem no backend (/api/v1/status).
  const backendBase = getBackendBaseUrl();
  const url = `${backendBase}/api/v1/status`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    const ct = upstream.headers.get("content-type") ?? "";
    const data = ct.includes("application/json")
      ? await upstream.json().catch(() => ({}))
      : await upstream.text().catch(() => "");

    return NextResponse.json(data, { status: upstream.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: "Falha de conexão com o backend.", detail: String(e?.message || e) },
      { status: 502 },
    );
  }
}
