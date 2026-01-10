"use client";

import { useEffect, useMemo, useState } from "react";

type ApiError = { status: number; message: string };

type GlobalConfig = {
  creditValueBrl: number;
  targetNetMargin: number;
  roundingPolicy: string;
  roundStep: number;
  usdToBrlRate: number;
  fxUpdatedAt?: string;
};

type ModelConfig = {
  modelName: string;
  priceInputUsdPer1M: number;
  priceOutputUsdPer1M: number;
  tokenizerEncoding: string;
};

type ModeName = "QUICK_SUMMARY" | "QUICK_REPLY";

type ModeConfig = {
  mode: ModeName;
  promptFixedTokens: number;
  maxOutputTokens: number;
  minChargeCredits: number | null;
  markupOverride: number | null;
};

type SaveBanner =
  | { kind: "idle"; text?: string }
  | { kind: "saving"; text: string }
  | { kind: "success"; text: string }
  | { kind: "error"; text: string };

function toNumberOrNull(v: string): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function readJsonOrThrow(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw { status: res.status, message: text || `Resposta inválida (${res.status})` } as ApiError;
  }
  const json = await res.json();
  if (!res.ok) {
    const msg =
      (json && (json.message || json.error)) ||
      `Erro HTTP ${res.status}`;
    throw { status: res.status, message: String(msg) } as ApiError;
  }
  return json;
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  return (await readJsonOrThrow(res)) as T;
}

async function apiPatch<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body ?? {}),
  });
  return (await readJsonOrThrow(res)) as T;
}

