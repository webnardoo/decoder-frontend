export function LoaderCard() {
  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">Analisando…</div>
        <div className="text-xs text-zinc-500">processamento</div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full w-2/3 animate-pulse rounded-full bg-yellow-400/60" />
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-400 space-y-2">
        <div className="text-xs text-zinc-500">Indicação de processamento seguro</div>
        <ul className="list-disc pl-5 space-y-1">
          <li>O histórico salva apenas metadados (data, relação, score).</li>
          <li>Evite dados sensíveis se você estiver testando em ambiente compartilhado.</li>
          <li>Se algo parecer incoerente, use os cenários D1–D10 para calibrar.</li>
        </ul>
      </div>
    </section>
  );
}
