export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-2">
        <h1 className="text-lg font-semibold">Pagamento confirmado</h1>
        <p className="text-sm text-zinc-400">
          A ativação do plano e a concessão de créditos acontecem via webhook e podem levar alguns instantes.
        </p>

        <div className="flex gap-2 pt-2">
          <Link className="btn btn-primary" href="/conversas">
            Ir para Conversas
          </Link>
          <Link className="btn" href="/billing/plan">
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}
