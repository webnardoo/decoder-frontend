"use client";

import { PlasmicRootProvider } from "@plasmicapp/loader-nextjs";
import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";

const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: process.env.NEXT_PUBLIC_PلاسMIC_PROJECT_ID!,
      token: process.env.NEXT_PUBLIC_PLASMIC_API_TOKEN!,
    },
  ],
});

export default function PlasmicProviderClient({
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
