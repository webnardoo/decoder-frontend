import type { OnboardingStatus, OnboardingStatusResponse, PaymentStatus } from "./onboarding.types";

function isPaymentStatus(v: any): v is PaymentStatus {
  return v === "pending" || v === "confirmed" || v === "failed";
}

function normalizeStatus(raw: OnboardingStatusResponse): OnboardingStatus {
  const paymentStatus: PaymentStatus = isPaymentStatus((raw as any)?.paymentStatus)
    ? (raw as any).paymentStatus
    : "pending";

  return {
    ...(raw as any),
    paymentStatus,
  } as OnboardingStatus;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  // ✅ chama o Next route handler (ele lê cookie HttpOnly e proxy pro backend)
  const res = await fetch("/api/onboarding/status", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw { status: res.status, message: "Resposta não-JSON do /api/onboarding/status", body: text };
  }

  const data = (await res.json()) as OnboardingStatusResponse;

  if (!res.ok) {
    throw { status: res.status, body: data };
  }

  return normalizeStatus(data);
}

export async function updateDialogueNickname(nickname: string) {
  const res = await fetch("/api/onboarding/dialogue-nickname", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ nickname }),
  });

  const ct = res.headers.get("content-type") ?? "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw { status: res.status, body };
  return body;
}

export async function ackTrialStart() {
  const res = await fetch("/api/onboarding/trial/ack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  const ct = res.headers.get("content-type") ?? "";
  const body = ct.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) throw { status: res.status, body };
  return body;
}

// tutorial legado: no-op
export async function ackTutorialPopups() {
  return { ok: true, tutorialPopupsPending: false, tutorialRemoved: true };
}

export async function completeTutorial() {
  return { ok: true, tutorialCompleted: true, tutorialPopupsPending: false, tutorialRemoved: true };
}

export async function runQuickTutorial(_text: string) {
  return { ok: true, tutorialRemoved: true };
}
