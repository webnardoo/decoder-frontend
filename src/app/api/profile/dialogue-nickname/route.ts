import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4100";

// Aceita ambos para compatibilidade, mas CANÔNICO é dialogueNickname
type Body = { dialogueNickname?: string; nickname?: string };

async function getAuthFromCookies(): Promise<{
  bearerToken: string | null;
  decoderAuth: string | null;
}> {
  const store = await cookies();

  // Alguns fluxos guardam token em cookies client-side
  const accessToken = store.get("accessToken")?.value;
  const token = store.get("token")?.value;

  // Auth canônico do backend (HttpOnly)
  const decoderAuth = store.get("decoder_auth")?.value;

  const bearerToken = (accessToken || token || "").trim() || null;
  return { bearerToken, decoderAuth: (decoderAuth || "").trim() || null };
}

function extractDialogueNickname(body: Body): string {
  const v = (body?.dialogueNickname ?? body?.nickname ?? "").toString().trim();
  return v;
}

async function forwardToBackend(params: {
  bearerToken: string | null;
  decoderAuth: string | null;
  dialogueNickname: string;
}): Promise<{ ok: boolean; status: number; text: string; tried: string[] }> {
  const { bearerToken, decoderAuth, dialogueNickname } = params;

  const candidates: Array<{ method: "POST" | "PATCH" | "PUT"; path: string }> = [
    // Onboarding
    { method: "POST", path: "/api/v1/onboarding/dialogue-nickname" },
    { method: "PATCH", path: "/api/v1/onboarding/dialogue-nickname" },
    { method: "PUT", path: "/api/v1/onboarding/dialogue-nickname" },

    // Profile
    { method: "POST", path: "/api/v1/profile/dialogue-nickname" },
    { method: "PATCH", path: "/api/v1/profile/dialogue-nickname" },
    { method: "PUT", path: "/api/v1/profile/dialogue-nickname" },

    // Users (me)
    { method: "POST", path: "/api/v1/users/me/dialogue-nickname" },
    { method: "PATCH", path: "/api/v1/users/me/dialogue-nickname" },
    { method: "PUT", path: "/api/v1/users/me/dialogue-nickname" },
  ];

  const tried: string[] = [];

  for (const c of candidates) {
    tried.push(`${c.method} ${c.path}`);
    const url = `${BACKEND_URL}${c.path}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Preferir Cookie HttpOnly (decoder_auth) quando existir
    if (decoderAuth) {
      headers.Cookie = `decoder_auth=${decoderAuth}`;
    } else if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }

    const res = await fetch(url, {
      method: c.method,
      headers,
      body: JSON.stringify({ dialogueNickname }),
    });

    const text = await res.text().catch(() => "");

    if (res.ok) return { ok: true, status: res.status, text, tried };

    // Erro real (400/401/500) -> devolve já
    if (res.status !== 404 && res.status !== 405) {
      return { ok: false, status: res.status, text, tried };
    }
  }

  return {
    ok: false,
    status: 404,
    text: `Nenhuma rota candidata respondeu com sucesso no backend.`,
    tried,
  };
}

async function handler(req: Request) {
  try {
    const { bearerToken, decoderAuth } = await getAuthFromCookies();
    if (!decoderAuth && !bearerToken) {
      return NextResponse.json({ message: "Sem token." }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const dialogueNickname = extractDialogueNickname(body);
    if (!dialogueNickname) {
      return NextResponse.json(
        { message: "dialogueNickname é obrigatório." },
        { status: 400 },
      );
    }

    const result = await forwardToBackend({ bearerToken, decoderAuth, dialogueNickname });

    if (!result.ok) {
      return NextResponse.json(
        {
          message: "Falha ao salvar dialogueNickname no backend.",
          backendStatus: result.status,
          backendBody: result.text?.slice(0, 800) || "",
          tried: result.tried,
        },
        { status: result.status || 500 },
      );
    }

    try {
      const json = JSON.parse(result.text);
      return NextResponse.json(json, { status: 200 });
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  } catch {
    return NextResponse.json({ message: "Erro inesperado." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handler(req);
}

export async function PUT(req: Request) {
  return handler(req);
}

export async function PATCH(req: Request) {
  return handler(req);
}
