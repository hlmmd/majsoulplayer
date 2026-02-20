import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth";

export async function POST() {
  const name = getSessionCookieName();
  const res = NextResponse.json({ success: true });
  res.headers.set(
    "Set-Cookie",
    `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
  return res;
}
