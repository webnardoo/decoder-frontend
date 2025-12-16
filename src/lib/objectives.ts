export type GoalArea = "RELACIONAMENTO" | "TRABALHO" | "AMIZADE" | "FAMILIA";

export type GoalState = {
  id: string;
  label: string;
};

export type GoalPreset = {
  id: string;
  area: GoalArea;
  currentStateId: string;
  desiredStateId: string;
  label: string; // rótulo humano do preset (UI)
};

export const goalAreas: { value: GoalArea; label: string }[] = [
  { value: "RELACIONAMENTO", label: "Relacionamento" },
  { value: "TRABALHO", label: "Trabalho" },
  { value: "AMIZADE", label: "Amizade" },
  { value: "FAMILIA", label: "Família" },
];

const REL_CURRENT: GoalState[] = [
  { id: "REL_INICIO", label: "Fase inicial / conhecendo" },
  { id: "REL_INDEFINIDO", label: "Indefinição (vai e volta)" },
  { id: "REL_ESFRIOU", label: "Distanciamento / esfriou" },
  { id: "REL_CONFLITO", label: "Conflito recorrente" },
  { id: "REL_POS_BRIGA", label: "Pós-briga / reparação" },
  { id: "REL_BAIXA_RECIP", label: "Baixa reciprocidade" },
];

const REL_DESIRED: GoalState[] = [
  { id: "REL_AVANCAR_1_PASSO", label: "Avançar um passo (encontro / aproximação)" },
  { id: "REL_CLAREZA", label: "Ter clareza de intenção" },
  { id: "REL_REDUZIR_BRIGAS", label: "Reduzir ruídos e brigas" },
  { id: "REL_RECONSTRUIR", label: "Reconstruir confiança" },
  { id: "REL_ESTAVEL", label: "Construir algo estável" },
  { id: "REL_DECIDIR", label: "Decidir: seguir ou encerrar com maturidade" },
];

const WORK_CURRENT: GoalState[] = [
  { id: "WORK_COBRANCA", label: "Cobrança excessiva" },
  { id: "WORK_ESCOPO_CONFUSO", label: "Escopo confuso / muda toda hora" },
  { id: "WORK_ATRITO_LIDER", label: "Atrito com liderança" },
  { id: "WORK_ATRITO_COLEGA", label: "Atrito com colega" },
  { id: "WORK_PRESSAO_PRAZO", label: "Pressão por prazo" },
  { id: "WORK_DESALINHO", label: "Falta de alinhamento" },
];

const WORK_DESIRED: GoalState[] = [
  { id: "WORK_ALINHAR_ESCOPO", label: "Alinhar escopo e expectativa" },
  { id: "WORK_NEGOCIAR_PRAZO", label: "Negociar prazo com clareza" },
  { id: "WORK_FIRME_SEM_BRIGA", label: "Ser firme sem escalar conflito" },
  { id: "WORK_REDUZIR_ATRITO", label: "Reduzir atrito no dia a dia" },
  { id: "WORK_FORMALIZAR", label: "Formalizar combinados por escrito" },
  { id: "WORK_RECUPERAR_CONFIANCA", label: "Recuperar confiança profissional" },
];

const FRIEND_CURRENT: GoalState[] = [
  { id: "FRIEND_ESFRIOU", label: "Esfriou / sumiços" },
  { id: "FRIEND_RESSENT", label: "Ressentimento / ruído" },
  { id: "FRIEND_DESEQUIL", label: "Desequilíbrio (um procura mais)" },
  { id: "FRIEND_CONFLITO", label: "Conflito recente" },
  { id: "FRIEND_DISTANCIA", label: "Distância por tempo/rotina" },
  { id: "FRIEND_AMBIG", label: "Clima ambíguo / desconforto" },
];

const FRIEND_DESIRED: GoalState[] = [
  { id: "FRIEND_REAPROX", label: "Reaproximar" },
  { id: "FRIEND_CONVERSA_LEVE", label: "Conversar sem clima ruim" },
  { id: "FRIEND_ALINHAR", label: "Alinhar expectativas" },
  { id: "FRIEND_REPARAR", label: "Reparar após conflito" },
  { id: "FRIEND_MANTER", label: "Manter amizade saudável" },
  { id: "FRIEND_LIMITES", label: "Pôr limites sem romper" },
];

