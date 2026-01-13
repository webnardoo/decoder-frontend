export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-2">
        <h1 className="text-lg font-semibold">Checkout cancelado</h1>
        <p className="text-sm text-zinc-400">
          Você cancelou o checkout. Nenhuma assinatura foi ativada.
        </p>

        <div className="flex gap-2 pt-2">
          <Link className="btn btn-primary" href="/app/billing/plan">
            Voltar para planos
          </Link>
        </div>
      </div>
    </div>
  );
}
