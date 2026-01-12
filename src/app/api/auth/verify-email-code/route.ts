import { NextRequest, NextResponse } from "next/server";
import { routeOrMock } from "@/lib/backend/proxy";

export async function POST(req: NextRequest) {
  return routeOrMock(
    req,
    async () =>
      NextResponse.json(
        { error: "Mock não habilitado." },
        { status: 501 }
      ),
    "/api/v1/auth/verify-email-code"
  );
}
