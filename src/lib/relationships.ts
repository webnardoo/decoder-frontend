export type RelationshipType = "ROMANTICA" | "AMIZADE" | "FAMILIA" | "TRABALHO";

export const relationshipOptions: { value: RelationshipType; label: string }[] = [
  { value: "ROMANTICA", label: "Amorosa" },
  { value: "AMIZADE", label: "Amizade" },
  { value: "FAMILIA", label: "Família" },
  { value: "TRABALHO", label: "Trabalho" },
];
