// src/app/api/_debug/backend-base-url/route.ts

import { NextResponse } from "next/server";
import {
  getBackendBaseUrl,
  __debugBackendBaseUrlSnapshot,
} from "@/lib/backend/base-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = __debugBackendBaseUrlSnapshot();

  try {
    const baseUrl = getBackendBaseUrl();
    return NextResponse.json({ ok: true, snapshot, baseUrl });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        snapshot,
        error: {
          message: String(err?.message || err),
        },
      },
      { status: 500 }
    );
  }
}
