import Link from "next/link";
import { BackButton } from "@/components/back-button";

export default function CreditsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-lg font-semibold tracking-tight">Créditos</div>
        <p className="text-sm text-zinc-400">
          MVP: placeholder. Integração real com backend entra em sprint futura (monetização).
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-sm text-zinc-300">
          Saldo atual: <span className="font-semibold text-zinc-50">—</span>
        </div>
        <div className="text-sm text-zinc-400">
          Aqui vai aparecer: saldo real, pacotes, compra e consumo por análise.
        </div>

        <div className="flex gap-2">
          <BackButton fallbackHref="/" />
          <Link className="btn" href="/account">
            Conta
          </Link>
        </div>
      </div>
    </div>
  );
}
