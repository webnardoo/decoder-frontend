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

export async function POST(req: Request) {
  const token = await getAuthTokenFromCookies();
  const payload = await req.json().catch(() => ({}));

  // ✅ aceita ambos formatos: { nickname } (UI) ou { dialogueNickname } (contrato)
  const raw =
    typeof payload?.dialogueNickname === "string"
      ? payload.dialogueNickname
      : typeof payload?.nickname === "string"
        ? payload.nickname
        : "";

  const dialogueNickname = String(raw).trim();

  const res = await fetch(`${BACKEND_URL}/api/v1/onboarding/dialogue-nickname`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ dialogueNickname }),
  });

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    return NextResponse.json(
      {
        message: "Falha ao salvar nickname no backend.",
        backendStatus: res.status,
        backendBody: body,
      },
      { status: res.status },
    );
  }

  return NextResponse.json(body, { status: 200 });
}
