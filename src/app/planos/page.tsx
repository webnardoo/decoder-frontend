// src/app/planos/page.tsx
import React from "react";
import TopNavClient from "./TopNavClient";

// Reaproveita o client atual que já existe no route group
import PublicPlansClient from "../(marketing)/planos/PublicPlansClient";

export default function PlanosPage() {
  return (
    <>
      <TopNavClient />
      <PublicPlansClient />
    </>
  );
}