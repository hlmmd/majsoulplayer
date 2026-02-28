import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const LIST_FILE = join(DATA_DIR, "player-list.json");
const CACHE_FILE = join(DATA_DIR, "player-id-cache.json");

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 读取选手列表
async function readList(): Promise<string[]> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(LIST_FILE, "utf-8");
    const data = JSON.parse(content);
    return Array.isArray(data) ? data.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

// 保存选手列表
async function writeList(list: string[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(LIST_FILE, JSON.stringify(list, null, 2), "utf-8");
}

// 读取ID缓存
async function readCache(): Promise<Record<string, number>> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(CACHE_FILE, "utf-8");
    const data = JSON.parse(content);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

// 保存ID缓存
async function writeCache(cache: Record<string, number>): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

// GET: 获取选手列表和ID缓存
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");
    
    if (type === "list") {
      const list = await readList();
      return NextResponse.json(list);
    } else if (type === "cache") {
      const cache = await readCache();
      return NextResponse.json(cache);
    } else {
      // 返回两者
      const [list, cache] = await Promise.all([readList(), readCache()]);
      return NextResponse.json({ list, cache });
    }
  } catch (error) {
    console.error("读取选手列表失败:", error);
    return NextResponse.json(
      { error: "读取数据失败" },
      { status: 500 }
    );
  }
}

// POST: 更新选手列表和ID缓存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const list = body?.list;
    const cache = body?.cache;
    
    if (list !== undefined) {
      if (!Array.isArray(list)) {
        return NextResponse.json(
          { error: "list 必须是数组" },
          { status: 400 }
        );
      }
      await writeList(list);
    }
    
    if (cache !== undefined) {
      if (typeof cache !== "object" || cache === null) {
        return NextResponse.json(
          { error: "cache 必须是对象" },
          { status: 400 }
        );
      }
      await writeCache(cache);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("保存选手列表失败:", error);
    return NextResponse.json(
      { error: "保存数据失败" },
      { status: 500 }
    );
  }
}

// PUT: 替换选手列表或ID缓存
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const list = body?.list;
    const cache = body?.cache;
    
    if (list !== undefined) {
      if (!Array.isArray(list)) {
        return NextResponse.json(
          { error: "list 必须是数组" },
          { status: 400 }
        );
      }
      await writeList(list);
    }
    
    if (cache !== undefined) {
      if (typeof cache !== "object" || cache === null) {
        return NextResponse.json(
          { error: "cache 必须是对象" },
          { status: 400 }
        );
      }
      await writeCache(cache);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("替换选手列表失败:", error);
    return NextResponse.json(
      { error: "替换数据失败" },
      { status: 500 }
    );
  }
}
