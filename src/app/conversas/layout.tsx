// FRONT — src/app/conversas/layout.tsx
import { OnboardingRouteGuard } from "@/components/onboarding-route-guard";

export default function ConversasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingRouteGuard>
      <main className="min-h-[calc(100vh-64px)] px-4 py-6">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </OnboardingRouteGuard>
  );
}
