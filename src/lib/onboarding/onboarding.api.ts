import type {
  OnboardingStatus,
  OnboardingStatusResponse,
  PaymentStatus,
} from "./onboarding.types";

function isPaymentStatus(v: any): v is PaymentStatus {
  return v === "pending" || v === "confirmed" || v === "failed";
}

function normalizeStatus(raw: OnboardingStatusResponse): OnboardingStatus {
  // hard-guard pra evitar quebrar o app se o backend mandar algo inesperado
  const paymentStatus: PaymentStatus = isPaymentStatus(raw.paymentStatus)
    ? raw.paymentStatus
    : "pending";

  return {
    ...raw,
    paymentStatus,
  };
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const res = await fetch("/api/v1/onboarding/status", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  // se caiu em HTML/404, isso aqui evita JSON.parse quebrar silenciosamente
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw {
      status: res.status,
      message: "Resposta não-JSON do /status",
      body: text,
    };
  }

  const data = (await res.json()) as OnboardingStatusResponse;

  if (!res.ok) {
    throw { status: res.status, body: data };
  }

  return normalizeStatus(data);
}

/**
 * Mantive apenas o que você já está usando nos componentes mostrados.
 * Se tiver mais endpoints, a gente adiciona depois com contrato fechado.
 */
export async function updateDialogueNickname(nickname: string) {
  const res = await fetch("/api/v1/onboarding/dialogue-nickname", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nickname }),
  });

  const ct = res.headers.get("content-type") ?? "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) throw { status: res.status, body };

  return body;
}

export async function ackTrialStart() {
  const res = await fetch("/api/v1/onboarding/trial/ack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const ct = res.headers.get("content-type") ?? "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) throw { status: res.status, body };

  return body;
}

/**
 * =========================================================
 * TUTORIAL LEGADO — REMOVIDO NO FRONT
 * =========================================================
 * Motivo:
 * - evitar que qualquer parte do front ainda chame rotas de tutorial
 * - manter compatibilidade temporária caso ainda exista algum import antigo
 *
 * Importante:
 * - NÃO chama backend
 * - retorna payload "ok" pra não quebrar fluxo legado acidentalmente
 * - depois, quando removermos o gate/redirect e os imports, a gente apaga de vez.
 */
export async function ackTutorialPopups() {
  return { ok: true, tutorialPopupsPending: false, tutorialRemoved: true };
}

export async function completeTutorial() {
  return { ok: true, tutorialCompleted: true, tutorialPopupsPending: false, tutorialRemoved: true };
}

export async function runQuickTutorial(_text: string) {
  return { ok: true, tutorialRemoved: true };
}
