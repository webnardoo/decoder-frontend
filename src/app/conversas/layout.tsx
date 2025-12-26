import { OnboardingRouteGuard } from "@/components/onboarding-route-guard";

export default function ConversasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OnboardingRouteGuard>{children}</OnboardingRouteGuard>;
}
