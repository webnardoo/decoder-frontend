"use client";

import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CheckoutSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleOk() {
    try {
      // ✅ bypass one-shot: impede guided trial/popup ao voltar pra Home
      sessionStorage.setItem("hitch_skip_onboarding_once", "1");

      // opcional: manter session_id pra debug
      const sessionId = searchParams?.get("session_id");
      if (sessionId) {
        sessionStorage.setItem("hitch_last_stripe_session_id", sessionId);
      }
    } catch {
      // silencioso
    }

    // ✅ rota correta do app (home do app)
    router.push("/app/app");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md card p-6 md:p-7">
        <div className="flex flex-col items-center text-center gap-4">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
            Pagamento Confirmado
          </h1>

          <div className="pt-1 w-full">
            <button
              type="button"
              className="btn btn-cta w-full"
              onClick={handleOk}
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
