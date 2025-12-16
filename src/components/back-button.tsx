"use client";

import { useRouter } from "next/navigation";

export function BackButton({
  fallbackHref = "/",
  label = "Voltar",
  className = "btn",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function onBack() {
    // Se o usuário veio de outra página do app, isso volta corretamente.
    // Se ele abriu direto a URL, usamos fallback (Home).
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button type="button" className={className} onClick={onBack}>
      {label}
    </button>
  );
}
