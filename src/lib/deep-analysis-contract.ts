import type { GoalArea } from "@/lib/objectives";

/**
 * Request body que o front manda para /api/conversas/:id/deep-analysis
 * (route.ts espera mode/forceRecompute)
 */
export type DeepAnalysisRequestBody = {
  mode?: "AUTO";
  forceRecompute?: boolean;
};

export type ConversaGoal = {
  area: GoalArea;
  currentStateId: string;
  desiredStateId: string;
};

export type Conversa = {
  id: string;
  name: string;
  goal: ConversaGoal;
  createdAt: string; // ISO
};

export type ConversaAnalysis = {
  id: string;
  conversaId: string;
  createdAt: string; // ISO
  score: number | null;
  label: string | null;
  messageCountApprox: number;
};

/**
 * ✅ Contrato alinhado com:
 * - src/app/api/conversas/[id]/deep-analysis/route.ts (buildMock/tryCallBackend)
 * - src/app/conversas/[id]/profunda/page.tsx (deep.source, deep.snapshot.eventCount, impacts eventId/eventLabel)
 */
export type DeepAnalysisV2 = {
  analysisId: string;
  analysisVersion: "v2";
  conversaId: string;
  createdAt: string; // ISO
  source: "CACHE" | "RECOMPUTED" | "MOCK";
  snapshot: {
    lastEventAt: string; // ISO
    eventCount: number;
  };
  score: {
    previous: number;
    current: number;
    delta: number;
  };
  messageImpacts: Array<{
    eventId: string;
    eventLabel: string;
    delta: number;
    direction: "UP" | "DOWN" | "NEUTRAL";
    rationale: string;
  }>;
  patterns: Array<{
    type: "POSITIVE" | "NEGATIVE";
    title: string;
    description: string;
  }>;
  risks: Array<{
    level: "LOW" | "MEDIUM" | "HIGH";
    description: string;
  }>;
  recommendations: Array<{
    priority: 1 | 2 | 3;
    text: string;
  }>;
  summary: {
    headline: string;
    statusLabel: string;
    confidenceLevel: number; // 0..100
  };
};

const KEY_CONVERSAS = "decoder.conversas.v1";
const KEY_CONVERSA_ANALYSES = "decoder.conversaAnalyses.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readConversas(): Conversa[] {
  if (typeof window === "undefined") return [];
  return safeParse<Conversa[]>(localStorage.getItem(KEY_CONVERSAS), []);
}

function writeConversas(items: Conversa[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_CONVERSAS, JSON.stringify(items));
}

function readAnalyses(): ConversaAnalysis[] {
  if (typeof window === "undefined") return [];
  return safeParse<ConversaAnalysis[]>(
    localStorage.getItem(KEY_CONVERSA_ANALYSES),
    [],
  );
}

function writeAnalyses(items: ConversaAnalysis[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_CONVERSA_ANALYSES, JSON.stringify(items));
}

export function listConversas(): Conversa[] {
  return readConversas().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getConversa(id: string): Conversa | null {
  const items = readConversas();
  return items.find((c) => c.id === id) ?? null;
}

export function createConversa(input: { name: string; goal: ConversaGoal }): Conversa {
  const now = new Date().toISOString();
  const c: Conversa = {
    id: crypto.randomUUID(),
    name: input.name,
    goal: input.goal,
    createdAt: now,
  };

  const list = readConversas();
  list.unshift(c);
  writeConversas(list);
  return c;
}

export function deleteConversa(id: string) {
  const list = readConversas().filter((c) => c.id !== id);
  writeConversas(list);

  const a = readAnalyses().filter((x) => x.conversaId !== id);
  writeAnalyses(a);
}

export function listConversaAnalyses(conversaId: string): ConversaAnalysis[] {
  return readAnalyses()
    .filter((a) => a.conversaId === conversaId)
    .sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1));
}

export function addConversaAnalysis(input: {
  conversaId: string;
  score: number | null;
  label: string | null;
  messageCountApprox: number;
}): ConversaAnalysis {
  const now = new Date().toISOString();
  const item: ConversaAnalysis = {
    id: crypto.randomUUID(),
    conversaId: input.conversaId,
    createdAt: now,
    score: input.score,
    label: input.label,
    messageCountApprox: input.messageCountApprox,
  };

  const all = readAnalyses();
  all.unshift(item);
  writeAnalyses(all);
  return item;
}

