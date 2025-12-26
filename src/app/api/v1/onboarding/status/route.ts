import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4100";

async function getAuthTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();

  const token =
    jar.get("accessToken")?.value ||
    jar.get("token")?.value ||
    jar.get("hint_access_token")?.value ||
    null;

  return token;
}

export async function GET() {
  const token = await getAuthTokenFromCookies();

  const res = await fetch(`${BACKEND_URL}/api/v1/onboarding/status`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    return NextResponse.json(
      {
        message: "Falha ao buscar onboarding status no backend.",
        backendStatus: res.status,
        backendBody: body,
      },
      { status: 200 }, // mantém o front vivo; o client decide fluxo
    );
  }

  return NextResponse.json(body, { status: 200 });
}
