import { NextRequest, NextResponse } from "next/server";

const STATS_API = "https://5-data.amae-koromo.com/api/v2/pl4/player_stats";
const START_TIME = "1262304000000";
const MODE = "16.12.9.15.11.8";

export async function GET(request: NextRequest) {
  const playerId = request.nextUrl.searchParams.get("playerId");
  if (!playerId || playerId === "-1") {
    return NextResponse.json(
      { error: "请提供有效的 playerId" },
      { status: 400 }
    );
  }
  const endTime =
    request.nextUrl.searchParams.get("endTime") ||
    String(Date.now());
  const url = `${STATS_API}/${playerId}/${START_TIME}/${endTime}?mode=${MODE}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "战绩接口请求失败" },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "战绩请求异常" },
      { status: 502 }
    );
  }
}
