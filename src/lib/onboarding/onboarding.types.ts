export type PaymentStatus = "pending" | "confirmed" | "failed";

export type OnboardingStage =
  | "TRIAL_ACTIVE"
  | "PLAN_SELECTION_REQUIRED"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "NICKNAME_REQUIRED"
  | "TUTORIAL_REQUIRED"
  | "READY";

export type OnboardingStatus = {
  paymentStatus: PaymentStatus;
  subscriptionActive: boolean;

  nicknameDefined: boolean;
  tutorialCompleted: boolean;
  tutorialPopupsPending: boolean;
  dialogueNickname: string | null;

  trialActive: boolean;
  trialGuided: boolean;
  trialAnalysisUsed: boolean;
  trialReplyUsed: boolean;
  trialStartPopupPending: boolean;
  trialCompleted: boolean;

  onboardingStage: OnboardingStage;
  creditsBalance: number;

  // opcional (quando backend expuser)
  isAdmin?: boolean;
};

/**
 * Contrato do endpoint /api/v1/onboarding/status
 * (mantemos separado, mas com o MESMO shape do status interno)
 */
export type OnboardingStatusResponse = OnboardingStatus;
