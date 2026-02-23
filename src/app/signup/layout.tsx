import type { ReactNode } from "react";

import "@/app/exp-site-v12/site.css";
import "@/app/exp-site-v12/exp.css";

import MarketingTopNav from "@/components/marketing/MarketingTopNav";
import { AppFooter } from "@/components/app-footer";

export default function SignupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <div className="mkt">
        <MarketingTopNav mode="minimal" />
      </div>

      <main className="flex-1 flex">{children}</main>

      <AppFooter />
    </div>
  );
}