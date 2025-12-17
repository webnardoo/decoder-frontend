// src/app/api/conversas/[id]/deep-analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { routeOrMock } from "@/lib/backend/proxy";

type MockCode = "201" | "401" | "403" | "429" | "500";

function getMockCode(url: string): MockCode {
  const code = new URL(url).searchParams.get("code") as MockCode | null;
  return code ?? "201";
}

async function mockDeep(req: NextRequest): Promise<NextResponse> {
  const code = getMockCode(req.url);

  if (code === "401") {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Não autenticado." } },
      { status: 401 }
    );
  }

  if (code === "403") {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Acesso negado." } },
      { status: 403 }
    );
  }

  if (code === "429") {
    return NextResponse.json(
      { error: { code: "RATE_LIMIT", message: "Muitas requisições." } },
      { status: 429 }
    );
  }

  if (code === "500") {
    return NextResponse.json(
      { error: { code: "INTERNAL", message: "Erro interno." } },
      { status: 500 }
    );
  }

  // 201 genérico (somente para desenvolvimento quando explicitamente ativado)
  return NextResponse.json(
    {
      deepAnalysis: {
        id: "mock-deep-1",
        createdAt: new Date().toISOString(),
        snapshotVersion: "v1.1",
        // snapshot mínimo, sem inventar regra:
        summary: "Mock ativo via ?mock=1",
      },
      creditsUsed: 0,
      creditsBalanceAfter: 0,
      deepMonthly: { limit: 0, used: 0, remaining: 0 },
    },
    { status: 201 }
  );
}

export async function POST(req: NextRequest) {
  return routeOrMock(req, () => mockDeep(req));
}

export async function GET(req: NextRequest) {
  return routeOrMock(req, () =>
    NextResponse.json(
      { error: { code: "MOCK_ONLY", message: "Ative ?mock=1 para mock." } },
      { status: 400 }
    )
  );
}
