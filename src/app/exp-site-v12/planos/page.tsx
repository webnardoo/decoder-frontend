import { Suspense } from "react";
import { cookies } from "next/headers";
import PlanosClient from "./PlanosClient";

export default async function Page() {
  const cookieStore = await cookies();
  const hasAuthCookie = Boolean(cookieStore.get("decoder_auth")?.value);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="w-full max-w-4xl card card-premium p-6 md:p-7">
            <div className="text-sm text-zinc-300/80">Carregando…</div>
          </div>
        </div>
      }
    >
      <PlanosClient isAuthed={hasAuthCookie} />
    </Suspense>
  );
}