export default function AdminCreditV2Page() {
  // -----------------------
  // Feedback global (Salvar)
  // -----------------------
  const [banner, setBanner] = useState<SaveBanner>({ kind: "idle" });

  // -----------------------
  // Estado de carregamento
  // -----------------------
  const [bootLoading, setBootLoading] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  // -----------------------
  // Dados atuais
  // -----------------------
  const [globalCfg, setGlobalCfg] = useState<GlobalConfig | null>(null);
  const [modelCfg, setModelCfg] = useState<ModelConfig | null>(null);

  const [summaryCfg, setSummaryCfg] = useState<ModeConfig | null>(null);
  const [replyCfg, setReplyCfg] = useState<ModeConfig | null>(null);

  // -----------------------
  // Form states (editáveis)
  // -----------------------
  const [globalForm, setGlobalForm] = useState({
    creditValueBrl: "",
    targetNetMargin: "",
    roundingPolicy: "",
    roundStep: "",
    usdToBrlRate: "",
  });

  const [modelForm, setModelForm] = useState({
    modelName: "gpt-4.1-mini",
    priceInputUsdPer1M: "",
    priceOutputUsdPer1M: "",
    tokenizerEncoding: "",
  });

  const [summaryForm, setSummaryForm] = useState({
    promptFixedTokens: "",
    maxOutputTokens: "",
    minChargeCredits: "",
    markupOverride: "",
  });

  const [replyForm, setReplyForm] = useState({
    promptFixedTokens: "",
    maxOutputTokens: "",
    minChargeCredits: "",
    markupOverride: "",
  });

  // -----------------------
  // Loading por seção
  // -----------------------
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingReply, setSavingReply] = useState(false);

  const isSavingAny = savingGlobal || savingModel || savingSummary || savingReply;

  const clearBannerSoon = (ms: number) => {
    window.setTimeout(() => setBanner({ kind: "idle" }), ms);
  };

  const setSuccess = (text: string) => {
    setBanner({ kind: "success", text });
    clearBannerSoon(2500);
  };

  const setError = (text: string) => {
    setBanner({ kind: "error", text });
  };

  // -----------------------
  // Boot fetch
  // -----------------------
  useEffect(() => {
    let alive = true;

    async function boot() {
      setBootLoading(true);
      setBootError(null);
      setBanner({ kind: "idle" });

      try {
        const [g, m, s, r] = await Promise.all([
          apiGet<GlobalConfig>("/api/admin/credit-v2/config/global"),
          apiGet<ModelConfig>(`/api/admin/credit-v2/config/model?model=${encodeURIComponent(modelForm.modelName)}`),
          apiGet<ModeConfig>("/api/admin/credit-v2/config/mode?mode=QUICK_SUMMARY"),
          apiGet<ModeConfig>("/api/admin/credit-v2/config/mode?mode=QUICK_REPLY"),
        ]);

        if (!alive) return;

        setGlobalCfg(g);
        setModelCfg(m);
        setSummaryCfg(s);
        setReplyCfg(r);

        setGlobalForm({
          creditValueBrl: String(g.creditValueBrl ?? ""),
          targetNetMargin: String(g.targetNetMargin ?? ""),
          roundingPolicy: String(g.roundingPolicy ?? ""),
          roundStep: String(g.roundStep ?? ""),
          usdToBrlRate: String(g.usdToBrlRate ?? ""),
        });

        setModelForm((prev) => ({
          ...prev,
          priceInputUsdPer1M: String(m.priceInputUsdPer1M ?? ""),
          priceOutputUsdPer1M: String(m.priceOutputUsdPer1M ?? ""),
          tokenizerEncoding: String(m.tokenizerEncoding ?? ""),
        }));

        setSummaryForm({
          promptFixedTokens: String(s.promptFixedTokens ?? ""),
          maxOutputTokens: String(s.maxOutputTokens ?? ""),
          minChargeCredits: s.minChargeCredits == null ? "" : String(s.minChargeCredits),
          markupOverride: s.markupOverride == null ? "" : String(s.markupOverride),
        });

        setReplyForm({
          promptFixedTokens: String(r.promptFixedTokens ?? ""),
          maxOutputTokens: String(r.maxOutputTokens ?? ""),
          minChargeCredits: r.minChargeCredits == null ? "" : String(r.minChargeCredits),
          markupOverride: r.markupOverride == null ? "" : String(r.markupOverride),
        });
      } catch (e: any) {
        const status = typeof e?.status === "number" ? e.status : 0;
        const msg = String(e?.message || "Falha ao carregar configurações.");
        if (status === 401) setBootError("Não autenticado. Faça login.");
        else if (status === 403) setBootError("Acesso restrito. Admin only.");
        else setBootError(msg);
      } finally {
        if (alive) setBootLoading(false);
      }
    }

    boot();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roundingHelp = useMemo(() => {
    return "Define como o motor arredonda créditos (ex.: CEIL força arredondar pra cima).";
  }, []);

  // -----------------------
  // Save handlers
  // -----------------------
  async function saveGlobal() {
    setBanner({ kind: "saving", text: "Salvando…" });
    setSavingGlobal(true);

    try {
      const payload: any = {};

      const creditValueBrl = toNumberOrNull(globalForm.creditValueBrl);
      const targetNetMargin = toNumberOrNull(globalForm.targetNetMargin);
      const roundStep = toNumberOrNull(globalForm.roundStep);
      const usdToBrlRate = toNumberOrNull(globalForm.usdToBrlRate);
      const roundingPolicy = String(globalForm.roundingPolicy || "").trim();

      if (creditValueBrl != null) payload.creditValueBrl = creditValueBrl;
      if (targetNetMargin != null) payload.targetNetMargin = targetNetMargin;
      if (roundStep != null) payload.roundStep = roundStep;
      if (usdToBrlRate != null) payload.usdToBrlRate = usdToBrlRate;
      if (roundingPolicy) payload.roundingPolicy = roundingPolicy;

      const updated = await apiPatch<GlobalConfig>("/api/admin/credit-v2/config/global", payload);
      setGlobalCfg(updated);
      setSuccess("As informações foram salvas no banco de dados");
    } catch (e: any) {
      setError(String(e?.message || "Erro ao salvar (global)."));
    } finally {
      setSavingGlobal(false);
    }
  }

  async function reloadModel(modelName: string) {
    setBanner({ kind: "idle" });
    setSavingModel(true);
    try {
      const m = await apiGet<ModelConfig>(`/api/admin/credit-v2/config/model?model=${encodeURIComponent(modelName)}`);
      setModelCfg(m);
      setModelForm((prev) => ({
        ...prev,
        modelName,
        priceInputUsdPer1M: String(m.priceInputUsdPer1M ?? ""),
        priceOutputUsdPer1M: String(m.priceOutputUsdPer1M ?? ""),
        tokenizerEncoding: String(m.tokenizerEncoding ?? ""),
      }));
    } catch (e: any) {
      setError(String(e?.message || "Erro ao carregar (model)."));
    } finally {
      setSavingModel(false);
    }
  }

  async function saveModel() {
    setBanner({ kind: "saving", text: "Salvando…" });
    setSavingModel(true);

    try {
      const payload: any = {};
      const priceInputUsdPer1M = toNumberOrNull(modelForm.priceInputUsdPer1M);
      const priceOutputUsdPer1M = toNumberOrNull(modelForm.priceOutputUsdPer1M);
      const tokenizerEncoding = String(modelForm.tokenizerEncoding || "").trim();

      if (priceInputUsdPer1M != null) payload.priceInputUsdPer1M = priceInputUsdPer1M;
      if (priceOutputUsdPer1M != null) payload.priceOutputUsdPer1M = priceOutputUsdPer1M;
      if (tokenizerEncoding) payload.tokenizerEncoding = tokenizerEncoding;

      const url = `/api/admin/credit-v2/config/model?model=${encodeURIComponent(modelForm.modelName)}`;
      const updated = await apiPatch<ModelConfig>(url, payload);
      setModelCfg(updated);
      setSuccess("As informações foram salvas no banco de dados");
    } catch (e: any) {
      setError(String(e?.message || "Erro ao salvar (model)."));
    } finally {
      setSavingModel(false);
    }
  }

  async function saveMode(mode: ModeName) {
    setBanner({ kind: "saving", text: "Salvando…" });
    mode === "QUICK_SUMMARY" ? setSavingSummary(true) : setSavingReply(true);

    try {
      const form = mode === "QUICK_SUMMARY" ? summaryForm : replyForm;

      const payload: any = {};

      const promptFixedTokens = toNumberOrNull(form.promptFixedTokens);
      const maxOutputTokens = toNumberOrNull(form.maxOutputTokens);

      // minChargeCredits e markupOverride aceitam null (limpar) ou número
      const minChargeCreditsRaw = String(form.minChargeCredits ?? "").trim();
      const markupOverrideRaw = String(form.markupOverride ?? "").trim();

      if (promptFixedTokens != null) payload.promptFixedTokens = Math.trunc(promptFixedTokens);
      if (maxOutputTokens != null) payload.maxOutputTokens = Math.trunc(maxOutputTokens);

      if (minChargeCreditsRaw === "") {
        // não mexe se vazio (mantém)
      } else if (minChargeCreditsRaw.toLowerCase() === "null") {
        payload.minChargeCredits = null;
      } else {
        const v = Number(minChargeCreditsRaw);
        if (Number.isFinite(v)) payload.minChargeCredits = v;
      }

      if (markupOverrideRaw === "") {
        // não mexe se vazio (mantém)
      } else if (markupOverrideRaw.toLowerCase() === "null") {
        payload.markupOverride = null;
      } else {
        const v = Number(markupOverrideRaw);
        if (Number.isFinite(v)) payload.markupOverride = v;
      }

      const url = `/api/admin/credit-v2/config/mode?mode=${encodeURIComponent(mode)}`;
      const updated = await apiPatch<ModeConfig>(url, payload);

      if (mode === "QUICK_SUMMARY") setSummaryCfg(updated);
      else setReplyCfg(updated);

      setSuccess("As informações foram salvas no banco de dados");
    } catch (e: any) {
      setError(String(e?.message || `Erro ao salvar (mode=${mode}).`));
    } finally {
      mode === "QUICK_SUMMARY" ? setSavingSummary(false) : setSavingReply(false);
    }
  }

  // -----------------------
  // UI helpers
  // -----------------------
  function Banner() {
    if (banner.kind === "idle") return null;

    const cls =
      banner.kind === "saving"
        ? "border-zinc-800 bg-zinc-900/50 text-zinc-200"
        : banner.kind === "success"
        ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
        : "border-red-900/60 bg-red-950/40 text-red-200";

    return (
      <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${cls}`}>
        <div className="flex items-center justify-between gap-3">
          <span>{banner.text}</span>
          {banner.kind === "error" && (
            <button
              type="button"
              className="text-xs text-zinc-300 hover:text-white"
              onClick={() => setBanner({ kind: "idle" })}
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    );
  }

  if (bootLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-semibold">Admin · Motor de Crédito V2</h1>
        <p className="mt-2 text-sm text-zinc-400">Carregando configurações…</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-semibold">Admin · Motor de Crédito V2</h1>
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-sm text-red-200">{bootError}</p>
          <p className="mt-2 text-xs text-zinc-400">
            Se for 401: faça login. Se for 403: sua conta precisa estar marcada como admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Admin · Motor de Crédito V2</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Alterações valem apenas para operações futuras. Operações passadas preservam snapshot.
          </p>
        </div>
      </div>

      <Banner />

      {/* ---------------- GLOBAL ---------------- */}
      <section className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Parâmetros Globais</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Estratégia econômica: valor do crédito, margem alvo, câmbio e arredondamento.
            </p>
          </div>
          <button
            type="button"
            onClick={saveGlobal}
            disabled={savingGlobal || isSavingAny}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              savingGlobal || isSavingAny
                ? "bg-zinc-800 text-zinc-400"
                : "bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
            }`}
          >
            {savingGlobal ? "Salvando…" : "Salvar"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Credit Value (BRL)"
            desc="Valor econômico de 1 crédito (em BRL)."
            value={globalForm.creditValueBrl}
            onChange={(v) => setGlobalForm((p) => ({ ...p, creditValueBrl: v }))}
            placeholder={globalCfg ? String(globalCfg.creditValueBrl) : ""}
          />
          <Field
            label="Target Net Margin"
            desc="Margem líquida alvo (ex.: 0.65 = 65%)."
            value={globalForm.targetNetMargin}
            onChange={(v) => setGlobalForm((p) => ({ ...p, targetNetMargin: v }))}
            placeholder={globalCfg ? String(globalCfg.targetNetMargin) : ""}
          />
          <Field
            label="Rounding Policy"
            desc={roundingHelp}
            value={globalForm.roundingPolicy}
            onChange={(v) => setGlobalForm((p) => ({ ...p, roundingPolicy: v }))}
            placeholder={globalCfg ? String(globalCfg.roundingPolicy) : ""}
          />
          <Field
            label="Round Step"
            desc="Passo de arredondamento (ex.: 1 = créditos inteiros)."
            value={globalForm.roundStep}
            onChange={(v) => setGlobalForm((p) => ({ ...p, roundStep: v }))}
            placeholder={globalCfg ? String(globalCfg.roundStep) : ""}
          />
          <Field
            label="USD → BRL Rate"
            desc="Câmbio usado na conversão de custo USD para BRL."
            value={globalForm.usdToBrlRate}
            onChange={(v) => setGlobalForm((p) => ({ ...p, usdToBrlRate: v }))}
            placeholder={globalCfg ? String(globalCfg.usdToBrlRate) : ""}
          />
          <ReadOnly
            label="FX Updated At"
            desc="Última atualização de câmbio registrada."
            value={globalCfg?.fxUpdatedAt ? String(globalCfg.fxUpdatedAt) : "-"}
          />
        </div>
      </section>

      {/* ---------------- MODEL ---------------- */}
      <section className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Parâmetros por Modelo</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Preços USD por 1M tokens e estratégia de tokenização.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => reloadModel(modelForm.modelName)}
              disabled={savingModel || isSavingAny}
              className={`rounded-xl px-3 py-2 text-sm ${
                savingModel || isSavingAny
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
              }`}
            >
              Recarregar
            </button>
            <button
              type="button"
              onClick={saveModel}
              disabled={savingModel || isSavingAny}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                savingModel || isSavingAny
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              }`}
            >
              {savingModel ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Model Name"
            desc="Nome do modelo (chave da config)."
            value={modelForm.modelName}
            onChange={(v) => setModelForm((p) => ({ ...p, modelName: v }))}
            placeholder={modelCfg ? modelCfg.modelName : "gpt-4.1-mini"}
          />
          <Field
            label="Tokenizer Encoding"
            desc="Encoding da tokenização local (ex.: o200k_base)."
            value={modelForm.tokenizerEncoding}
            onChange={(v) => setModelForm((p) => ({ ...p, tokenizerEncoding: v }))}
            placeholder={modelCfg ? modelCfg.tokenizerEncoding : "o200k_base"}
          />
          <Field
            label="Price Input USD / 1M"
            desc="Preço USD por 1M tokens de input."
            value={modelForm.priceInputUsdPer1M}
            onChange={(v) => setModelForm((p) => ({ ...p, priceInputUsdPer1M: v }))}
            placeholder={modelCfg ? String(modelCfg.priceInputUsdPer1M) : ""}
          />
          <Field
            label="Price Output USD / 1M"
            desc="Preço USD por 1M tokens de output."
            value={modelForm.priceOutputUsdPer1M}
            onChange={(v) => setModelForm((p) => ({ ...p, priceOutputUsdPer1M: v }))}
            placeholder={modelCfg ? String(modelCfg.priceOutputUsdPer1M) : ""}
          />
        </div>
      </section>

      {/* ---------------- MODES ---------------- */}
      <section className="mt-6 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5">
        <h2 className="text-base font-semibold">Parâmetros por Modo (QUICK)</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Cada modo tem custos e comportamento próprios. Não compartilhar valores entre modos.
        </p>

        {/* QUICK_SUMMARY */}
        <div className="mt-5 rounded-2xl border border-zinc-900 bg-zinc-950/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">QUICK — Resumo</h3>
              <p className="mt-1 text-xs text-zinc-400">
                Prompt fixo + hard-cap + reserva de créditos por max output.
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveMode("QUICK_SUMMARY")}
              disabled={savingSummary || isSavingAny}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                savingSummary || isSavingAny
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              }`}
            >
              {savingSummary ? "Salvando…" : "Salvar"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Prompt Fixed Tokens"
              desc="Tokens atribuídos ao prompt fixo desse modo. Ajuste sempre que o prompt mudar."
              value={summaryForm.promptFixedTokens}
              onChange={(v) => setSummaryForm((p) => ({ ...p, promptFixedTokens: v }))}
              placeholder={summaryCfg ? String(summaryCfg.promptFixedTokens) : ""}
            />
            <Field
              label="Max Output Tokens"
              desc="Hard-cap da resposta e base para reserva de créditos."
              value={summaryForm.maxOutputTokens}
              onChange={(v) => setSummaryForm((p) => ({ ...p, maxOutputTokens: v }))}
              placeholder={summaryCfg ? String(summaryCfg.maxOutputTokens) : ""}
            />
            <Field
              label="Minimum Charge (Credits)"
              desc='Mínimo de créditos cobrados (opcional). Use "null" para limpar.'
              value={summaryForm.minChargeCredits}
              onChange={(v) => setSummaryForm((p) => ({ ...p, minChargeCredits: v }))}
              placeholder={summaryCfg?.minChargeCredits == null ? "" : String(summaryCfg?.minChargeCredits)}
            />
            <Field
              label="Markup Override (%)"
              desc='Markup específico do modo (opcional). Use "null" para limpar.'
              value={summaryForm.markupOverride}
              onChange={(v) => setSummaryForm((p) => ({ ...p, markupOverride: v }))}
              placeholder={summaryCfg?.markupOverride == null ? "" : String(summaryCfg?.markupOverride)}
            />
          </div>
        </div>

        {/* QUICK_REPLY */}
        <div className="mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">QUICK — Responder</h3>
              <p className="mt-1 text-xs text-zinc-400">
                Normalmente tem prompt maior e valor percebido maior.
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveMode("QUICK_REPLY")}
              disabled={savingReply || isSavingAny}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                savingReply || isSavingAny
                  ? "bg-zinc-800 text-zinc-400"
                  : "bg-yellow-400 text-zinc-950 hover:bg-yellow-300"
              }`}
            >
              {savingReply ? "Salvando…" : "Salvar"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Prompt Fixed Tokens"
              desc="Tokens do prompt fixo no modo Responder. Ajuste sempre que o prompt mudar."
              value={replyForm.promptFixedTokens}
              onChange={(v) => setReplyForm((p) => ({ ...p, promptFixedTokens: v }))}
              placeholder={replyCfg ? String(replyCfg.promptFixedTokens) : ""}
            />
            <Field
              label="Max Output Tokens"
              desc="Hard-cap de tokens de resposta neste modo."
              value={replyForm.maxOutputTokens}
              onChange={(v) => setReplyForm((p) => ({ ...p, maxOutputTokens: v }))}
              placeholder={replyCfg ? String(replyCfg.maxOutputTokens) : ""}
            />
            <Field
              label="Minimum Charge (Credits)"
              desc='Mínimo de créditos cobrados (opcional). Use "null" para limpar.'
              value={replyForm.minChargeCredits}
              onChange={(v) => setReplyForm((p) => ({ ...p, minChargeCredits: v }))}
              placeholder={replyCfg?.minChargeCredits == null ? "" : String(replyCfg?.minChargeCredits)}
            />
            <Field
              label="Markup Override (%)"
              desc='Markup específico do modo (opcional). Use "null" para limpar.'
              value={replyForm.markupOverride}
              onChange={(v) => setReplyForm((p) => ({ ...p, markupOverride: v }))}
              placeholder={replyCfg?.markupOverride == null ? "" : String(replyCfg?.markupOverride)}
            />
          </div>
        </div>

        {/* Observações */}
        <div className="mt-5 rounded-xl border border-zinc-900 bg-zinc-950/30 p-4">
          <h4 className="text-sm font-semibold">Observações importantes</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-zinc-400">
            <li>Nenhuma alteração exige deploy.</li>
            <li>Alterações não afetam operações passadas (snapshot histórico preservado).</li>
            <li>Mudanças passam a valer somente para novas operações.</li>
            <li>Parâmetros incorretos podem reduzir margem, gerar cobrança excessiva ou inviabilizar o produto.</li>
            <li>Recomendação: registrar internamente data e motivo de cada alteração estratégica.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function Field(props: {
  label: string;
  desc: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{props.label}</div>
          <div className="mt-1 text-xs text-zinc-400">{props.desc}</div>
        </div>
      </div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="mt-3 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none placeholder:text-zinc-600 focus:border-zinc-700"
      />
    </div>
  );
}

function ReadOnly(props: { label: string; desc: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/40 p-3">
      <div className="text-sm font-semibold">{props.label}</div>
      <div className="mt-1 text-xs text-zinc-400">{props.desc}</div>
      <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
        {props.value}
      </div>
    </div>
  );
}
