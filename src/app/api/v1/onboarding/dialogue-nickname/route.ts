import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function getBackendBaseUrl() {
  return (
    process.env.DECODER_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_DECODER_BACKEND_BASE_URL ||
    process.env.BACKEND_URL || // fallback legado (local)
    "http://localhost:4100"
  );
}

async function getAuthTokenFromCookies(): Promise<string | null> {
  const jar = await cookies();

  const token =
    jar.get("accessToken")?.value ||
    jar.get("token")?.value ||
    jar.get("hint_access_token")?.value ||
    jar.get("decoder_auth")?.value ||
    null;

  return token;
}

export async function POST(req: Request) {
  try {
    const token = await getAuthTokenFromCookies();
    const payload = await req.json().catch(() => ({}));

    // ✅ aceita ambos formatos: { nickname } (UI) ou { dialogueNickname } (contrato)
    const raw =
      typeof (payload as any)?.dialogueNickname === "string"
        ? (payload as any).dialogueNickname
        : typeof (payload as any)?.nickname === "string"
          ? (payload as any).nickname
          : "";

    const dialogueNickname = String(raw).trim();

    const backendBaseUrl = getBackendBaseUrl();

    const res = await fetch(`${backendBaseUrl}/api/v1/onboarding/dialogue-nickname`, {
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
  } catch (err: any) {
    return NextResponse.json(
      {
        message: "Falha ao salvar nickname (proxy).",
        hint: "Verifique DECODER_BACKEND_BASE_URL / NEXT_PUBLIC_DECODER_BACKEND_BASE_URL no Vercel.",
      },
      { status: 502 },
    );
  }
}
