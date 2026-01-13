import { NextRequest, NextResponse } from "next/server";
import { routeOrMock } from "@/lib/backend/proxy";

// ✅ força Node runtime (env server-side garantida)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Contrato:
// POST { email: string } -> 200 { exists: boolean }
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
