export type ConversationValidationCode =
  | "EMPTY"
  | "TOO_SHORT"
  | "TOO_FEW_WORDS"
  | "TOO_REPETITIVE"
  | "TOO_MANY_SAME_CHAR"
  | "GIBBERISH";

export type ValidationStats = {
  rawLength: number;
  normalizedLength: number;
  nonWhitespaceLength: number;
  lineCount: number;
  wordCount: number;
  uniqueCharRatio: number;
  mostCommonCharRatio: number;
  maxSameCharRun: number;
  repeatedLineRatio: number;
  repeatedBigramRatio: number;
  vowelRatio: number;
};

export type ConversationValidationResult =
  | { ok: true; normalized: string; stats: ValidationStats }
  | {
      ok: false;
      code: ConversationValidationCode;
      normalized: string;
      stats: ValidationStats;
    };

// ✅ Thresholds explícitos para UX
export const MIN_NON_WHITESPACE_LENGTH = 60; // caracteres “úteis” (sem espaços)
export const MIN_WORDS = 12; // palavras mínimas
export const MAX_REPEAT_LINE_RATIO = 0.45;
export const MAX_REPEAT_BIGRAM_RATIO = 0.35;
export const MAX_SAME_CHAR_RUN = 12;
export const MAX_MOST_COMMON_CHAR_RATIO = 0.22;
export const MIN_VOWEL_RATIO_FOR_GIBBERISH = 0.18;
export const MIN_UNIQUE_CHAR_RATIO_FOR_GIBBERISH = 0.22;

const VOWELS = new Set([
  "a",
  "e",
  "i",
  "o",
  "u",
  "á",
  "à",
  "ã",
  "â",
  "é",
  "ê",
  "í",
  "ó",
  "ô",
  "õ",
  "ú",
  "ü",
]);

function normalizeText(input: string) {
  const raw = input ?? "";
  const trimmed = raw.trim();
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const normalized = lines.join("\n").replace(/[ \t]+/g, " ");
  return { raw, normalized, lines };
}

function countMaxSameCharRun(s: string) {
  let maxRun = 0;
  let run = 0;
  let prev = "";
  for (const ch of s) {
    if (ch === prev) run += 1;
    else run = 1;
    prev = ch;
    if (run > maxRun) maxRun = run;
  }
  return maxRun;
}

function ratios(s: string) {
  const lower = s.toLowerCase();
  const chars = Array.from(lower).filter((c) => c !== "\n");
  const total = chars.length || 1;

  const freq = new Map<string, number>();
  let vowels = 0;

  for (const c of chars) {
    freq.set(c, (freq.get(c) ?? 0) + 1);
    if (VOWELS.has(c)) vowels += 1;
  }

  const uniqueCharRatio = freq.size / total;

  let mostCommon = 0;
  for (const v of freq.values()) mostCommon = Math.max(mostCommon, v);
  const mostCommonCharRatio = mostCommon / total;

  const vowelRatio = vowels / total;

  return { uniqueCharRatio, mostCommonCharRatio, vowelRatio };
}

function repeatedLineRatio(lines: string[]) {
  if (lines.length <= 1) return 0;

  const canonical = lines.map((l) =>
    l.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim(),
  );

  const freq = new Map<string, number>();
  for (const l of canonical) freq.set(l, (freq.get(l) ?? 0) + 1);

  let repeatedCount = 0;
  for (const v of freq.values()) if (v > 1) repeatedCount += v;

  return repeatedCount / lines.length;
}

function repeatedBigramRatio(text: string) {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\n]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length < 6) return 0;

  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(tokens[i] + " " + tokens[i + 1]);
  }

  const freq = new Map<string, number>();
  for (const b of bigrams) freq.set(b, (freq.get(b) ?? 0) + 1);

  let repeated = 0;
  for (const v of freq.values()) if (v > 1) repeated += v;

  return repeated / bigrams.length;
}

// ✅ Exceções BR para “repetição com significado”.
// Importante: isso NÃO valida texto só com risada; apenas evita derrubar um texto maior.
type SemanticRepeatPattern = RegExp;

