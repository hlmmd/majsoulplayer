import { NextRequest, NextResponse } from "next/server";
import {
  verifyCredentials,
  createSessionCookie,
  getSessionCookieName,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    if (!verifyCredentials(username, password)) {
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const cookie = createSessionCookie();
    const res = NextResponse.json({ success: true });
    res.headers.set("Set-Cookie", cookie);
    return res;
  } catch {
    return NextResponse.json(
      { success: false, message: "请求无效" },
      { status: 400 }
    );
  }
}
