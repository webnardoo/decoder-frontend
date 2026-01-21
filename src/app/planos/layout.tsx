import type { ReactNode } from "react";

export default function PlanosLayout({ children }: { children: ReactNode }) {
  return (
    <main className="app-main w-full flex-1 flex">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 flex flex-1 flex-col">
        {children}
      </div>
    </main>
  );
}
