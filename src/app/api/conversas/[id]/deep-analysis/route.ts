import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE_URL = process.env.DECODER_BACKEND_BASE_URL ?? "http://127.0.0.1:4100";

/**
 * POST /api/conversas/:id/deep-analysis
 * Repassa para: POST http://127.0.0.1:4100/api/v1/boxes/:id/deep-analyses
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    const { id } =
      "then" in (ctx as any).params
        ? await (ctx as any).params
        : (ctx as any).params;

    const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!auth) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Não autenticado." },
        { status: 401 },
      );
    }

    // Mantém suporte a mock via querystring (ex.: ?mock=1) — se você quiser desligar, remova este bloco.
    const mock = req.nextUrl.searchParams.get("mock");
    if (mock) {
      // mock=1 => 201 (sucesso fake mínimo)
      if (mock === "1" || mock === "201") {
        return NextResponse.json(
          {
            deep: {
              source: "MOCK",
              score: { previous: 0, current: 0, delta: 0 },
              summary: { statusLabel: "Mock", headline: "Resposta mock.", confidenceLevel: 0 },
              messageImpacts: [],
              patterns: [],
              risks: [],
              recommendations: [],
            },
            creditsUsed: 0,
            creditsBalanceAfter: 0,
            deepMonthly: { limit: 0, used: 0, remaining: 0, cycleRef: "0000-00" },
          },
          { status: 201 },
        );
      }

      // mock=401/403/429 etc.
      const s = Number(mock);
      if (!Number.isNaN(s) && s >= 400) {
        return NextResponse.json(
          { code: "MOCK_ERROR", message: "Erro mock.", statusCode: s },
          { status: s },
        );
      }
    }

    const body = await req.json().catch(() => ({}));

    const upstream = await fetch(`${BACKEND_BASE_URL}/api/v1/boxes/${encodeURIComponent(id)}/deep-analyses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { code: "UNKNOWN", message: "Falha ao chamar o backend.", detail: String(e?.message ?? e) },
      { status: 500 },
    );
  }
}
