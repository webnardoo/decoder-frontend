// src/app/app/forgot-password/page.tsx
import { redirect } from "next/navigation";

export default function Page() {
  // ✅ rota canônica vive fora do "app shell"
  // (evita loop com /app/app/layout.tsx)
  redirect("/forgot-password");
}
