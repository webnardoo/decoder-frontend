export function AppFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[rgba(0,0,0,0.9)] py-[22px]">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-start justify-between gap-[18px] sm:flex-row sm:items-center">
          <div className="text-[13px] text-white/60 whitespace-nowrap">
            © 2026 Avion Technologies
          </div>

          <nav className="flex flex-wrap items-center justify-start gap-x-[18px] gap-y-[10px] sm:justify-end">
            <span className="text-[13px] text-white/70 hover:underline cursor-default whitespace-nowrap">
              Como funciona
            </span>
            <span className="text-[13px] text-white/70 hover:underline cursor-default whitespace-nowrap">
              Por que funciona
            </span>
            <span className="text-[13px] text-white/70 hover:underline cursor-default whitespace-nowrap">
              Quando faz diferença
            </span>
            <span className="text-[13px] text-white/70 hover:underline cursor-default whitespace-nowrap">
              Planos
            </span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
