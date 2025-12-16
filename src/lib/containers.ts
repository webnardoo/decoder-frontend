import type {
  ConversaGoal,
  Conversa,
  ConversaAnalysis,
} from "@/lib/conversas";

import {
  listConversas,
  getConversa,
  createConversa,
  deleteConversa,
  listConversaAnalyses,
  addConversaAnalysis,
  computeTrend as computeConversaTrend,
} from "@/lib/conversas";

// Tipos legados (mantidos só para compat)
export type ContainerGoal = ConversaGoal;
export type Container = Conversa;
export type ContainerAnalysis = {
  id: string;
  containerId: string;
  createdAt: string;
  score: number | null;
  label: string | null;
  messageCountApprox: number;
};

export function listContainers(): Container[] {
  return listConversas();
}

export function getContainer(id: string): Container | null {
  return getConversa(id);
}

export function createContainer(input: { name: string; goal: ContainerGoal }): Container {
  return createConversa(input);
}

export function deleteContainer(id: string) {
  return deleteConversa(id);
}

export function listContainerAnalyses(containerId: string): ContainerAnalysis[] {
  const list = listConversaAnalyses(containerId);
  return list.map((a: ConversaAnalysis) => ({
    id: a.id,
    containerId: a.conversaId,
    createdAt: a.createdAt,
    score: a.score,
    label: a.label,
    messageCountApprox: a.messageCountApprox,
  }));
}

export function addContainerAnalysis(input: Omit<ContainerAnalysis, "id" | "createdAt">): ContainerAnalysis {
  const created = addConversaAnalysis({
    conversaId: input.containerId,
    score: input.score,
    label: input.label,
    messageCountApprox: input.messageCountApprox,
  });

  return {
    id: created.id,
    containerId: created.conversaId,
    createdAt: created.createdAt,
    score: created.score,
    label: created.label,
    messageCountApprox: created.messageCountApprox,
  };
}

export function computeTrend(analyses: ContainerAnalysis[]) {
  // traduz para o formato ConversaAnalysis e reaproveita lógica
  const converted: ConversaAnalysis[] = analyses.map((a) => ({
    id: a.id,
    conversaId: a.containerId,
    createdAt: a.createdAt,
    score: a.score,
    label: a.label,
    messageCountApprox: a.messageCountApprox,
  }));

  return computeConversaTrend(converted);
}
