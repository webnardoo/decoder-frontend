import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md card card-premium p-6 md:p-7">
            <div className="text-sm text-zinc-300/80">Carregando…</div>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
