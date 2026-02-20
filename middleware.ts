import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const LOGIN_PATH = "/login";

export async function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH;
  const cookie = request.headers.get("cookie");
  const authenticated = await getSessionFromRequest(cookie);

  if (isLoginPage) {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    const login = new URL(LOGIN_PATH, request.url);
    login.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