export function computeTrend(analyses: ConversaAnalysis[]): {
  arrow: "↑" | "↓" | "→";
  note: string;
} {
  const list = analyses
    .filter((a) => typeof a.score === "number")
    .map((a) => a.score as number);

  if (list.length < 2) return { arrow: "→", note: "Sem tendência suficiente" };

  const latest = list[0];
  const prev = list[1];

  const delta = latest - prev;

  if (delta > 0) return { arrow: "↑", note: "Melhorando" };
  if (delta < 0) return { arrow: "↓", note: "Piorando" };
  return { arrow: "→", note: "Estável" };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildMessageImpactsFromAnalyses(
  sortedDesc: ConversaAnalysis[],
  maxItems: number,
): DeepAnalysisV2["messageImpacts"] {
  const items = sortedDesc
    .filter((a) => typeof a.score === "number")
    .slice(0, maxItems);

  if (items.length === 0) return [];

  const impacts: DeepAnalysisV2["messageImpacts"] = [];

  for (let i = 0; i < items.length; i++) {
    const cur = items[i];
    const prev = items[i + 1];

    const curScore = (cur.score ?? 0) as number;
    const prevScore =
      prev && typeof prev.score === "number" ? (prev.score as number) : curScore;

    const delta = clamp(curScore - prevScore, -10, 10);
    const direction = delta > 0 ? "UP" : delta < 0 ? "DOWN" : "NEUTRAL";

    const eventLabel = `Entrada ${items.length - i} — ${new Date(cur.createdAt).toLocaleString()}`;

    const rationale =
      direction === "UP"
        ? "Avanço detectado: mais clareza/consistência neste trecho."
        : direction === "DOWN"
        ? "Queda detectada: possível ruído, tensão ou desalinhamento."
        : "Impacto neutro: pouca variação no padrão geral.";

    impacts.push({
      eventId: cur.id,
      eventLabel,
      delta,
      direction,
      rationale,
    });
  }

  return impacts;
}

export function getDeepAnalysisV2Mock(conversaId: string): DeepAnalysisV2 {
  const analysesDesc = listConversaAnalyses(conversaId);

  const scored = analysesDesc
    .filter((a) => typeof a.score === "number")
    .map((a) => a.score as number);

  const current = scored.length > 0 ? scored[0] : 0;
  const previous = scored.length > 1 ? scored[1] : current;
  const delta = clamp(current - previous, -20, 20);

  const impactsRaw = buildMessageImpactsFromAnalyses(analysesDesc, 6);

  const sum = impactsRaw.reduce((acc, x) => acc + x.delta, 0);
  const diff = delta - sum;
  if (impactsRaw.length > 0 && diff !== 0) {
    impactsRaw[0] = { ...impactsRaw[0], delta: impactsRaw[0].delta + diff };
    impactsRaw[0].direction =
      impactsRaw[0].delta > 0 ? "UP" : impactsRaw[0].delta < 0 ? "DOWN" : "NEUTRAL";
  }

  const statusLabel =
    delta > 0 ? "Evolução positiva" : delta < 0 ? "Oscilação negativa" : "Estável";

  const headline =
    delta > 0
      ? "Você está ganhando tração. Mantenha consistência no tom e na intenção."
      : delta < 0
      ? "A jornada perdeu força. Ajuste a forma antes de avançar o conteúdo."
      : "Você está estável. Pequenos ajustes podem destravar evolução.";

  const confidenceLevel = clamp(55 + analysesDesc.length * 5, 55, 90);

  const patterns: DeepAnalysisV2["patterns"] = [
    {
      type: "POSITIVE",
      title: "Clareza e consistência",
      description:
        "Quando você mantém mensagens diretas e alinhadas ao objetivo, o score tende a subir.",
    },
    {
      type: "NEGATIVE",
      title: "Risco de ruído emocional",
      description:
        "Mensagens com ambiguidade ou cobrança implícita podem derrubar o score rapidamente.",
    },
  ];

  const risks: DeepAnalysisV2["risks"] = [
    {
      level: delta < 0 ? "HIGH" : "MEDIUM",
      description:
        "Se o padrão de tensão/ruído continuar, a outra parte tende a se fechar ou evitar continuidade.",
    },
    {
      level: "LOW",
      description:
        "Oscilações pequenas podem virar instabilidade se a intenção não for reafirmada com clareza.",
    },
  ];

  const recommendations: DeepAnalysisV2["recommendations"] = [
    { priority: 1, text: "Mantenha o tom leve e objetivo em 1–2 mensagens." },
    { priority: 2, text: "Valide a outra pessoa antes de sugerir o próximo passo." },
    { priority: 3, text: "Evite ironia/indiretas: prefira clareza simples." },
  ];

  const lastEventAt = analysesDesc[0]?.createdAt ?? new Date().toISOString();

  return {
    analysisId: crypto.randomUUID(),
    analysisVersion: "v2",
    conversaId,
    createdAt: new Date().toISOString(),
    source: "MOCK",
    snapshot: {
      lastEventAt,
      eventCount: analysesDesc.length,
    },
    score: { previous, current, delta },
    messageImpacts: impactsRaw,
    patterns,
    risks,
    recommendations,
    summary: {
      headline,
      statusLabel,
      confidenceLevel,
    },
  };
}
