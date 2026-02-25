// src/components/marketing/MarketingTopNav.tsx
"use client";

import React from "react";

// ✅ Fonte única do TopNav: módulo novo (mobile-first + notificações)
import MarketingTopNavNew, { type Props as MarketingTopNavProps } from "./topnav/MarketingTopNav";

export type Props = MarketingTopNavProps;

/**
 * Wrapper compatível:
 * Mantém o import existente no app:
 *   import MarketingTopNav from "@/components/marketing/MarketingTopNav";
 *
 * Mas renderiza o TopNav novo (src/components/marketing/topnav/*),
 * garantindo que o CSS do módulo novo seja carregado.
 */
export default function MarketingTopNav(props: Props) {
  return <MarketingTopNavNew {...props} />;
}