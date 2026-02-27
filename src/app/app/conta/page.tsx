// src/app/app/conta/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GuardSelectionModal from "@/components/ui/GuardSelectionModal";

type TabKey = "profile" | "plano";

type OnboardingStatus = {
  onboardingStage?: string;
  dialogueNickname?: string;
  nicknameDefined?: boolean;
  creditsBalance?: number;
  renewAt?: string;
  billingCycle?: string;
  planName?: string;
  subscription?: any;
  [k: string]: any;
};

type BillingMeResponse = {
  ok?: boolean;
  userId?: string;
  paymentStatus?: string;
  subscriptionActive?: boolean;
  creditsBalance?: number;
  plan?: {
    planId?: string;
    id?: string;
    code?: string;
    name?: string;
    description?: string;
    monthlyCredits?: number;
    isUnlimited?: boolean;
    [k: string]: any;
  } | null;
  billingCycle?: string | null;
  renewalAt?: string | null;
  renewAt?: string | null;
  price?: any;
  [k: string]: any;
};

export default function ContaPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("profile");

  // Profile
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingNickname, setSavingNickname] = useState(false);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [nickname, setNickname] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // ✅ Nickname: read-only por default; editar habilita
  const [isEditingNickname, setIsEditingNickname] = useState(false);

  // ✅ snapshot do nickname carregado (para cancelar)
  const [nicknameSnapshot, setNicknameSnapshot] = useState("");

  // ✅ Modal de sucesso (nickname atualizado)
  const [nicknameSavedOpen, setNicknameSavedOpen] = useState(false);

  // Plano
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [billingMe, setBillingMe] = useState<BillingMeResponse | null>(null);
  const [planMsg, setPlanMsg] = useState<string | null>(null);

  // ✅ UI: alterna card de plano -> instruções de cancelamento
  const [showCancelPlanCard, setShowCancelPlanCard] = useState(false);

  const [loggingOut, setLoggingOut] = useState(false);

  // -----------------------------
  // ✅ PADRÃO CTA (igual ao "Analisar")
  // (NÃO mexer — já validado)
  // -----------------------------
  const BTN_BASE =
    "h-cta inline-flex items-center justify-center select-none " +
    "rounded-full font-semibold transition " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(108,99,255,0.25)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--h-bg)] " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const BTN_PILL = "h-cta--pill px-6 h-11";
  const BTN_PILL_ACTIVE = "h-cta--active";
  const BTN_PILL_DANGER = "h-cta--danger";
  const BTN_PILL_SOLID = "h-cta--solid"; // opcional (não usado aqui)

  function pillClass(active: boolean) {
    return `${BTN_BASE} ${BTN_PILL} ${active ? BTN_PILL_ACTIVE : ""}`;
  }

  async function loadOnboardingStatus() {
    setLoadingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/onboarding/status", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Falha ao carregar perfil.");

      const nn = String(data?.dialogueNickname ?? "");

      setStatus(data);
      setNickname(nn);
      setNicknameSnapshot(nn);
    } catch (e: any) {
      setProfileMsg(e?.message || "Erro ao carregar perfil.");
      setStatus(null);
      setNickname("");
      setNicknameSnapshot("");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function saveNickname() {
    if (!isEditingNickname) return;

    setSavingNickname(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/profile/dialogue-nickname", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dialogueNickname: nickname }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Falha ao salvar nickname.");

      await loadOnboardingStatus();
      setIsEditingNickname(false);
      setNicknameSavedOpen(true);
    } catch (e: any) {
      setProfileMsg(e?.message || "Erro ao salvar nickname.");
    } finally {
      setSavingNickname(false);
    }
  }

  function startEditNickname() {
    if (savingNickname || loggingOut || loadingProfile) return;
    setProfileMsg(null);
    setNicknameSnapshot(String(nickname ?? ""));
    setIsEditingNickname(true);
  }

  function cancelEditNickname() {
    setProfileMsg(null);
    setNickname(nicknameSnapshot);
    setIsEditingNickname(false);
  }

  async function loadBillingMe() {
    setLoadingPlan(true);
    setPlanMsg(null);

    try {
      const res = await fetch("/api/v1/billing/me", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Falha ao carregar plano.");
      setBillingMe(data);
    } catch (e: any) {
      setBillingMe(null);
      setPlanMsg(e?.message || "Erro ao carregar plano.");
    } finally {
      setLoadingPlan(false);
    }
  }

  function clearClientAuthStorage() {
    const localTokenKeys = [
      "accessToken",
      "token",
      "decoder_access_token",
      "decoder_accessToken",
      "decoder_token",
      "hint_jwt",
      "refreshToken",
      "jwt",
      "session",
      "hitch_token",
      "hitch_access_token",
      "hitch_refresh_token",
    ];

    const sessionKeys = [
      "hitch_last_stripe_session_id",
      "hitch_skip_onboarding_once",
      "hitch_journey",
      "decoder_pending_verify_email",
      "decoder_pending_verify_password",
      "decoder_pending_verify_next",
      "decoder_login_error",
      "signup_pending_email",
      "signup_pending_password",
      "signup_pending_next",
    ];

    try {
      for (const k of localTokenKeys) window.localStorage.removeItem(k);
    } catch {}

    try {
      for (const k of sessionKeys) window.sessionStorage.removeItem(k);
    } catch {}
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setProfileMsg(null);
    setPlanMsg(null);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Falha ao sair.");
      }

      clearClientAuthStorage();
      router.replace("/");
      router.refresh();
    } catch (e: any) {
      const msg = String(e?.message || "Erro ao sair.");
      setProfileMsg(msg);
      setPlanMsg(msg);
    } finally {
      setLoggingOut(false);
    }
  }

  useEffect(() => {
    loadOnboardingStatus();
    loadBillingMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== "profile") setIsEditingNickname(false);
  }, [tab]);

  useEffect(() => {
    if (tab !== "plano") setShowCancelPlanCard(false);
  }, [tab]);

  const planName = useMemo(
    () => billingMe?.plan?.name || status?.subscription?.planName || status?.planName || "—",
    [billingMe, status]
  );

  const billingCycleLabel = useMemo(() => {
    const raw = billingMe?.billingCycle || status?.subscription?.billingCycle || status?.billingCycle;
    return raw ? capitalize(String(raw)) : "—";
  }, [billingMe, status]);

  const planMonthlyCreditsLabel = useMemo(() => {
    const v = billingMe?.plan?.monthlyCredits ?? status?.subscription?.monthlyCredits ?? (status as any)?.creditsPerMonth;
    return v == null ? "—" : String(v);
  }, [billingMe, status]);

  const creditsBalanceLabel = useMemo(() => {
    const v =
      billingMe?.creditsBalance ??
      status?.creditsBalance ??
      (status as any)?.balance ??
      (status as any)?.credits?.balance;
    return v == null ? "—" : String(v);
  }, [billingMe, status]);

  const renewalLabel = useMemo(() => {
    const raw =
      billingMe?.renewAt ||
      billingMe?.renewalAt ||
      status?.renewAt ||
      (status as any)?.renewalAt ||
      status?.subscription?.renewAt ||
      status?.subscription?.renewalAt;
    return raw ? formatDate(raw) : "—";
  }, [billingMe, status]);

  const disableAll = loadingProfile || savingNickname || loadingPlan || loggingOut;

  const cancelPlanText =
    'Para cancelar seu plano, envie um e-mail para hitchai@hitchai.online, com o assunto "Cancelamento de Plano". No corpo do e-mail, informe o e-mail cadastrado (o mesmo que você usa para entrar no Hitch.ai).';

  return (
    <div className="app-main">
      {/* CSS do padrão CTA (mesmo do "Analisar") + correção de contraste dos CAMPOS no tema dark */}
      <style jsx global>{`
        /* Fallback seguro caso --h-accent ou --h-pill-text não existam */
        html {
          --h-accent-fallback: #6c63ff;
          --h-pill-text: var(--h-text);
        }

        .h-cta {
          box-sizing: border-box;
          border: 2px solid var(--h-accent, var(--h-accent-fallback));
          background: #ffffff;
          color: var(--h-pill-text);
          box-shadow: 0 14px 40px rgba(108, 99, 255, 0.25);
          transition: box-shadow 180ms ease, background 180ms ease, border-color 180ms ease, color 180ms ease;
        }

        .h-cta:hover {
          border-color: var(--h-accent, var(--h-accent-fallback));
          background: #f7f6ff;
          color: var(--h-pill-text);
          box-shadow: 0 18px 50px rgba(108, 99, 255, 0.32);
        }

        .h-cta:active {
          background: #f3f1ff;
          box-shadow: 0 14px 44px rgba(108, 99, 255, 0.28);
          transform: translateY(0px);
        }

        .h-cta--active {
          box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.55), 0 14px 40px rgba(108, 99, 255, 0.25);
        }

        .h-cta--danger {
          border-color: rgba(248, 113, 113, 0.65);
          color: rgb(220, 38, 38);
          box-shadow: 0 14px 40px rgba(248, 113, 113, 0.16);
        }

        .h-cta--danger:hover {
          border-color: rgba(239, 68, 68, 0.85);
          background: rgba(254, 242, 242, 1);
          box-shadow: 0 18px 50px rgba(239, 68, 68, 0.18);
        }

        .h-cta--solid {
          background: var(--h-accent, var(--h-accent-fallback));
          color: #fff;
          border-color: var(--h-accent, var(--h-accent-fallback));
          box-shadow: 0 14px 44px rgba(108, 99, 255, 0.28);
        }

        .h-cta--solid:hover {
          background: var(--h-accent, var(--h-accent-fallback));
          filter: brightness(0.98);
          box-shadow: 0 18px 56px rgba(108, 99, 255, 0.34);
        }

        /* Dark: CTA (mantém o padrão já validado) */
        html[data-theme="dark"] .h-cta {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.92);
          border-color: rgba(108, 99, 255, 0.62);
          box-shadow: 0 18px 54px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.03) inset;
        }

        html[data-theme="dark"] .h-cta:hover {
          background: rgba(255, 255, 255, 0.14);
          border-color: rgba(108, 99, 255, 0.72);
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.62), 0 0 52px rgba(108, 99, 255, 0.18);
        }

        html[data-theme="dark"] .h-cta--active {
          box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.35), 0 18px 54px rgba(0, 0, 0, 0.55);
        }

        /* =========================================================
           ✅ CORREÇÃO PEDIDA: contraste dos CAMPOS no tema DARK
           (InfoRow + Card de Cancelamento). Sem tocar em botões.
           ========================================================= */
        html[data-theme="dark"] .conta-field {
          background: rgba(255, 255, 255, 0.06) !important;
          border-color: rgba(255, 255, 255, 0.14) !important;
        }

        html[data-theme="dark"] .conta-field .conta-field-label {
          color: rgba(255, 255, 255, 0.72) !important;
        }

        html[data-theme="dark"] .conta-field .conta-field-value {
          color: rgba(255, 255, 255, 0.92) !important;
        }
      `}</style>

      <GuardSelectionModal
        open={nicknameSavedOpen}
        title="Atualizado com sucesso"
        message={"Seu nickname foi atualizado com sucesso."}
        fix={undefined}
        onClose={() => setNicknameSavedOpen(false)}
      />

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="card card-premium p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-base font-semibold text-[var(--h-text)]">Conta</div>
              <div className="text-sm text-[var(--h-subtitle)]">Perfil e detalhes do seu plano</div>
            </div>

            <button
              type="button"
              className={`${BTN_BASE} ${BTN_PILL}`}
              onClick={() => router.replace("/app")}
              disabled={disableAll}
            >
              Voltar para análise
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
            {/* Sidebar */}
            <div className="card p-3">
              <div className="mt-3 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setTab("profile")}
                  className={pillClass(tab === "profile")}
                  disabled={disableAll}
                >
                  Profile
                </button>

                <button
                  type="button"
                  onClick={() => setTab("plano")}
                  className={pillClass(tab === "plano")}
                  disabled={disableAll}
                >
                  Plano
                </button>

                <div className="my-2 h-px w-full bg-[var(--h-border)]" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${BTN_BASE} ${BTN_PILL} ${BTN_PILL_DANGER}`}
                  disabled={loggingOut}
                >
                  Sair
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="card p-4 md:p-5">
              {tab === "profile" ? (
                <>
                  <label className="label">Nickname</label>
                  <input
                    className={`input ${!isEditingNickname ? "cursor-default text-[var(--h-subtitle)]" : "text-[var(--h-text)]"}`}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    readOnly={!isEditingNickname}
                    disabled={loadingProfile || savingNickname || loggingOut}
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className={`${BTN_BASE} ${BTN_PILL} ${BTN_PILL_ACTIVE}`}
                      onClick={saveNickname}
                      disabled={!isEditingNickname || savingNickname || loggingOut}
                      type="button"
                    >
                      Salvar
                    </button>

                    {!isEditingNickname ? (
                      <button
                        className={`${BTN_BASE} ${BTN_PILL}`}
                        onClick={startEditNickname}
                        disabled={savingNickname || loggingOut || loadingProfile}
                        type="button"
                      >
                        Editar
                      </button>
                    ) : (
                      <button
                        className={`${BTN_BASE} ${BTN_PILL}`}
                        onClick={cancelEditNickname}
                        disabled={savingNickname || loggingOut}
                        type="button"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  {profileMsg && <div className="mt-3 text-sm text-[var(--h-subtitle)]">{profileMsg}</div>}
                </>
              ) : (
                <>
                  {!showCancelPlanCard ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <InfoRow label="Plano atual" value={planName} />
                      <InfoRow label="Ciclo" value={billingCycleLabel} />
                      <InfoRow label="Créditos do plano" value={planMonthlyCreditsLabel} />
                      <InfoRow label="Saldo atual" value={creditsBalanceLabel} />
                      <InfoRow label="Renovação" value={renewalLabel} />
                    </div>
                  ) : (
                    <div className="conta-field rounded-2xl border border-[var(--h-border)] bg-white/80 px-4 py-4">
                      <div className="conta-field-label text-xs font-semibold tracking-wide text-[var(--h-subtitle)]">
                        CANCELAMENTO DE PLANO
                      </div>
                      <div className="conta-field-value mt-2 text-sm leading-relaxed text-[var(--h-text)]">
                        {cancelPlanText}
                      </div>
                    </div>
                  )}

                  {planMsg && <div className="mt-3 text-sm text-[var(--h-subtitle)]">{planMsg}</div>}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={`${BTN_BASE} ${BTN_PILL}`}
                      onClick={loadBillingMe}
                      disabled={loadingPlan || loggingOut}
                    >
                      Atualizar
                    </button>

                    <button
                      type="button"
                      className={`${BTN_BASE} ${BTN_PILL}`}
                      onClick={() => setShowCancelPlanCard(true)}
                      disabled={loggingOut}
                    >
                      Cancelar plano
                    </button>

                    <button
                      type="button"
                      className={`${BTN_BASE} ${BTN_PILL} ${BTN_PILL_ACTIVE}`}
                      onClick={() => router.push("/app/billing/plan")}
                      disabled={loggingOut}
                    >
                      Atualizar plano
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="conta-field rounded-2xl border border-[var(--h-border)] bg-white/80 px-4 py-3">
      <div className="conta-field-label text-xs font-semibold tracking-wide text-[var(--h-subtitle)]">
        {label.toUpperCase()}
      </div>
      <div className="conta-field-value mt-1 text-sm text-[var(--h-text)]">{value}</div>
    </div>
  );
}

function capitalize(v: string) {
  if (!v) return "—";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function formatDate(v: any) {
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}