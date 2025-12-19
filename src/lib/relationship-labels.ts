export type RelationshipType = "ROMANTICA" | "AMIZADE" | "FAMILIA" | "TRABALHO";

export const RELATIONSHIP_LABEL: Record<RelationshipType, string> = {
  ROMANTICA: "Amorosa",
  AMIZADE: "Amizade",
  FAMILIA: "Família",
  TRABALHO: "Trabalho",
};
