import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // ✅ no seu Next, cookies() é Promise
  const jar = await cookies();
  const all = jar.getAll();

  const res = NextResponse.json({ ok: true }, { status: 200 });

  const secure = process.env.NODE_ENV === "production";

  // ✅ expira todos os cookies que existirem no request
  for (const c of all) {
    res.cookies.set({
      name: c.name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
  }

  // ✅ fallback para nomes comuns (caso algum não venha em getAll por variação de path/domain)
  const common = [
    "accessToken",
    "refreshToken",
    "token",
    "jwt",
    "session",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];

  for (const name of common) {
    res.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 0,
    });
  }

  return res;
}
