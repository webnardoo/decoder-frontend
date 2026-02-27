"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type TopNavProps = {
  /**
   * Deve ser TRUE apenas quando o usuário estiver autenticado.
   * (ex.: cookie/token válido já confirmado pelo app)
   */
  isAuthed?: boolean;

  /**
   * Opcional: href da conta (área logada).
   */
  accountHref?: string;

  /**
   * Opcional: href do CTA público "Assinar"
   */
  subscribeHref?: string;

  /**
   * Opcional: href do CTA público "Entrar"
   */
  loginHref?: string;
};

function isAuthPage(pathname: string) {
  // Páginas onde o usuário ainda NÃO está logado e não deve ver ações (nem logadas, nem “entrar” duplicado).
  return (
    pathname === "/app/login" ||
    pathname.startsWith("/app/register") ||
    pathname.startsWith("/app/signup") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/app/checkout") ||
    pathname.startsWith("/app/forgot") ||
    pathname.startsWith("/app/reset") ||
    pathname === "/app/forgot-password" ||
    pathname === "/app/reset-password"
  );
}

export default function TopNav({
  isAuthed = false,
  accountHref = "/app/account",
  subscribeHref = "/planos",
  loginHref = "/app/login",
}: TopNavProps) {
  const pathname = usePathname() || "/";
  const onAuthPage = isAuthPage(pathname);

  // ✅ Regra: ações logadas só quando estiver logado E fora das páginas de auth.
  // (Comprar Crédito foi removido do TopNav por decisão de arquitetura.)
  const showAuthedActions = isAuthed && !onAuthPage;

  // ✅ Em páginas de auth, não mostra CTAs (evita “Entrar” na tela de login).
  const showPublicActions = !isAuthed && !onAuthPage;

  return (
    <header className="w-full border-b border-black/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
          <span className="text-sm font-semibold tracking-tight text-black/90">
            Hitch.ai
          </span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Theme toggle placeholder (se você já tem componente real, troque aqui) */}
          <div className="inline-flex items-center rounded-full border border-black/10 bg-white px-1 py-1 text-xs">
            <button
              type="button"
              className="rounded-full px-3 py-1 font-medium text-black/80"
              aria-label="Light"
            >
              Light
            </button>
            <button
              type="button"
              className="rounded-full px-3 py-1 font-medium text-black/60"
              aria-label="Dark"
            >
              Dark
            </button>
          </div>

          {showAuthedActions ? (
            <Link
              href={accountHref}
              className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/80 hover:bg-black/5"
            >
              Conta
            </Link>
          ) : showPublicActions ? (
            <>
              <Link
                href={subscribeHref}
                className="inline-flex items-center rounded-full border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-[0_0_0_1px_rgba(99,102,241,0.15)] hover:bg-indigo-50"
              >
                Assinar
              </Link>

              <Link
                href={loginHref}
                className="inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-black/80 hover:bg-black/5"
              >
                Entrar
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}