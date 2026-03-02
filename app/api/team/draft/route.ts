import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";
import { getSessionFromRequest } from "@/lib/auth";

const DATA_DIR = join(process.cwd(), "data");
const DRAFT_FILE = join(DATA_DIR, "team-draft.json");

type TeamDraft = {
  teamCount: number;
  teams: string[][];
  standby: string[];
};

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// 读取分组数据
async function readDraft(): Promise<TeamDraft> {
  await ensureDataDir();
  try {
    const content = await fs.readFile(DRAFT_FILE, "utf-8");
    const data = JSON.parse(content);
    // 验证数据格式
    if (data && typeof data === "object") {
      const teamCount = typeof data.teamCount === "number" ? Math.max(2, Math.min(16, data.teamCount)) : 2;
      const teams = Array.isArray(data.teams)
        ? data.teams.filter((t: unknown): t is string[] => Array.isArray(t) && t.every((x) => typeof x === "string"))
        : [];
      const standby = Array.isArray(data.standby)
        ? data.standby.filter((x: unknown): x is string => typeof x === "string")
        : [];
      return { teamCount, teams, standby };
    }
  } catch {
    // 文件不存在或格式错误，返回默认值
  }
  return { teamCount: 2, teams: [], standby: [] };
}

// 保存分组数据
async function writeDraft(draft: TeamDraft): Promise<void> {
  await ensureDataDir();
  // 确保 teamCount 在有效范围内
  const validatedDraft: TeamDraft = {
    teamCount: Math.max(2, Math.min(16, draft.teamCount)),
    teams: draft.teams || [],
    standby: draft.standby || [],
  };
  await fs.writeFile(DRAFT_FILE, JSON.stringify(validatedDraft, null, 2), "utf-8");
}

// GET: 获取分组数据
export async function GET() {
  try {
    const draft = await readDraft();
    return NextResponse.json(draft);
  } catch (error) {
    console.error("读取分组数据失败:", error);
    return NextResponse.json(
      { error: "读取分组数据失败" },
      { status: 500 }
    );
  }
}

// POST: 更新分组数据（支持部分更新）
export async function POST(request: NextRequest) {
  // 检查登录状态
  const cookie = request.headers.get("cookie");
  const authenticated = await getSessionFromRequest(cookie);
  if (!authenticated) {
    return NextResponse.json(
      { error: "需要登录才能修改分组数据" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const currentDraft = await readDraft();
    
    const updatedDraft: TeamDraft = {
      teamCount: body?.teamCount !== undefined ? Math.max(2, Math.min(16, Number(body.teamCount) || 2)) : currentDraft.teamCount,
      teams: body?.teams !== undefined
        ? (Array.isArray(body.teams)
            ? body.teams.filter((t: unknown): t is string[] => Array.isArray(t) && t.every((x) => typeof x === "string"))
            : [])
        : currentDraft.teams,
      standby: body?.standby !== undefined
        ? (Array.isArray(body.standby)
            ? body.standby.filter((x: unknown): x is string => typeof x === "string")
            : [])
        : currentDraft.standby,
    };
    
    await writeDraft(updatedDraft);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("保存分组数据失败:", error);
    return NextResponse.json(
      { error: "保存分组数据失败" },
      { status: 500 }
    );
  }
}

// PUT: 替换所有分组数据
export async function PUT(request: NextRequest) {
  // 检查登录状态
  const cookie = request.headers.get("cookie");
  const authenticated = await getSessionFromRequest(cookie);
  if (!authenticated) {
    return NextResponse.json(
      { error: "需要登录才能修改分组数据" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "请提供有效的分组数据" },
        { status: 400 }
      );
    }

    const draft: TeamDraft = {
      teamCount: Math.max(2, Math.min(16, Number(body.teamCount) || 2)),
      teams: Array.isArray(body.teams)
        ? body.teams.filter((t: unknown): t is string[] => Array.isArray(t) && t.every((x) => typeof x === "string"))
        : [],
      standby: Array.isArray(body.standby)
        ? body.standby.filter((x: unknown): x is string => typeof x === "string")
        : [],
    };

    await writeDraft(draft);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("替换分组数据失败:", error);
    return NextResponse.json(
      { error: "替换分组数据失败" },
      { status: 500 }
    );
  }
}
