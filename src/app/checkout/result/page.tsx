export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import ResultClient from "./result-client";

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={<div className="card p-5 text-sm text-zinc-400">Processando…</div>}>
      <ResultClient />
    </Suspense>
  );
}
