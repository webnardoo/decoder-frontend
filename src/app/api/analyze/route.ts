import { NextResponse } from "next/server";

type RelationshipType = "ROMANTICA" | "AMIZADE" | "FAMILIA" | "TRABALHO";

type QuickAnalyzeRequest = {
  conversation: string;
  relationshipType: RelationshipType;
};

type QuickAnalyzeResult = {
  score: { value: number; label: string };
  insights: Array<{ title: string; description: string }>;
  redFlags: Array<{ title: string; description: string }>;
  replySuggestion: string | null;
  meta: {
    messageCountApprox: number;
    creditsUsed?: number;
  };
  // contrato UX v1.1 (quando aplicável)
  creditsUsed?: number;
  creditsBalanceAfter?: number;
};

type MockCode = "200" | "401" | "403" | "500";

function getMockCode(url: string): MockCode {
  const u = new URL(url);
  const m = (u.searchParams.get("mock") || "").trim();
  if (m === "401" || m === "403" || m === "500") return m;
  return "200";
}

function safeString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function simpleHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function buildMockQuick(body: QuickAnalyzeRequest): QuickAnalyzeResult {
  const conv = safeString(body?.conversation);
  const rel = safeString(body?.relationshipType);

  const msgApprox = Math.max(1, Math.round(conv.replace(/\s+/g, "").length / 40));

  const h = simpleHash(conv + "|" + rel + "|" + String(Date.now()));
  const scoreValue = clamp(h % 101, 0, 100);

  const creditsUsed = clamp(Math.ceil(conv.length / 50), 1, 99);
  const creditsBalanceAfter = 340;

  return {
    score: {
      value: scoreValue,
      label: scoreValue >= 70 ? "Forte" : scoreValue >= 40 ? "Boa" : "Fraca",
    },
    insights: [
      { title: "Direção geral", description: "Leitura simulada (MOCK) para teste de UI." },
      { title: "Risco principal", description: "Conteúdo simulado para validação do layout." },
      { title: "Próximo passo", description: "Conteúdo simulado para validar renderização." },
    ],
    redFlags: [],
    replySuggestion:
      "Curti. Só pra alinhar: eu tô na mesma intenção, mas prefiro ir com calma e com clareza.",
    meta: { messageCountApprox: msgApprox, creditsUsed },
    creditsUsed,
    creditsBalanceAfter,
  };
}

function respondMock(mock: MockCode) {
  if (mock === "401") return NextResponse.json({}, { status: 401 });
  if (mock === "403") return NextResponse.json({ code: "INSUFFICIENT_CREDITS" }, { status: 403 });
  if (mock === "500") return NextResponse.json({}, { status: 500 });
  return null;
}

// ✅ GET só para você abrir no browser e validar o mock
export async function GET(req: Request) {
  const mock = getMockCode(req.url);
  const mocked = respondMock(mock);
  if (mocked) return mocked;

  return NextResponse.json(
    {
      ok: true,
      info: "GET de teste ativo. Para simular erros use ?mock=401|403|500. Para fluxo real a UI usa POST.",
    },
    { status: 200 },
  );
}

export async function POST(req: Request) {
  const mock = getMockCode(req.url);
  const mocked = respondMock(mock);
  if (mocked) return mocked;

  const body = (await req.json().catch(() => ({}))) as QuickAnalyzeRequest;
  return NextResponse.json(buildMockQuick(body), { status: 200 });
}
