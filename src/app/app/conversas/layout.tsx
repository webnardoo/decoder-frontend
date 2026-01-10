import { OnboardingRouteGuard } from "@/components/onboarding-route-guard";
import { AppFooter } from "@/components/app-footer";

export default function ConversasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingRouteGuard>
      {/* estrutura flex para footer ficar no rodapé mesmo em páginas curtas */}
      <div className="min-h-[calc(100dvh-56px)] flex flex-col">
        <main className="flex-1 px-4 py-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>

        <AppFooter />
      </div>
    </OnboardingRouteGuard>
  );
}
