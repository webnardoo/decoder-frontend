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

      // ✅ refresh do perfil + volta a read-only após salvar
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

    // garante snapshot atual antes de editar
    setNicknameSnapshot(String(nickname ?? ""));
    setIsEditingNickname(true);
  }

  function cancelEditNickname() {
    // desfaz mudança local e volta read-only
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
    // ✅ Remover exatamente as chaves que o app usa para autenticação
    // (alinha com src/lib/api/auth.ts)
    const localTokenKeys = [
      "accessToken",
      "token",
      "decoder_access_token",
      "decoder_accessToken",
      "decoder_token",
      "hint_jwt",
      // (extras defensivos — não custa remover)
      "refreshToken",
      "jwt",
      "session",
      "hitch_token",
      "hitch_access_token",
      "hitch_refresh_token",
    ];

    const sessionKeys = [
      // checkout success / journey flags
      "hitch_last_stripe_session_id",
      "hitch_skip_onboarding_once",
      "hitch_journey",
      // register/signup pending
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
      // 1) derruba sessão (cookies) no servidor Next
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Falha ao sair.");
      }

      // 2) limpa storages do client (evita “usuário fantasma” em localhost)
      clearClientAuthStorage();

      // 3) vai para Home MKT (app/page => "/")
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

  // ✅ se sair do tab profile, garante read-only
  useEffect(() => {
    if (tab !== "profile") setIsEditingNickname(false);
  }, [tab]);

  // ✅ ao entrar/sair do tab plano, reseta card de cancelamento
  useEffect(() => {
    if (tab !== "plano") setShowCancelPlanCard(false);
  }, [tab]);

  // --------- labels defensivos ---------

  const planName = useMemo(
    () =>
      billingMe?.plan?.name ||
      status?.subscription?.planName ||
      status?.planName ||
      "—",
    [billingMe, status]
  );

  const billingCycleLabel = useMemo(() => {
    const raw =
      billingMe?.billingCycle ||
      status?.subscription?.billingCycle ||
      status?.billingCycle;
    return raw ? capitalize(String(raw)) : "—";
  }, [billingMe, status]);

  const planMonthlyCreditsLabel = useMemo(() => {
    const v =
      billingMe?.plan?.monthlyCredits ??
      status?.subscription?.monthlyCredits ??
      status?.creditsPerMonth;
    return v == null ? "—" : String(v);
  }, [billingMe, status]);

  const creditsBalanceLabel = useMemo(() => {
    const v =
      billingMe?.creditsBalance ??
      status?.creditsBalance ??
      status?.balance ??
      status?.credits?.balance;
    return v == null ? "—" : String(v);
  }, [billingMe, status]);

  const renewalLabel = useMemo(() => {
    const raw =
      billingMe?.renewAt ||
      billingMe?.renewalAt ||
      status?.renewAt ||
      status?.renewalAt ||
      status?.subscription?.renewAt ||
      status?.subscription?.renewalAt;
    return raw ? formatDate(raw) : "—";
  }, [billingMe, status]);

  const disableAll = loadingProfile || savingNickname || loadingPlan || loggingOut;

  // ✅ Texto revisado (gramática/ortografia)
  const cancelPlanText =
    'Para cancelar seu plano, envie um e-mail para hitchai@hitchai.online, com o assunto "Cancelamento de Plano". No corpo do e-mail, informe o e-mail cadastrado (o mesmo que você usa para entrar no Hitch.ai).';

  return (
    <div className="app-main">
      {/* ✅ Pop-up de sucesso do nickname */}
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
              <div className="text-base font-semibold text-white/90">Conta</div>
              <div className="text-sm text-white/55">
                Perfil e detalhes do seu plano
              </div>
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => router.replace("/app")}
              disabled={disableAll}
            >
              Voltar para análise
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
            {/* Sidebar */}
            <div className="card p-3">
              <div className="mt-3 flex flex-col gap-2">
                <button
                  className={tab === "profile" ? "btn btn-primary" : "btn"}
                  onClick={() => setTab("profile")}
                  type="button"
                >
                  Profile
                </button>

                <button
                  className={tab === "plano" ? "btn btn-primary" : "btn"}
                  onClick={() => setTab("plano")}
                  type="button"
                >
                  Plano
                </button>

                {/* 🔹 Separador visual */}
                <div className="my-2 h-px w-full bg-white/10" />

                <button
                  className="btn text-red-300 hover:text-red-200 hover:border-red-400/40"
                  onClick={handleLogout}
                  type="button"
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
                    className={`input ${
                      !isEditingNickname ? "text-white/20 cursor-default" : "text-white"
                    }`}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    readOnly={!isEditingNickname}
                    disabled={loadingProfile || savingNickname || loggingOut}
                  />

                  <div className="mt-4 flex gap-3">
                    <button
                      className="btn-cta"
                      onClick={saveNickname}
                      disabled={!isEditingNickname || savingNickname || loggingOut}
                      type="button"
                    >
                      Salvar
                    </button>

                    {!isEditingNickname ? (
                      <button
                        className="btn"
                        onClick={startEditNickname}
                        disabled={savingNickname || loggingOut || loadingProfile}
                        type="button"
                      >
                        Editar
                      </button>
                    ) : (
                      <button
                        className="btn"
                        onClick={cancelEditNickname}
                        disabled={savingNickname || loggingOut}
                        type="button"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>

                  {profileMsg && (
                    <div className="mt-3 text-sm text-white/60">{profileMsg}</div>
                  )}
                </>
              ) : (
                <>
                  {!showCancelPlanCard ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <InfoRow label="Plano atual" value={planName} />
                      <InfoRow label="Ciclo" value={billingCycleLabel} />
                      <InfoRow label="Créditos do plano" value={planMonthlyCreditsLabel} />
                      <InfoRow label="Saldo atual" value={creditsBalanceLabel} />
                      <InfoRow label="Renovação" value={renewalLabel} />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
                      <div className="text-xs font-semibold tracking-wide text-white/45">
                        CANCELAMENTO DE PLANO
                      </div>
                      <div className="mt-2 text-sm text-white/85 leading-relaxed">
                        {cancelPlanText}
                      </div>
                    </div>
                  )}

                  {planMsg && (
                    <div className="mt-3 text-sm text-white/60">{planMsg}</div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <button
                      className="btn"
                      onClick={loadBillingMe}
                      disabled={loadingPlan || loggingOut}
                      type="button"
                    >
                      Atualizar
                    </button>

                    <button
                      className="btn"
                      onClick={() => setShowCancelPlanCard(true)}
                      type="button"
                      disabled={loggingOut}
                    >
                      Cancelar plano
                    </button>

                    <button
                      className="btn"
                      onClick={() => router.push("/app/billing/plan")}
                      type="button"
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-xs font-semibold tracking-wide text-white/45">
        {label.toUpperCase()}
      </div>
      <div className="mt-1 text-sm text-white/85">{value}</div>
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
