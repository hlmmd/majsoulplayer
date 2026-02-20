import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie");
  const ok = await getSessionFromRequest(cookie);
  return NextResponse.json({ authenticated: ok });
}
