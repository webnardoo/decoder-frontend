"use client";

import * as React from "react";
import { PlasmicRootProvider } from "@plasmicapp/loader-nextjs";
import { PLASMIC } from "@/plasmic-init";

// 🔴 IMPORT OBRIGATÓRIO
// Garante que TODOS os Code Components sejam registrados
// antes do Plasmic Studio tentar renderizar
import "@/components/plasmic/register";

export default function PlasmicGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlasmicRootProvider loader={PLASMIC}>
      {children}
    </PlasmicRootProvider>
  );
}
