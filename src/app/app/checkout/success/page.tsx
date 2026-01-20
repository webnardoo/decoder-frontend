import { Suspense } from "react";
import CheckoutSuccessClient from "./CheckoutSuccessClient";

export const dynamic = "force-dynamic";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md card p-6 md:p-7">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="text-lg font-semibold">Pagamento confirmado</div>
              <div className="text-sm text-zinc-400">Carregando…</div>
            </div>
          </div>
        </div>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
