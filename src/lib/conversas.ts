import type { GoalArea } from "@/lib/objectives";

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

  /**
   * ✅ Opcional por compatibilidade com dados antigos (localStorage legado).
   * Quando o backend real entrar, será preenchido (ou ficará null se o backend não enviar).
   */
  creditsUsed?: number | null;
};

const KEY_CONVERSAS = "decoder.conversas.v1";
const KEY_CONVERSA_ANALYSES = "decoder.conversaAnalyses.v1";

/**
 * LEGADO (containers) — migrar uma única vez
 */
const LEGACY_KEY_CONTAINERS = "decoder.containers.v1";
const LEGACY_KEY_CONTAINER_ANALYSES = "decoder.containerAnalyses.v1";
const MIGRATION_FLAG = "decoder.migrations.containers_to_conversas.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Normaliza análises já existentes (novo schema) garantindo creditsUsed (opcional) coerente.
 * Evita crash/TS mismatch quando houver registros antigos sem o campo.
 */
function normalizeAnalyses(items: any[]): ConversaAnalysis[] {
  return (items ?? []).map((a: any) => ({
    id: String(a.id),
    conversaId: String(a.conversaId),
    createdAt: typeof a.createdAt === "string" ? a.createdAt : new Date().toISOString(),
    score: typeof a.score === "number" ? a.score : null,
    label: typeof a.label === "string" ? a.label : null,
    messageCountApprox: typeof a.messageCountApprox === "number" ? a.messageCountApprox : 1,
    creditsUsed: typeof a.creditsUsed === "number" ? a.creditsUsed : null,
  }));
}

function maybeMigrateLegacyOnce() {
  if (!isBrowser()) return;

  const already = localStorage.getItem(MIGRATION_FLAG);
  if (already === "done") return;

  const existingConversas = safeParse<Conversa[]>(
    localStorage.getItem(KEY_CONVERSAS),
    [],
  );

  // ✅ aqui pode vir sem creditsUsed — então normaliza
  const existingAnalysesRaw = safeParse<any[]>(
    localStorage.getItem(KEY_CONVERSA_ANALYSES),
    [],
  );
  const existingAnalyses = normalizeAnalyses(existingAnalysesRaw);

  const legacyContainers = safeParse<any[]>(
    localStorage.getItem(LEGACY_KEY_CONTAINERS),
    [],
  );
  const legacyAnalyses = safeParse<any[]>(
    localStorage.getItem(LEGACY_KEY_CONTAINER_ANALYSES),
    [],
  );

  // Se já existe dado novo, só marca e sai (evita merge imprevisível).
  if (existingConversas.length > 0 || existingAnalyses.length > 0) {
    // garante persistência normalizada (caso já exista, mas faltava creditsUsed)
    localStorage.setItem(KEY_CONVERSA_ANALYSES, JSON.stringify(existingAnalyses));
    localStorage.setItem(MIGRATION_FLAG, "done");
    return;
  }

  // Se não tem legado, marca e sai.
  if (legacyContainers.length === 0 && legacyAnalyses.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, "done");
    return;
  }

  const migratedConversas: Conversa[] = legacyContainers.map((c) => ({
    id: String(c.id),
    name: typeof c.name === "string" ? c.name : "Sem nome",
    goal: {
      area: String(c?.goal?.area ?? "RELACIONAMENTO") as GoalArea,
      currentStateId: String(c?.goal?.currentStateId ?? "unknown"),
      desiredStateId: String(c?.goal?.desiredStateId ?? "unknown"),
    },
    createdAt:
      typeof c.createdAt === "string" ? c.createdAt : new Date().toISOString(),
  }));

  const migratedAnalyses: ConversaAnalysis[] = legacyAnalyses.map((a) => ({
    id: String(a.id),
    conversaId: String(a.containerId ?? a.conversaId),
    createdAt:
      typeof a.createdAt === "string" ? a.createdAt : new Date().toISOString(),
    score: typeof a.score === "number" ? a.score : null,
    label: typeof a.label === "string" ? a.label : null,
    messageCountApprox:
      typeof a.messageCountApprox === "number" ? a.messageCountApprox : 1,
    creditsUsed: typeof a.creditsUsed === "number" ? a.creditsUsed : null,
  }));

  localStorage.setItem(KEY_CONVERSAS, JSON.stringify(migratedConversas));
  localStorage.setItem(KEY_CONVERSA_ANALYSES, JSON.stringify(migratedAnalyses));

  // Remove legado para não existir “paralelo”
  localStorage.removeItem(LEGACY_KEY_CONTAINERS);
  localStorage.removeItem(LEGACY_KEY_CONTAINER_ANALYSES);

  localStorage.setItem(MIGRATION_FLAG, "done");
}

function readConversas(): Conversa[] {
  if (!isBrowser()) return [];
  maybeMigrateLegacyOnce();
  return safeParse<Conversa[]>(localStorage.getItem(KEY_CONVERSAS), []);
}

function writeConversas(items: Conversa[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_CONVERSAS, JSON.stringify(items));
}

function readAnalyses(): ConversaAnalysis[] {
  if (!isBrowser()) return [];
  maybeMigrateLegacyOnce();

  const raw = safeParse<any[]>(
    localStorage.getItem(KEY_CONVERSA_ANALYSES),
    [],
  );

  // ✅ normaliza sempre
  const normalized = normalizeAnalyses(raw);

  // regrava para estabilizar schema local
  localStorage.setItem(KEY_CONVERSA_ANALYSES, JSON.stringify(normalized));
  return normalized;
}

function writeAnalyses(items: ConversaAnalysis[]) {
  if (!isBrowser()) return;
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
    .sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1)); // desc
}

export function addConversaAnalysis(input: {
  conversaId: string;
  score: number | null;
  label: string | null;
  messageCountApprox: number;
  creditsUsed?: number | null;
}): ConversaAnalysis {
  const now = new Date().toISOString();
  const item: ConversaAnalysis = {
    id: crypto.randomUUID(),
    conversaId: input.conversaId,
    createdAt: now,
    score: input.score,
    label: input.label,
    messageCountApprox: input.messageCountApprox,
    creditsUsed:
      typeof input.creditsUsed === "number" ? input.creditsUsed : null,
  };

  const all = readAnalyses();
  all.unshift(item);
  writeAnalyses(all);
  return item;
}

export function computeTrend(
  analyses: ConversaAnalysis[],
): { arrow: "↑" | "↓" | "→"; note: string; percent: number | null } {
  const list = analyses
    .filter((a) => typeof a.score === "number")
    .map((a) => a.score as number);

  if (list.length < 2) {
    return { arrow: "→", note: "Sem tendência suficiente", percent: null };
  }

  const latest = list[0];
  const prev = list[1];
  const delta = latest - prev;

  const percent = prev === 0 ? null : Math.round((delta / Math.abs(prev)) * 100);

  if (delta > 0) return { arrow: "↑", note: "Melhorando", percent };
  if (delta < 0) return { arrow: "↓", note: "Piorando", percent };
  return { arrow: "→", note: "Estável", percent: 0 };
}

export function sumCreditsUsed(analyses: ConversaAnalysis[]): number | null {
  const nums = analyses
    .map((a) => a.creditsUsed)
    .filter((x): x is number => typeof x === "number");

  if (nums.length === 0) return null;
  return nums.reduce((acc, n) => acc + n, 0);
}
