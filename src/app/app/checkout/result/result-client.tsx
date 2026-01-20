"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type StatusResponse = {
  ok?: boolean;
  status?: string;
  message?: string;
};

export default function CheckoutResultClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const qp = sp ?? new URLSearchParams();

  const checkoutId = String(qp.get("checkoutId") ?? "").trim();

  const ran = useRef(false);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("checking");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        if (!checkoutId) {
          setStatus("invalid");
          setError("Checkout inválido.");
          return;
        }

        const res = await fetch("/api/checkout/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ checkoutId }),
        });

        const data = (await res.json().catch(() => null)) as StatusResponse | null;

        if (!res.ok) {
          setStatus("failed");
          setError(data?.message || `Falha ao consultar status (${res.status}).`);
          return;
        }

        const st = String(data?.status || "").trim().toLowerCase();

        if (st === "paid" || st === "success" || st === "succeeded" || st === "complete") {
          setStatus("success");
          router.replace("/app");
          return;
        }

        if (st === "pending" || st === "processing") {
          setStatus("pending");
          // mantém na tela (ou você pode mandar pra /app/billing/pending se preferir)
          return;
        }

        if (st === "canceled" || st === "cancelled") {
          setStatus("canceled");
          router.replace("/app/billing/plan");
          return;
        }

        setStatus("unknown");
        setError(data?.message || "Status desconhecido.");
      } catch (e: any) {
        setStatus("failed");
        setError(e?.message || "Falha ao verificar status do checkout.");
      }
    })();
  }, [checkoutId, router]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Resultado do checkout</h1>
        <p className="text-sm text-zinc-400">Verificando status do pagamento…</p>
      </div>

      <div className="card p-5 space-y-2">
        <div className="text-xs text-zinc-500">
          Status: <span className="text-zinc-200">{status}</span>
        </div>

        {!!error && <div className="text-sm text-red-400">{error}</div>}

        <div className="flex gap-2 pt-2">
          <button className="btn btn-primary" onClick={() => router.replace("/app")}>
            Ir para o app
          </button>
          <button className="btn" onClick={() => router.replace("/app/billing/plan")}>
            Voltar para planos
          </button>
        </div>
      </div>
    </div>
  );
}