const FAM_CURRENT: GoalState[] = [
  { id: "FAM_PASSIVO", label: "Passivo-agressivo" },
  { id: "FAM_CULPA", label: "Cobrança / culpa" },
  { id: "FAM_FALTA_RESPEITO", label: "Falta de respeito em conversas" },
  { id: "FAM_CONFLITO", label: "Conflito recorrente" },
  { id: "FAM_DISTANCIA", label: "Distanciamento" },
  { id: "FAM_CONTROLE", label: "Controle / invasão de limites" },
];

const FAM_DESIRED: GoalState[] = [
  { id: "FAM_LIMITES", label: "Pôr limites sem romper" },
  { id: "FAM_REDUZIR_CONFLITO", label: "Reduzir conflito" },
  { id: "FAM_RECONSTRUIR_DIALOGO", label: "Reconstruir diálogo" },
  { id: "FAM_RESPEITO", label: "Restabelecer respeito" },
  { id: "FAM_CONVIVENCIA", label: "Melhorar convivência" },
  { id: "FAM_DECIDIR_DIST", label: "Decidir distância saudável" },
];

export function getStates(area: GoalArea): { current: GoalState[]; desired: GoalState[] } {
  if (area === "RELACIONAMENTO") return { current: REL_CURRENT, desired: REL_DESIRED };
  if (area === "TRABALHO") return { current: WORK_CURRENT, desired: WORK_DESIRED };
  if (area === "AMIZADE") return { current: FRIEND_CURRENT, desired: FRIEND_DESIRED };
  return { current: FAM_CURRENT, desired: FAM_DESIRED };
}

export function getStateLabel(area: GoalArea, stateId: string, kind: "current" | "desired") {
  const states = getStates(area)[kind];
  return states.find((s) => s.id === stateId)?.label ?? stateId;
}

/**
 * 24 presets (rápidos) — 6 por área.
 * Isso atende sua autorização: “24 containers + objetivos”.
 */
