import Link from "next/link";

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-lg font-semibold tracking-tight">Conta</div>
        <p className="text-sm text-zinc-400">
          Créditos, assinatura e histórico (somente metadata).
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link
          className="card p-4 hover:bg-zinc-900/60 transition"
          href="/account/credits"
        >
          <div className="text-sm font-medium">Créditos</div>
          <div className="text-sm text-zinc-400 mt-1">
            Ver saldo e comprar mais.
          </div>
        </Link>

        <Link
          className="card p-4 hover:bg-zinc-900/60 transition"
          href="/account/subscription"
        >
          <div className="text-sm font-medium">Assinatura</div>
          <div className="text-sm text-zinc-400 mt-1">
            Planos e upgrade.
          </div>
        </Link>

        <Link
          className="card p-4 hover:bg-zinc-900/60 transition"
          href="/account/history"
        >
          <div className="text-sm font-medium">Histórico</div>
          <div className="text-sm text-zinc-400 mt-1">
            Apenas metadata das análises.
          </div>
        </Link>
      </div>
    </div>
  );
}
