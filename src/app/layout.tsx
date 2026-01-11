import type { ReactNode } from "react";
import "./globals.css";

import { AppFooter } from "@/components/app-footer"; // ajuste o path real aqui

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen h-app-bg">
        <div className="min-h-screen flex flex-col">

          <main className="flex-1 flex flex-col">{children}</main>
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
