import { NextRequest, NextResponse } from "next/server";

const SEARCH_API =
  "https://5-data.amae-koromo.com/api/v2/pl4/search_player";

export async function GET(request: NextRequest) {
  const nickname = request.nextUrl.searchParams.get("nickname");
  if (!nickname || !nickname.trim()) {
    return NextResponse.json(
      { error: "请提供 nickname 参数" },
      { status: 400 }
    );
  }
  const encoded = encodeURIComponent(nickname.trim());
  const url = `${SEARCH_API}/${encoded}?limit=20&tag=all`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "搜索接口请求失败" },
        { status: 502 }
      );
    }
    const list = await res.json();
    if (!Array.isArray(list)) {
      return NextResponse.json(
        { error: "搜索接口返回格式异常" },
        { status: 502 }
      );
    }
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json(
      { error: "搜索请求异常" },
      { status: 502 }
    );
  }
}
