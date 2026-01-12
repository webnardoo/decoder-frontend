import type { ReactNode } from "react";
import { TopNav } from "@/components/top-nav";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col flex-1">
      <TopNav />
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
