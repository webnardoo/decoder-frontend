// src/components/billing/pix/PixDetailsModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  paymentId: string | null;
  onClose: () => void;
};

type PixDetailsResult = {
  ok: true;
  provider: "ASAAS";
  paymentId: string;
  invoiceUrl?: string | null;
  value?: number | null;
  dueDate?: string | null;
  pixQrCode: {
    encodedImage?: string | null;
    payload?: string | null;
    expirationDate?: string | null;
  };
};

type AsaasApiErrorShape = {
  message?: string;
  error?: string;
  statusCode?: number;
  errors?: Array<{
    code?: string;
    description?: string;
  }>;
};

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mapPixErrorToUiMessage(input: { status?: number; bodyText?: string }): string {
  const status = input.status;
  const bodyText = String(input.bodyText ?? "").trim();

  // 1) tentar parsear JSON do backend (que pode encapsular erro do Asaas)
  const parsed = bodyText ? safeJsonParse(bodyText) : null;

  // Caso o backend mande { message, statusCode, error, ... }
  const root: AsaasApiErrorShape | null =
    parsed && typeof parsed === "object" ? (parsed as any) : null;

  const statusCode = Number((root as any)?.statusCode ?? status ?? 0) || status;
  const nestedErrors = Array.isArray((root as any)?.errors) ? (root as any)?.errors : [];

  const code = String(nestedErrors?.[0]?.code ?? "").trim().toLowerCase();
  const desc = String(nestedErrors?.[0]?.description ?? "").trim();

  // 2) Regra específica do print: invalid_action => cobrança não pode mais ser paga
  if ((statusCode === 400 && code === "invalid_action") || desc.toLowerCase().includes("não pode mais ser paga")) {
    return "Este PIX não está mais disponível para pagamento (provavelmente expirou). Gere uma nova cobrança para continuar.";
  }

  // 3) Se veio algo legível no JSON, usar versão humana (sem exibir JSON cru)
  const msg = String((root as any)?.message ?? "").trim();
  if (msg) {
    // msg pode vir como "asaas_400: {...}" => limpar
    if (msg.toLowerCase().startsWith("asaas_")) {
      return "Não foi possível carregar os dados deste PIX. Verifique se ele ainda está disponível para pagamento.";
    }
    return msg;
  }

  // 4) fallback por status
  if (statusCode === 404) return "Não encontramos este PIX. Verifique se o ID está correto.";
  if (statusCode === 401 || statusCode === 403) return "Você não tem permissão para acessar este PIX.";
  if (statusCode && statusCode >= 500) return "Falha temporária ao carregar o PIX. Tente novamente em instantes.";

  return "Falha ao carregar dados do PIX.";
}

export default function PixDetailsModal({ open, paymentId, onClose }: Props) {
  const pid = useMemo(() => String(paymentId ?? "").trim(), [paymentId]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<PixDetailsResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!pid) return;

    let alive = true;

    async function load() {
      setLoading(true);
      setErr(null);
      setData(null);

      try {
        const res = await fetch(`/api/v1/billing/addons/asaas/pix/${encodeURIComponent(pid)}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const bodyText = await res.text().catch(() => "");
          const uiMsg = mapPixErrorToUiMessage({ status: res.status, bodyText });
          throw new Error(uiMsg);
        }

        const json = (await res.json()) as PixDetailsResult;
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? "Falha ao carregar dados do PIX."));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [open, pid]);

  if (!open) return null;

  const qrImg = data?.pixQrCode?.encodedImage
    ? `data:image/png;base64,${data.pixQrCode.encodedImage}`
    : null;

  const payload = String(data?.pixQrCode?.payload ?? "").trim();
  const exp = String(data?.pixQrCode?.expirationDate ?? "").trim();

  return (
    <div className="hPixModalOverlay" role="presentation" onPointerDown={onClose}>
      <div
        className="hPixModal theme-surface light-fallback"
        role="dialog"
        aria-modal="true"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="hPixModal__head">
          <div className="hPixModal__title">Pagamento PIX</div>
          <button type="button" className="hPixModal__close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="hPixModal__state">Carregando…</div>
        ) : err ? (
          <div className="hPixModal__state hPixModal__state--err">{err}</div>
        ) : !data?.ok ? (
          <div className="hPixModal__state">Dados não disponíveis.</div>
        ) : (
          <div className="hPixModal__body">
            <div className="hPixModal__grid">
              <div className="hPixModal__qr">
                {qrImg ? (
                  <img className="hPixModal__qrImg" src={qrImg} alt="QR Code PIX" />
                ) : (
                  <div className="hPixModal__qrPlaceholder">QR indisponível</div>
                )}
              </div>

              <div className="hPixModal__info">
                <div className="hPixModal__row">
                  <div className="hPixModal__label">ID</div>
                  <div className="hPixModal__value">{data.paymentId}</div>
                </div>

                {data.value != null ? (
                  <div className="hPixModal__row">
                    <div className="hPixModal__label">Valor</div>
                    <div className="hPixModal__value">{Number(data.value).toFixed(2)}</div>
                  </div>
                ) : null}

                {data.dueDate ? (
                  <div className="hPixModal__row">
                    <div className="hPixModal__label">Vencimento</div>
                    <div className="hPixModal__value">{data.dueDate}</div>
                  </div>
                ) : null}

                {exp ? (
                  <div className="hPixModal__row">
                    <div className="hPixModal__label">Expiração</div>
                    <div className="hPixModal__value hPixModal__value--exp">{exp}</div>
                  </div>
                ) : null}

                {payload ? (
                  <div className="hPixModal__payloadBlock">
                    <div className="hPixModal__label">Copia e cola</div>
                    <textarea className="hPixModal__payload" readOnly value={payload} />
                    <button
                      type="button"
                      className="hPixModal__copyBtn"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(payload);
                        } catch {
                          // no-op
                        }
                      }}
                    >
                      Copiar código
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
