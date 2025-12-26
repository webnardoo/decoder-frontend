import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

async function handler(req: Request, ctx: { params: { path?: string[] } }) {
  const pathParts = ctx.params.path ?? [];
  const targetUrl = `${BACKEND_URL}/api/v1/onboarding/${pathParts.join("/")}`;

  // Repassa Authorization se existir, senão repassa cookies (se seu backend usa cookie)
  const incomingAuth = req.headers.get("authorization") ?? "";
  const cookieHeader = cookies().toString();

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  if (incomingAuth) headers["Authorization"] = incomingAuth;
  if (cookieHeader) headers["Cookie"] = cookieHeader;

  // Body apenas para métodos com payload
  let body: BodyInit | undefined = undefined;
  const method = req.method.toUpperCase();
  if (!["GET", "HEAD"].includes(method)) {
    const raw = await req.text();
    body = raw ? raw : undefined;
  }

  const res = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  // tenta retornar JSON; se não for JSON, retorna texto
  const resContentType = res.headers.get("content-type") ?? "";
  const isJson = resContentType.includes("application/json");

  if (isJson) {
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  }

  const text = await res.text().catch(() => "");
  return new NextResponse(text, { status: res.status });
}

export async function GET(req: Request, ctx: any) {
  return handler(req, ctx);
}
export async function POST(req: Request, ctx: any) {
  return handler(req, ctx);
}
export async function PATCH(req: Request, ctx: any) {
  return handler(req, ctx);
}
export async function PUT(req: Request, ctx: any) {
  return handler(req, ctx);
}
export async function DELETE(req: Request, ctx: any) {
  return handler(req, ctx);
}
