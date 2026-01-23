// src/app/register/layout.tsx
import type { ReactNode } from "react";
import { OnboardingRouteGuard } from "@/components/onboarding/OnboardingRouteGuard";

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return <OnboardingRouteGuard>{children}</OnboardingRouteGuard>;
}
