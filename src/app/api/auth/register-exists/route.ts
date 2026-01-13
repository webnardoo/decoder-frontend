import { NextRequest, NextResponse } from "next/server";
import { routeOrMock } from "@/lib/backend/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/register-exists  (ALIAS)
// body: { email: string }
// resp: 200 { exists: boolean }
export async function POST(req: NextRequest) {
  return routeOrMock(
    req,
    async () =>
      NextResponse.json(
        { error: "mock not implemented" },
        { status: 501 },
      ),
    "/api/v1/auth/register/exists",
  );
}

export async function GET() {
  return NextResponse.json({ message: "METHOD_NOT_ALLOWED" }, { status: 405 });
}
