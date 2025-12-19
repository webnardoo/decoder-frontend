import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm">
            <h1 className="text-xl font-semibold">Entrar</h1>
            <p className="mt-1 text-sm text-white/70">Carregando…</p>
          </div>
        </main>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
