// FRONT — src/app/checkout/result/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import ResultClient from "./result-client";

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="text-lg font-semibold tracking-tight">Checkout</div>
            <p className="text-sm text-zinc-300/80">
              Processando o retorno do pagamento…
            </p>
          </div>

          <div className="card p-6 md:p-7">
            <div className="text-sm text-zinc-300/80">Processando…</div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
              <div className="h-full w-1/3 animate-pulse bg-white/10" />
            </div>
          </div>
        </div>
      }
    >
      <ResultClient />
    </Suspense>
  );
}
