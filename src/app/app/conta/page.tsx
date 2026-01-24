"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

  // Plano
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [billingMe, setBillingMe] = useState<BillingMeResponse | null>(null);
  const [planMsg, setPlanMsg] = useState<string | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);

  async function loadOnboardingStatus() {
    setLoadingProfile(true);
    setProfileMsg(null);

    try {
      const res = await fetch("/api/onboarding/status", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Falha ao carregar perfil.");
      setStatus(data);
      setNickname(String(data?.dialogueNickname ?? ""));
    } catch (e: any) {
      setProfileMsg(e?.message || "Erro ao carregar perfil.");
      setStatus(null);
      setNickname("");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function saveNickname() {
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

      setProfileMsg("Nickname atualizado.");
      await loadOnboardingStatus();
    } catch (e: any) {
      setProfileMsg(e?.message || "Erro ao salvar nickname.");
    } finally {
      setSavingNickname(false);
    }
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

      // 2) limpa storages do client (seguro; evita tokens em localStorage/sessionStorage)
      try {
        sessionStorage.clear();
      } catch {}
      try {
        // remove chaves comuns sem nukar tudo (mais conservador)
        const keys = [
          "token",
          "accessToken",
          "refreshToken",
          "jwt",
          "session",
          "decoder_token",
          "hitch_token",
          "hitch_access_token",
          "hitch_refresh_token",
          "hitch_refresh_token",
        ];
        for (const k of keys) localStorage.removeItem(k);
      } catch {}

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

  // --------- labels defensivos ---------

  const planName = useMemo(
    () =>
      billingMe?.plan?.name ||
      status?.subscription?.planName ||
      status?.planName ||
      "—",
    [billingMe, status],
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

  return (
    <div className="app-main">
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
                    className="input"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={loadingProfile || savingNickname || loggingOut}
                  />

                  <div className="mt-4 flex gap-3">
                    <button
                      className="btn-cta"
                      onClick={saveNickname}
                      disabled={savingNickname || loggingOut}
                      type="button"
                    >
                      Salvar
                    </button>
                    <button
                      className="btn"
                      onClick={loadOnboardingStatus}
                      disabled={savingNickname || loggingOut}
                      type="button"
                    >
                      Atualizar
                    </button>
                  </div>

                  {profileMsg && (
                    <div className="mt-3 text-sm text-white/60">
                      {profileMsg}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoRow label="Plano atual" value={planName} />
                    <InfoRow label="Ciclo" value={billingCycleLabel} />
                    <InfoRow
                      label="Créditos do plano"
                      value={planMonthlyCreditsLabel}
                    />
                    <InfoRow label="Saldo atual" value={creditsBalanceLabel} />
                    <InfoRow label="Renovação" value={renewalLabel} />
                  </div>

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
