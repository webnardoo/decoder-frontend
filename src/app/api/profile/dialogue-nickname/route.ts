import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4100";

type Body = { nickname?: string };

async function getTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  const a = store.get("accessToken")?.value;
  const b = store.get("token")?.value;
  return (a || b || "").trim() || null;
}

async function forwardToBackend(
  token: string,
  nickname: string,
): Promise<{ ok: boolean; status: number; text: string; tried: string[] }> {
  // ✅ lista curta e prática (evita inferência única)
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
    const url = `${BACKEND_URL}${c.path}`;
    tried.push(`${c.method} ${c.path}`);

    const res = await fetch(url, {
      method: c.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nickname }),
    });

    const text = await res.text().catch(() => "");

    // ✅ sucesso
    if (res.ok) return { ok: true, status: res.status, text, tried };

    // ✅ se não for 404/405, é erro real (ex.: 400/401/500) -> parar e devolver
    if (res.status !== 404 && res.status !== 405) {
      return { ok: false, status: res.status, text, tried };
    }

    // 404/405 -> tenta o próximo
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
    const token = await getTokenFromCookies();
    if (!token) return NextResponse.json({ message: "Sem token." }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Body;
    const nickname = String(body?.nickname ?? "").trim();
    if (!nickname) return NextResponse.json({ message: "nickname é obrigatório." }, { status: 400 });

    const result = await forwardToBackend(token, nickname);

    if (!result.ok) {
      // devolve info mínima (sem vazar token) para debug rápido
      return NextResponse.json(
        {
          message: "Falha ao salvar nickname no backend.",
          backendStatus: result.status,
          backendBody: result.text?.slice(0, 800) || "",
          tried: result.tried,
        },
        { status: result.status || 500 },
      );
    }

    // backend respondeu ok: tenta devolver JSON, senão ok padrão
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
