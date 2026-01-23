// src/app/login/page.tsx
import { redirect } from "next/navigation";

export default function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const qs = new URLSearchParams();

  for (const [k, v] of Object.entries(searchParams || {})) {
    if (Array.isArray(v)) v.forEach((vv) => vv && qs.append(k, vv));
    else if (typeof v === "string" && v) qs.set(k, v);
  }

  const suffix = qs.toString();

  // ✅ FIX DEFINITIVO:
  // login REAL é /app/login
  // nunca deve virar /app/app/login
  redirect(`/app/login${suffix ? `?${suffix}` : ""}`);
}
