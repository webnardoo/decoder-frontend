import React from "react";
import "@/app/exp-site-v12/exp.css";
import "@/app/exp-site-v12/site.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}