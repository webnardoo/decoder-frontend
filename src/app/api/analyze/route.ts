// src/app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { routeOrMock } from "@/lib/backend/proxy";

type MockCode = "200" | "401" | "403" | "429" | "500";

function getMockCode(url: string): MockCode {
  const code = new URL(url).searchParams.get("code") as MockCode | null;
  return code ?? "200";
}

async function mockAnalyze(req: NextRequest): Promise<NextResponse> {
  const code = getMockCode(req.url);

  // Importante: mock é dormente por padrão e NÃO pode interferir no fluxo real.
  // Mantém a estrutura de respostas genéricas sem criar regra de crédito local.
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

  // 200 genérico (somente para desenvolvimento quando explicitamente ativado)
  return NextResponse.json(
    {
      result: {
        score: 72,
        label: "TENSÃO LEVE",
        highlights: ["Mock ativo via ?mock=1"],
      },
      creditsUsed: 0,
      creditsBalanceAfter: 0,
    },
    { status: 200 }
  );
}

export async function POST(req: NextRequest) {
  return routeOrMock(req, () => mockAnalyze(req));
}

// Se existir GET no seu front por algum motivo, mantenha proxy puro:
export async function GET(req: NextRequest) {
  return routeOrMock(req, () =>
    NextResponse.json(
      { error: { code: "MOCK_ONLY", message: "Ative ?mock=1 para mock." } },
      { status: 400 }
    )
  );
}
