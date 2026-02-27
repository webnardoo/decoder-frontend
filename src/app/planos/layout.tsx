import type { ReactNode } from "react";

export default function PlanosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">{children}</div>

      <footer className="border-t border-black/10 bg-white/0">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 text-xs text-zinc-500">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>© 2026 Avion Technologies</div>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <a href="/#como-funciona" className="hover:text-zinc-700">
                Como funciona
              </a>
              <a href="/#por-que-funciona" className="hover:text-zinc-700">
                Por que funciona
              </a>
              <a href="/#quando-faz-diferenca" className="hover:text-zinc-700">
                Quando faz diferença
              </a>
              <a href="/planos" className="hover:text-zinc-700">
                Planos
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}