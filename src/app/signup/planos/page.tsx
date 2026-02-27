// src/app/signup/planos/page.tsx
import React from "react";
import { redirect } from "next/navigation";

type Props = {
  searchParams?: {
    next?: string;
    [k: string]: string | string[] | undefined;
  };
};

export default function SignupPlanosPage({ searchParams }: Props) {
  const next = typeof searchParams?.next === "string" ? searchParams.next : undefined;

  // Mantém compatibilidade com o fluxo /signup/*, mas centraliza a UI real em /planos
  // (onde o TopNavClient já foi estabilizado).
  if (next) {
    redirect(`/planos?next=${encodeURIComponent(next)}`);
  }

  redirect("/planos");
}