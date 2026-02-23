// src/app/(marketing)/layout.tsx
import type { ReactNode } from "react";
import "../exp-site-v12/site.css"; // GARANTE CSS do marketing

export default function MarketingGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mkt">
      {children}
    </div>
  );
}