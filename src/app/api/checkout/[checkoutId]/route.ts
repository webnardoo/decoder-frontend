import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4100";

export async function GET(
  _req: Request,
  { params }: { params: { checkoutId: string } }
) {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("accessToken")?.value ||
    cookieStore.get("decoder_auth")?.value ||
    "";

  const res = await fetch(`${BACKEND_URL}/api/v1/checkout/${params.checkoutId}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: "Resposta inválida do backend." }, { status: res.status });
}