export const goalPresets: GoalPreset[] = [
  // RELACIONAMENTO (6)
  {
    id: "P_REL_01",
    area: "RELACIONAMENTO",
    currentStateId: "REL_INICIO",
    desiredStateId: "REL_AVANCAR_1_PASSO",
    label: "Relacionamento: conhecer → avançar um passo",
  },
  {
    id: "P_REL_02",
    area: "RELACIONAMENTO",
    currentStateId: "REL_INDEFINIDO",
    desiredStateId: "REL_CLAREZA",
    label: "Relacionamento: indefinição → clareza de intenção",
  },
  {
    id: "P_REL_03",
    area: "RELACIONAMENTO",
    currentStateId: "REL_ESFRIOU",
    desiredStateId: "REL_ESTAVEL",
    label: "Relacionamento: esfriou → construir algo estável",
  },
  {
    id: "P_REL_04",
    area: "RELACIONAMENTO",
    currentStateId: "REL_CONFLITO",
    desiredStateId: "REL_REDUZIR_BRIGAS",
    label: "Relacionamento: conflito → reduzir brigas",
  },
  {
    id: "P_REL_05",
    area: "RELACIONAMENTO",
    currentStateId: "REL_POS_BRIGA",
    desiredStateId: "REL_RECONSTRUIR",
    label: "Relacionamento: pós-briga → reconstruir confiança",
  },
  {
    id: "P_REL_06",
    area: "RELACIONAMENTO",
    currentStateId: "REL_BAIXA_RECIP",
    desiredStateId: "REL_DECIDIR",
    label: "Relacionamento: baixa reciprocidade → decidir com maturidade",
  },

  // TRABALHO (6)
  {
    id: "P_WORK_01",
    area: "TRABALHO",
    currentStateId: "WORK_COBRANCA",
    desiredStateId: "WORK_FIRME_SEM_BRIGA",
    label: "Trabalho: cobrança excessiva → firme sem briga",
  },
  {
    id: "P_WORK_02",
    area: "TRABALHO",
    currentStateId: "WORK_ESCOPO_CONFUSO",
    desiredStateId: "WORK_FORMALIZAR",
    label: "Trabalho: escopo confuso → formalizar por escrito",
  },
  {
    id: "P_WORK_03",
    area: "TRABALHO",
    currentStateId: "WORK_PRESSAO_PRAZO",
    desiredStateId: "WORK_NEGOCIAR_PRAZO",
    label: "Trabalho: pressão por prazo → negociar prazo",
  },
  {
    id: "P_WORK_04",
    area: "TRABALHO",
    currentStateId: "WORK_ATRITO_LIDER",
    desiredStateId: "WORK_REDUZIR_ATRITO",
    label: "Trabalho: atrito com liderança → reduzir atrito",
  },
  {
    id: "P_WORK_05",
    area: "TRABALHO",
    currentStateId: "WORK_ATRITO_COLEGA",
    desiredStateId: "WORK_ALINHAR_ESCOPO",
    label: "Trabalho: atrito com colega → alinhar expectativa",
  },
  {
    id: "P_WORK_06",
    area: "TRABALHO",
    currentStateId: "WORK_DESALINHO",
    desiredStateId: "WORK_RECUPERAR_CONFIANCA",
    label: "Trabalho: desalinho → recuperar confiança",
  },

  // AMIZADE (6)
  {
    id: "P_FRIEND_01",
    area: "AMIZADE",
    currentStateId: "FRIEND_ESFRIOU",
    desiredStateId: "FRIEND_REAPROX",
    label: "Amizade: esfriou → reaproximar",
  },
  {
    id: "P_FRIEND_02",
    area: "AMIZADE",
    currentStateId: "FRIEND_RESSENT",
    desiredStateId: "FRIEND_REPARAR",
    label: "Amizade: ressentimento → reparar",
  },
  {
    id: "P_FRIEND_03",
    area: "AMIZADE",
    currentStateId: "FRIEND_DESEQUIL",
    desiredStateId: "FRIEND_ALINHAR",
    label: "Amizade: desequilíbrio → alinhar expectativas",
  },
  {
    id: "P_FRIEND_04",
    area: "AMIZADE",
    currentStateId: "FRIEND_CONFLITO",
    desiredStateId: "FRIEND_CONVERSA_LEVE",
    label: "Amizade: conflito → conversar leve",
  },
  {
    id: "P_FRIEND_05",
    area: "AMIZADE",
    currentStateId: "FRIEND_DISTANCIA",
    desiredStateId: "FRIEND_MANTER",
    label: "Amizade: distância → manter saudável",
  },
  {
    id: "P_FRIEND_06",
    area: "AMIZADE",
    currentStateId: "FRIEND_AMBIG",
    desiredStateId: "FRIEND_LIMITES",
    label: "Amizade: clima ambíguo → pôr limites",
  },

  // FAMÍLIA (6)
  {
    id: "P_FAM_01",
    area: "FAMILIA",
    currentStateId: "FAM_PASSIVO",
    desiredStateId: "FAM_RECONSTRUIR_DIALOGO",
    label: "Família: passivo-agressivo → reconstruir diálogo",
  },
  {
    id: "P_FAM_02",
    area: "FAMILIA",
    currentStateId: "FAM_CULPA",
    desiredStateId: "FAM_LIMITES",
    label: "Família: culpa → limites sem romper",
  },
  {
    id: "P_FAM_03",
    area: "FAMILIA",
    currentStateId: "FAM_FALTA_RESPEITO",
    desiredStateId: "FAM_RESPEITO",
    label: "Família: falta de respeito → restabelecer respeito",
  },
  {
    id: "P_FAM_04",
    area: "FAMILIA",
    currentStateId: "FAM_CONFLITO",
    desiredStateId: "FAM_REDUZIR_CONFLITO",
    label: "Família: conflito → reduzir conflito",
  },
  {
    id: "P_FAM_05",
    area: "FAMILIA",
    currentStateId: "FAM_DISTANCIA",
    desiredStateId: "FAM_CONVIVENCIA",
    label: "Família: distanciamento → melhorar convivência",
  },
  {
    id: "P_FAM_06",
    area: "FAMILIA",
    currentStateId: "FAM_CONTROLE",
    desiredStateId: "FAM_DECIDIR_DIST",
    label: "Família: controle → decidir distância saudável",
  },
];
