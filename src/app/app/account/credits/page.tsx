"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/back-button";
import { fetchCreditsBalance } from "@/lib/credits-balance";

export default function CreditsPage() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    fetchCreditsBalance()
      .then((r) => {
        if (!alive) return;
        setBalance(r.balance);
      })
      .catch(() => {
        if (!alive) return;
        setBalance(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-lg font-semibold tracking-tight">Créditos</div>
        <p className="text-sm text-zinc-400">
          Saldo atual e consumo por análises (QUICK/DEEP).
        </p>
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-sm text-zinc-300">
          Saldo atual:{" "}
          <span className="font-semibold text-zinc-50">
            {balance == null ? "—" : balance}
          </span>
        </div>

        <div className="text-sm text-zinc-400">
          Análises consomem créditos automaticamente (sem confirmação).
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
