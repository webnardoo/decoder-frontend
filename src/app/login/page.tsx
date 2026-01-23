// src/app/login/page.tsx
import { redirect } from "next/navigation";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function buildQuery(searchParams?: Props["searchParams"]) {
  if (!searchParams) return "";

  const usp = new URLSearchParams();

  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string") usp.set(k, v);
    else if (Array.isArray(v)) v.forEach((vv) => usp.append(k, vv));
  }

  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export default function LoginAliasPage({ searchParams }: Props) {
  const qs = buildQuery(searchParams);
  redirect(`/app/login${qs}`);
}