export const SEMANTIC_REPEAT_PATTERNS: SemanticRepeatPattern[] = [
  // risadas BR
  /\b(?:k){3,}\b/i, // kkkk...
  /\b(?:rs){2,}\b/i, // rsrsrs...
  /\b(?:ha){2,}\b/i, // hahaha...
  /\b(?:hua){2,}\b/i, // huahuahua...
  /\b(?:he){2,}\b/i, // hehehe...
  /\b(?:hi){2,}\b/i, // hihihi...
  /\b(?:hu){2,}\b/i, // huhuhu...

  // reações comuns
  /\b(?:aff+)\b/i, // affff
  /\b(?:ai+)\b/i, // aii
  /\b(?:eita+)\b/i, // eitaaa
  /\b(?:opa+)\b/i, // opaaa
  /\b(?:uau+)\b/i, // uauuu
  /\b(?:nossa+)\b/i, // nossa...
  /\b(?:mds+)\b/i, // mds
];

// Heurística: texto técnico/estruturado real (não diálogo) — deve passar
function looksLikeStructuredText(text: string) {
  const hasPunctuation = /[.!?:;]/.test(text);
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 8);
  const avgSentenceLength =
    sentences.reduce((a, s) => a + s.length, 0) / Math.max(1, sentences.length);

  return hasPunctuation && sentences.length >= 3 && avgSentenceLength >= 20;
}

export function validateConversationText(
  input: string,
): ConversationValidationResult {
  const { raw, normalized, lines } = normalizeText(input);

  const rawLength = raw.length;
  const normalizedLength = normalized.length;
  const nonWhitespaceLength = normalized.replace(/\s+/g, "").length;

  const wordCount = normalized
    .replace(/[^\p{L}\p{N}\s\n]/gu, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  const { uniqueCharRatio, mostCommonCharRatio, vowelRatio } = ratios(normalized);
  const maxSameCharRun = countMaxSameCharRun(normalized.toLowerCase());
  const rLine = repeatedLineRatio(lines);
  const rBigram = repeatedBigramRatio(normalized);

  const stats: ValidationStats = {
    rawLength,
    normalizedLength,
    nonWhitespaceLength,
    lineCount: lines.length,
    wordCount,
    uniqueCharRatio,
    mostCommonCharRatio,
    maxSameCharRun,
    repeatedLineRatio: rLine,
    repeatedBigramRatio: rBigram,
    vowelRatio,
  };

  if (nonWhitespaceLength === 0) {
    return { ok: false, code: "EMPTY", normalized, stats };
  }

  // Curto de verdade (conteúdo útil)
  if (nonWhitespaceLength < MIN_NON_WHITESPACE_LENGTH) {
    return { ok: false, code: "TOO_SHORT", normalized, stats };
  }

  // Pouco conteúdo “semântico”
  if (wordCount < MIN_WORDS) {
    return { ok: false, code: "TOO_FEW_WORDS", normalized, stats };
  }

  const structured = looksLikeStructuredText(normalized);
  const hasSemanticRepeat = SEMANTIC_REPEAT_PATTERNS.some((rx) =>
    rx.test(normalized),
  );

  // Loop de texto (só aplica se NÃO for texto estruturado e NÃO tiver padrão semântico)
  if (!structured && !hasSemanticRepeat) {
    if (rLine >= MAX_REPEAT_LINE_RATIO || rBigram >= MAX_REPEAT_BIGRAM_RATIO) {
      return { ok: false, code: "TOO_REPETITIVE", normalized, stats };
    }
  }

  // Spam de caractere
  // ✅ Só derruba se NÃO for texto estruturado e NÃO tiver padrão semântico
  if (!structured && !hasSemanticRepeat) {
    if (
      maxSameCharRun >= MAX_SAME_CHAR_RUN ||
      mostCommonCharRatio >= MAX_MOST_COMMON_CHAR_RATIO
    ) {
      return { ok: false, code: "TOO_MANY_SAME_CHAR", normalized, stats };
    }
  }

  // Gibberish (heurística conservadora)
  if (
    vowelRatio < MIN_VOWEL_RATIO_FOR_GIBBERISH &&
    uniqueCharRatio < MIN_UNIQUE_CHAR_RATIO_FOR_GIBBERISH
  ) {
    return { ok: false, code: "GIBBERISH", normalized, stats };
  }

  return { ok: true, normalized, stats };
}
