import type {
  ConversationValidationCode,
  ValidationStats,
} from "./conversation";
import {
  MIN_NON_WHITESPACE_LENGTH,
  MIN_WORDS,
} from "./conversation";

export type ValidationUxMessage = {
  title: string;
  reason: string;
  fix: string;
};

/**
 * Importante:
 * - Essas mensagens são UX (front-only).
 * - Sempre incluem mínimos explícitos.
 * - Se stats vierem, mostramos “atual vs mínimo” quando fizer sentido.
 */
export function getConversationValidationMessage(
  code: ConversationValidationCode,
  stats?: Partial<ValidationStats>,
): ValidationUxMessage {
  const nonWs =
    typeof stats?.nonWhitespaceLength === "number"
      ? stats!.nonWhitespaceLength
      : null;

  const words =
    typeof stats?.wordCount === "number" ? stats!.wordCount : null;

  const currentUseful = nonWs != null ? ` (atual: ${nonWs})` : "";
  const currentWords = words != null ? ` (atual: ${words})` : "";

  switch (code) {
    case "EMPTY":
      return {
        title: "Cole uma conversa para analisar",
        reason: "Sem texto, eu não tenho sinais suficientes para gerar uma leitura.",
        fix: "Cole as mensagens aqui e tente novamente.",
      };

    case "TOO_SHORT":
      return {
        title: "Texto curto demais para uma leitura confiável",
        reason: `O conteúdo útil ainda é pequeno para entender contexto e intenção. Mínimo: ${MIN_NON_WHITESPACE_LENGTH} caracteres úteis (sem espaços).${currentUseful}`,
        fix: "Cole mais mensagens (ideal: 6–10 linhas) e inclua trechos com intenção/decisão.",
      };

    case "TOO_FEW_WORDS":
      return {
        title: "Poucas palavras para interpretar o contexto",
        reason: `O texto tem pouca “matéria” semântica para estimar tom e direção. Mínimo: ${MIN_WORDS} palavras.${currentWords}`,
        fix: "Inclua mais falas completas (perguntas, respostas e reações), não só fragmentos.",
      };

    case "TOO_REPETITIVE":
      return {
        title: "Texto repetitivo demais",
        reason:
          "Há repetição alta de linhas/expressões, o que distorce a leitura (parece loop ou spam).",
        fix: "Cole uma parte diferente da conversa (ou inclua respostas do outro lado).",
      };

    case "TOO_MANY_SAME_CHAR":
      return {
        title: "Muito ruído de letras repetidas",
        reason:
          "Sequências longas da mesma letra (ex.: “aaaaaa”, “ssssss”) tornam a análise imprecisa.",
        fix: "Remova o ruído e cole as mensagens reais (frases completas).",
      };

    case "GIBBERISH":
      return {
        title: "Texto parece aleatório",
        reason:
          "O conteúdo parece ter baixa coerência (muitos fragmentos), então a leitura tende a virar chute.",
        fix: "Cole mensagens legíveis (frases completas) e inclua contexto (o que aconteceu / o que foi dito).",
      };

    default:
      return {
        title: "Texto inválido para análise",
        reason: "O texto não atende o mínimo de qualidade para uma leitura estável.",
        fix: "Cole mais mensagens reais da conversa e tente novamente.",
      };
  }
}
