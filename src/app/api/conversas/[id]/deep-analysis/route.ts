import { NextResponse } from "next/server";
import type {
  DeepAnalysisRequestBody,
  DeepAnalysisV2,
} from "@/lib/deep-analysis-contract";

type MockCode = "200" | "401" | "403" | "429" | "500";

type DeepMonthly = {
  limit: number;
  used: number;
  remaining: number;
  cycleRef: string; // YYYY-MM
};

type DeepAnalyzeSuccessV11 = {
  deep: DeepAnalysisV2;
  creditsUsed: number;
  creditsBalanceAfter: number;
  deepMonthly: DeepMonthly;
};

function getMockCode(url: string): MockCode {
  const u = new URL(url);
  const m = (u.searchParams.get("mock") || "").trim();
  if (m === "401" || m === "403" || m === "429" || m === "500") return m;
  return "200";
}

function uuid() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function currentCycleRef() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function buildDeepMock(conversaId: string): DeepAnalysisV2 {
  const previous = 10;
  const current = 15;
  const delta = current - previous;

  const impacts: Array<{ d: number; label: string; why: string }> = [
    { d: 2, label: "Entrada 5 — último evento", why: "Clareza e consistência aumentaram." },
    { d: 1, label: "Entrada 4 — anterior", why: "Tom colaborativo sustentou avanço." },
    { d: 2, label: "Entrada 3 — anterior", why: "Validação explícita reduziu ruído." },
  ];

  const sum = impacts.reduce((acc, x) => acc + x.d, 0);
  const diff = delta - sum;
  if (impacts.length > 0 && diff !== 0) impacts[0].d += diff;

  return {
    analysisId: uuid(),
    analysisVersion: "v2",
    conversaId,
    createdAt: nowIso(),
    source: "MOCK",
    snapshot: { lastEventAt: nowIso(), eventCount: 5 },
    score: { previous, current, delta },
    messageImpacts: impacts.map((x) => {
      const direction: "UP" | "DOWN" | "NEUTRAL" =
        x.d > 0 ? "UP" : x.d < 0 ? "DOWN" : "NEUTRAL";
      return {
        eventId: uuid(),
        eventLabel: x.label,
        delta: clamp(x.d, -10, 10),
        direction,
        rationale: x.why,
      };
    }),
    patterns: [
      { type: "POSITIVE", title: "Clareza e consistência", description: "Intenção clara tende a subir score." },
      { type: "NEGATIVE", title: "Risco de ruído emocional", description: "Ambiguidade pode derrubar score rápido." },
    ],
    risks: [
      { level: "MEDIUM", description: "Cobrança implícita tende a fechar o outro lado." },
      { level: "LOW", description: "Oscilações viram instabilidade sem reafirmação de intenção." },
    ],
    recommendations: [
      { priority: 1, text: "Reafirme a intenção em 1 frase simples, sem pressão." },
      { priority: 2, text: "Valide a outra pessoa antes de sugerir o próximo passo." },
      { priority: 3, text: "Evite indiretas; prefira clareza direta." },
    ],
    summary: {
      headline: "Você está ganhando tração. Mantenha consistência.",
      statusLabel: delta > 0 ? "Evolução positiva" : delta < 0 ? "Oscilação negativa" : "Estável",
      confidenceLevel: 78,
    },
  };
}

function buildSuccessV11(conversaId: string): DeepAnalyzeSuccessV11 {
  const creditsUsed = 12;
  const creditsBalanceAfter = 340;

  const deepMonthly: DeepMonthly = {
    limit: 10,
    used: 3,
    remaining: 7,
    cycleRef: currentCycleRef(),
  };

  return {
    deep: buildDeepMock(conversaId),
    creditsUsed,
    creditsBalanceAfter,
    deepMonthly,
  };
}

function respondMock(mock: MockCode) {
  if (mock === "401") return NextResponse.json({}, { status: 401 });
  if (mock === "403") return NextResponse.json({ code: "INSUFFICIENT_CREDITS" }, { status: 403 });
  if (mock === "500") return NextResponse.json({}, { status: 500 });

  if (mock === "429") {
    return NextResponse.json(
      { code: "DEEP_MONTHLY_LIMIT_REACHED", limit: 7, used: 7, cycleRef: currentCycleRef() },
      { status: 429 },
    );
  }

  return null;
}

// ✅ GET só para validar no browser (sem precisar POST)
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ message: "conversaId inválido" }, { status: 400 });

  const mock = getMockCode(req.url);
  const mocked = respondMock(mock);
  if (mocked) return mocked;

  return NextResponse.json(
    {
      ok: true,
      info: "GET de teste ativo. Use ?mock=401|403|429|500. Para fluxo real a UI usa POST.",
      sample: buildSuccessV11(id),
    },
    { status: 200 },
  );
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ message: "conversaId inválido" }, { status: 400 });

  const mock = getMockCode(req.url);
  const mocked = respondMock(mock);
  if (mocked) return mocked;

  // Ainda mocado (sem backend)
  await req.json().catch(() => ({} as DeepAnalysisRequestBody));

  // ✅ shape correto (Contrato UX v1.1)
  return NextResponse.json(buildSuccessV11(id), { status: 200 });
}
