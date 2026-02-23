// src/app/planos/page.tsx
import React from "react";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import PlanosPageClient from "./PlanosPageClient"; // ou o nome real do seu client

export default function PlanosPage() {
  return (
    <MarketingLayout>
      <PlanosPageClient />
    </MarketingLayout>
  );
}