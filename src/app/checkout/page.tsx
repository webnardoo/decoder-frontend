export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="card p-5 text-sm text-zinc-400">Carregando checkout…</div>}>
      <CheckoutClient />
    </Suspense>
  );
}
