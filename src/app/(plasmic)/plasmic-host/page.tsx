"use client";

import { PlasmicCanvasHost } from "@plasmicapp/loader-nextjs";
import "@/components/plasmic/register"; // ← OBRIGATÓRIO

export default function PlasmicHostPage() {
  return <PlasmicCanvasHost />;
}
