import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
            <div className="text-sm text-white/70">Carregando…</div>
          </div>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
