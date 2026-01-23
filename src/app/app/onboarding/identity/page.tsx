"use client";

import { Suspense, useEffect } from "react";
import IdentityClient from "./IdentityClient";

function DebugMount() {
  useEffect(() => {
    console.log("[IDENTITY_PAGE] mounted");
  }, []);
  return null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DebugMount />
      <IdentityClient />
    </Suspense>
  );
}
