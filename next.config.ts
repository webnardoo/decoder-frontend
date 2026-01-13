import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 🔒 GUARDA: Não usamos redirects/rewrites aqui para /planos.
   * Separação público vs logado é controlada por rotas (App Router) e lógica de fluxo no client.
   */
};

export default nextConfig;
