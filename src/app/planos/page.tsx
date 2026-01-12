import { Suspense } from "react";
import PublicPlansClient from "./PublicPlansClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-md card card-premium p-6 md:p-7">
            <div className="text-sm text-zinc-300/80">Carregando…</div>
          </div>
        </div>
      }
    >
      <PublicPlansClient />
    </Suspense>
  );
}
