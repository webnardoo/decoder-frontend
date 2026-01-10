"use client";

import Link from "next/link";

export default function BillingFailedPage() {
  return (
    <div className="card p-5 space-y-3">
      <div className="text-sm font-medium">Pagamento falhou</div>
      <div className="text-xs text-zinc-500">
        Tente novamente.
      </div>
      <Link className="btn btn-primary" href="/billing/plan">
        Voltar para planos
      </Link>
    </div>
  );
}
