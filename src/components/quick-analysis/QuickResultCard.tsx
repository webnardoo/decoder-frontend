type Props = {
  scoreValue: number;
  scoreLabel: string;
  scoreExplanation: string;
  labelExplanation: string;
};

export function QuickResultCard({
  scoreValue,
  scoreLabel,
  scoreExplanation,
  labelExplanation,
}: Props) {
  return (
    <div className="rounded-2xl border bg-card p-4 md:p-5">
      {/* Grid conceitual 2x2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        {/* Linha 1 — valores */}
        <div className="flex items-end justify-start">
          <div className="leading-none">
            <div className="text-4xl font-semibold tracking-tight">
              {scoreValue}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Score (0–100)</div>
          </div>
        </div>

        <div className="flex items-end justify-start md:justify-end">
          <div className="text-left md:text-right">
            <div className="text-2xl font-semibold tracking-tight">
              {scoreLabel}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">Rótulo</div>
          </div>
        </div>

        {/* Linha 2 — explicações (texto integral) */}
        <div className="text-sm leading-relaxed">
          {scoreExplanation}
        </div>

        <div className="text-sm leading-relaxed md:text-right">
          {labelExplanation}
        </div>
      </div>
    </div>
  );
}
