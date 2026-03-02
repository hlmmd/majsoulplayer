import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

const LOGIN_PATH = "/login";

export async function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH;
  const isHomePage = request.nextUrl.pathname === "/";
  const isApiTeamDraft = request.nextUrl.pathname.startsWith("/api/team/draft");
  const isApiPlayerList = request.nextUrl.pathname.startsWith("/api/player/list");
  const isApiPlayerStatsCache = request.nextUrl.pathname.startsWith("/api/player/stats-cache");
  
  const cookie = request.headers.get("cookie");
  const authenticated = await getSessionFromRequest(cookie);

  // 登录页面：已登录则重定向到首页
  if (isLoginPage) {
    if (authenticated) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 首页和只读 API：允许未登录访问
  if (isHomePage || isApiTeamDraft || isApiPlayerList || isApiPlayerStatsCache) {
    return NextResponse.next();
  }

  // 其他页面需要登录
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
