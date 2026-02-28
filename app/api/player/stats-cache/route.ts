import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const STATS_CACHE_FILE = join(DATA_DIR, "player-stats-cache.json");

type PlayerStats = {
  count: number;
  level: { id: number; score: number; delta: number };
  max_level: { id: number; score: number; delta: number };
  rank_rates: [number, number, number, number];
  avg_rank: number;
  id: number;
  nickname: string;
};

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 读取战绩缓存
async function readStatsCache(): Promise<Record<string, PlayerStats>> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(STATS_CACHE_FILE, "utf-8");
    const data = JSON.parse(content);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

// 保存战绩缓存
async function writeStatsCache(
  stats: Record<string, PlayerStats>
): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(STATS_CACHE_FILE, JSON.stringify(stats, null, 2), "utf-8");
}

// GET: 获取所有选手战绩
export async function GET() {
  try {
    const stats = await readStatsCache();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("读取战绩缓存失败:", error);
    return NextResponse.json(
      { error: "读取战绩数据失败" },
      { status: 500 }
    );
  }
}

// POST: 更新选手战绩（支持部分更新）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const updates = body?.stats;
    
    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "请提供有效的 stats 数据" },
        { status: 400 }
      );
    }

    const currentStats = await readStatsCache();
    const newStats = { ...currentStats, ...updates };
    await writeStatsCache(newStats);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("保存战绩缓存失败:", error);
    return NextResponse.json(
      { error: "保存战绩数据失败" },
      { status: 500 }
    );
  }
}

// PUT: 替换所有选手战绩
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const stats = body?.stats;
    
    if (!stats || typeof stats !== "object") {
      return NextResponse.json(
        { error: "请提供有效的 stats 数据" },
        { status: 400 }
      );
    }

    await writeStatsCache(stats);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("替换战绩缓存失败:", error);
    return NextResponse.json(
      { error: "替换战绩数据失败" },
      { status: 500 }
    );
  }
}

// DELETE: 删除指定选手的战绩
export async function DELETE(request: NextRequest) {
  try {
    const nickname = request.nextUrl.searchParams.get("nickname");
    
    if (!nickname) {
      return NextResponse.json(
        { error: "请提供 nickname 参数" },
        { status: 400 }
      );
    }

    const currentStats = await readStatsCache();
    const { [nickname]: removed, ...rest } = currentStats;
    await writeStatsCache(rest);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除战绩失败:", error);
    return NextResponse.json(
      { error: "删除战绩数据失败" },
      { status: 500 }
    );
  }
}
