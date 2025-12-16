import type { RelationshipType } from "@/lib/relationships";

export type HistoryItem = {
  id: string;
  createdAt: string; // ISO
  relationshipType: RelationshipType;
  messageCountApprox: number;
  score: number | null;
  containerId: string | null;

  /**
   * ✅ opcional por compatibilidade com histórico já salvo.
   * quando o backend real entrar, será preenchido (ou null).
   */
  creditsUsed?: number | null;
};

const KEY_HISTORY = "decoder.history.v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalize(items: any[]): HistoryItem[] {
  return (items ?? []).map((x: any) => ({
    id: String(x?.id ?? crypto.randomUUID()),
    createdAt:
      typeof x?.createdAt === "string" ? x.createdAt : new Date().toISOString(),
    relationshipType: String(x?.relationshipType ?? "ROMANTICA") as RelationshipType,
    messageCountApprox:
      typeof x?.messageCountApprox === "number" ? x.messageCountApprox : 1,
    score: typeof x?.score === "number" ? x.score : null,
    containerId: typeof x?.containerId === "string" ? x.containerId : null,
    creditsUsed: typeof x?.creditsUsed === "number" ? x.creditsUsed : null,
  }));
}

export function listHistoryItems(): HistoryItem[] {
  if (!isBrowser()) return [];
  const raw = safeParse<any[]>(localStorage.getItem(KEY_HISTORY), []);
  const normalized = normalize(raw);

  // regrava para estabilizar schema local (inclui creditsUsed)
  localStorage.setItem(KEY_HISTORY, JSON.stringify(normalized));

  return normalized.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function saveHistoryItem(input: HistoryItem): HistoryItem {
  if (!isBrowser()) return input;

  const list = listHistoryItems();

  // normaliza input (garante creditsUsed coerente)
  const item: HistoryItem = {
    id: String(input.id),
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString(),
    relationshipType: input.relationshipType,
    messageCountApprox:
      typeof input.messageCountApprox === "number" ? input.messageCountApprox : 1,
    score: typeof input.score === "number" ? input.score : null,
    containerId: typeof input.containerId === "string" ? input.containerId : null,
    creditsUsed: typeof input.creditsUsed === "number" ? input.creditsUsed : null,
  };

  list.unshift(item);
  localStorage.setItem(KEY_HISTORY, JSON.stringify(list));
  return item;
}

export function clearHistory() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY_HISTORY);
}
