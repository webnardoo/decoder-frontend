// src/app/login/layout.tsx
import type { ReactNode } from "react";
import { OnboardingRouteGuard } from "@/components/onboarding/OnboardingRouteGuard";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <OnboardingRouteGuard>{children}</OnboardingRouteGuard>;
}
