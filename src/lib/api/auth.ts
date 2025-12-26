export function getJwtOrNull(): string | null {
  if (typeof window === "undefined") return null;

  // ✅ Compatível com as chaves reais do app (print do Leonardo)
  const token =
    window.localStorage.getItem("accessToken") ||
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("decoder_access_token") ||
    window.localStorage.getItem("decoder_accessToken") ||
    window.localStorage.getItem("decoder_token") ||
    window.localStorage.getItem("hint_jwt") ||
    "";

  const t = String(token || "").trim();
  return t.length > 0 ? t : null;
}
