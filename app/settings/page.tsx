"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";

type SortOrder = "asc" | "desc" | null;

const SORTABLE_COLUMNS = [
  { key: "nickname", label: "昵称" },
  { key: "id", label: "ID" },
  { key: "count", label: "场次" },
  { key: "levelId", label: "当前分段" },
  { key: "levelScore", label: "当前分数" },
  { key: "maxLevelId", label: "最高分段" },
  { key: "maxLevelScore", label: "最高分数" },
  { key: "rank1", label: "1位率" },
  { key: "rank2", label: "2位率" },
  { key: "rank3", label: "3位率" },
  { key: "rank4", label: "4位率" },
  { key: "avgRank", label: "平均顺位" },
] as const;

const STORAGE_LIST = "majsoul_player_list";
const STORAGE_CACHE = "majsoul_player_id_cache";

type SearchItem = {
  id: number;
  nickname: string;
  level?: { id: number; score: number; delta: number };
  latest_timestamp?: number;
};

type PlayerStats = {
  count: number;
  level: { id: number; score: number; delta: number };
  max_level: { id: number; score: number; delta: number };
  rank_rates: [number, number, number, number];
  avg_rank: number;
  id: number;
  nickname: string;
};

async function loadList(): Promise<string[]> {
  try {
    const res = await fetch("/api/player/list?type=list");
    if (!res.ok) {
      console.error("获取选手列表失败:", res.statusText);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data.filter((x: unknown) => typeof x === "string") : [];
  } catch (error) {
    console.error("获取选手列表异常:", error);
    return [];
  }
}

async function loadCache(): Promise<Record<string, number>> {
  try {
    const res = await fetch("/api/player/list?type=cache");
    if (!res.ok) {
      console.error("获取ID缓存失败:", res.statusText);
      return {};
    }
    const data = await res.json();
    return data && typeof data === "object" ? data : {};
  } catch (error) {
    console.error("获取ID缓存异常:", error);
    return {};
  }
}

async function loadStatsCache(): Promise<Record<string, PlayerStats>> {
  try {
    const res = await fetch("/api/player/stats-cache");
    if (!res.ok) {
      console.error("获取战绩数据失败:", res.statusText);
      return {};
    }
    const data = await res.json();
    return data && typeof data === "object" ? data : {};
  } catch (error) {
    console.error("获取战绩数据异常:", error);
    return {};
  }
}

async function saveList(list: string[]): Promise<void> {
  try {
    const res = await fetch("/api/player/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ list }),
    });
    if (!res.ok) {
      console.error("保存选手列表失败:", res.statusText);
    }
  } catch (error) {
    console.error("保存选手列表异常:", error);
  }
}

async function saveCache(cache: Record<string, number>): Promise<void> {
  try {
    const res = await fetch("/api/player/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cache }),
    });
    if (!res.ok) {
      console.error("保存ID缓存失败:", res.statusText);
    }
  } catch (error) {
    console.error("保存ID缓存异常:", error);
  }
}

async function saveStatsCache(stats: Record<string, PlayerStats>): Promise<void> {
  try {
    const res = await fetch("/api/player/stats-cache", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stats }),
    });
    if (!res.ok) {
      console.error("保存战绩数据失败:", res.statusText);
    }
  } catch (error) {
    console.error("保存战绩数据异常:", error);
  }
}

function levelScore(l: { score: number; delta: number }): number {
  return l.score + l.delta;
}

const LEVEL_RANK_MAP: Record<number, string> = {
  103: "雀杰",
  104: "雀豪",
  105: "雀圣",
  107: "魂天",
};

function levelIdToLabel(levelId: number | undefined | null): string {
  if (levelId == null || levelId === undefined) return "—";
  const rankCode = Math.floor(levelId / 100);
  const segment = levelId % 100;
  const rankName = LEVEL_RANK_MAP[rankCode];
  if (!rankName) return String(levelId);
  return `${rankName}${segment}`;
}

function findExactMatch(list: SearchItem[], nickname: string): SearchItem | null {
  const trimmed = nickname.trim();
  return list.find((item) => item.nickname === trimmed) ?? null;
}

function isValidId(id: number | undefined): boolean {
  return typeof id === "number" && id !== -1;
}

function getSortValue(
  key: (typeof SORTABLE_COLUMNS)[number]["key"],
  nickname: string,
  cache: Record<string, number>,
  statsCache: Record<string, PlayerStats>
): string | number | null {
  const id = cache[nickname];
  const stats = statsCache[nickname];
  switch (key) {
    case "nickname":
      return nickname;
    case "id":
      return id === undefined || id === -1 ? null : id;
    case "count":
      return stats?.count ?? null;
    case "levelId":
      return stats?.level?.id ?? null;
    case "levelScore":
      return stats ? levelScore(stats.level) : null;
    case "maxLevelId":
      return stats?.max_level?.id ?? null;
    case "maxLevelScore":
      return stats ? levelScore(stats.max_level) : null;
    case "rank1":
      return stats?.rank_rates?.[0] != null ? stats.rank_rates[0] * 100 : null;
    case "rank2":
      return stats?.rank_rates?.[1] != null ? stats.rank_rates[1] * 100 : null;
    case "rank3":
      return stats?.rank_rates?.[2] != null ? stats.rank_rates[2] * 100 : null;
    case "rank4":
      return stats?.rank_rates?.[3] != null ? stats.rank_rates[3] * 100 : null;
    case "avgRank":
      return stats?.avg_rank ?? null;
    default:
      return null;
  }
}

function compareSort(
  a: string | number | null,
  b: string | number | null,
  order: "asc" | "desc"
): number {
  const hasA = a !== null && a !== undefined;
  const hasB = b !== null && b !== undefined;
  if (!hasA && !hasB) return 0;
  if (!hasA) return 1;
  if (!hasB) return -1;
  const mul = order === "asc" ? 1 : -1;
  if (typeof a === "string" && typeof b === "string") {
    return mul * a.localeCompare(b);
  }
  return mul * ((a as number) - (b as number));
}

export default function SettingsPage() {
  const [list, setList] = useState<string[]>([]);
  const [cache, setCache] = useState<Record<string, number>>({});
  const [statsCache, setStatsCache] = useState<Record<string, PlayerStats>>({});
  const [sortColumn, setSortColumn] = useState<(typeof SORTABLE_COLUMNS)[number]["key"] | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const hydrate = useCallback(async () => {
    const [listData, cacheData, statsData] = await Promise.all([
      loadList(),
      loadCache(),
      loadStatsCache(),
    ]);
    setList(listData);
    setCache(cacheData);
    setStatsCache(statsData);
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const sortedList = useMemo(() => {
    if (!sortColumn || !sortOrder) return list;
    return [...list].sort((na, nb) => {
      const a = getSortValue(sortColumn, na, cache, statsCache);
      const b = getSortValue(sortColumn, nb, cache, statsCache);
      return compareSort(a, b, sortOrder);
    });
  }, [list, sortColumn, sortOrder, cache, statsCache]);

  const handleSort = (key: (typeof SORTABLE_COLUMNS)[number]["key"]) => {
    if (sortColumn !== key) {
      setSortColumn(key);
      setSortOrder("desc");
      return;
    }
    if (sortOrder === "desc") setSortOrder("asc");
    else {
      setSortColumn(null);
      setSortOrder(null);
    }
  };

  const addPlayer = async () => {
    const nickname = input.trim();
    if (!nickname) {
      setError("请输入选手昵称");
      return;
    }
    setError("");
    setLoading(true);
    try {
      let id: number | undefined = cache[nickname];
      if (id === undefined) {
        const res = await fetch(
          `/api/player/search?nickname=${encodeURIComponent(nickname)}`
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "获取选手 ID 失败");
          return;
        }
        const searchList: SearchItem[] = await res.json();
        const match = findExactMatch(searchList, nickname);
        id = match ? match.id : -1;
        const newCache = { ...cache, [nickname]: id };
        setCache(newCache);
        await saveCache(newCache);
      }
      if (list.includes(nickname)) {
        setError("该选手已在列表中");
        return;
      }
      const newList = [...list, nickname];
      setList(newList);
      await saveList(newList);
      setInput("");
    } finally {
      setLoading(false);
    }
  };

  const removePlayer = async (nickname: string) => {
    const newList = list.filter((n) => n !== nickname);
    setList(newList);
    await saveList(newList);
    const nextStats = { ...statsCache };
    delete nextStats[nickname];
    setStatsCache(nextStats);
    // 从服务端删除该选手的战绩
    try {
      await fetch(`/api/player/stats-cache?nickname=${encodeURIComponent(nickname)}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("删除战绩失败:", error);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    setError("");
    const endTime = String(Date.now());

    const runOne = async (nickname: string): Promise<void> => {
      const currentId = cache[nickname];
      let id: number | undefined = currentId;
      if (!isValidId(currentId)) {
        try {
          const res = await fetch(
            `/api/player/search?nickname=${encodeURIComponent(nickname)}`
          );
          if (res.ok) {
            const searchList: SearchItem[] = await res.json();
            const match = findExactMatch(searchList, nickname);
            id = match ? match.id : -1;
            setCache((prev) => {
              const next = { ...prev, [nickname]: id ?? -1 };
              saveCache(next).catch((err) => console.error("保存ID缓存失败:", err));
              return next;
            });
          }
        } catch {
          // keep existing
        }
      }
      if (isValidId(id)) {
        try {
          const res = await fetch(
            `/api/player/stats?playerId=${id}&endTime=${endTime}`
          );
          const data: PlayerStats & { error?: string } = await res.json();
          if (!data?.error && typeof data?.count === "number") {
            setStatsCache((prev) => {
              const next = { ...prev, [nickname]: data as PlayerStats };
              saveStatsCache(next);
              return next;
            });
          }
        } catch {
          // keep existing stats
        }
      }
    };

    const promises = list.map((nickname) => runOne(nickname));
    await Promise.all(promises);
    setRefreshing(false);
  };

  const exportData = () => {
    const data = { list, cache, stats: statsCache };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `majsoul-players-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    import("xlsx").then((mod) => {
      const XLSX = (mod as unknown as { default?: typeof mod }).default ?? mod;
      const headers = [
        "昵称",
        "ID",
        "场次",
        "当前分段",
        "当前分数",
        "最高分段",
        "最高分数",
        "1位率",
        "2位率",
        "3位率",
        "4位率",
        "平均顺位",
      ];
      const rows = sortedList.map((nickname) => {
        const id = cache[nickname];
        const stats = statsCache[nickname];
        return [
          nickname,
          id ?? "",
          stats?.count ?? "",
          stats ? levelIdToLabel(stats.level.id) : "",
          stats ? levelScore(stats.level) : "",
          stats ? levelIdToLabel(stats.max_level.id) : "",
          stats ? levelScore(stats.max_level) : "",
          stats?.rank_rates?.[0] != null ? (stats.rank_rates[0] * 100).toFixed(1) + "%" : "",
          stats?.rank_rates?.[1] != null ? (stats.rank_rates[1] * 100).toFixed(1) + "%" : "",
          stats?.rank_rates?.[2] != null ? (stats.rank_rates[2] * 100).toFixed(1) + "%" : "",
          stats?.rank_rates?.[3] != null ? (stats.rank_rates[3] * 100).toFixed(1) + "%" : "",
          typeof stats?.avg_rank === "number" ? stats.avg_rank.toFixed(2) : "",
        ];
      });
      const sheetData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "选手列表");
      XLSX.writeFile(wb, `majsoul-players-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const raw = reader.result as string;
        const data = JSON.parse(raw);
        const importedList = Array.isArray(data?.list)
          ? data.list.filter((x: unknown) => typeof x === "string")
          : [];
        const importedCache =
          data?.cache && typeof data.cache === "object" ? data.cache : {};
        const importedStats =
          data?.stats && typeof data.stats === "object" ? data.stats : {};
        const mergedList = Array.from(new Set([...list, ...importedList]));
        const mergedCache = { ...cache, ...importedCache };
        const mergedStats = { ...statsCache, ...importedStats };
        setList(mergedList);
        setCache(mergedCache);
        setStatsCache(mergedStats);
        await Promise.all([
          saveList(mergedList),
          saveCache(mergedCache),
          saveStatsCache(mergedStats),
        ]);
        setError("");
      } catch {
        setError("导入失败：文件格式无效，请使用导出的 JSON 文件");
      }
      e.target.value = "";
    };
    reader.readAsText(file, "UTF-8");
  };

  return (
    <div className="wrap">
      <header className="header">
        <h1 className="logo">雀魂数据</h1>
        <nav className="nav">
          <Link href="/" className="nav-link">
            首页
          </Link>
          <span className="nav-current">选手列表与战绩</span>
        </nav>
      </header>
      <main className="main">
        <h2 className="title">选手列表与战绩</h2>
        <p className="desc">
          列表与战绩均使用本地缓存，默认不请求接口。点击「刷新」可对无 ID 选手重新拉取 ID、对有 ID 选手更新战绩。
        </p>
        <div className="tool-row">
          <button type="button" className="btn-secondary" onClick={exportData}>
            导出 JSON
          </button>
          <button type="button" className="btn-secondary" onClick={exportExcel}>
            导出 Excel
          </button>
          <label className="btn-secondary btn-import">
            导入
            <input
              type="file"
              accept=".json,application/json"
              onChange={importData}
              className="file-input"
            />
          </label>
          <button
            type="button"
            className="btn-refresh"
            onClick={refreshAll}
            disabled={refreshing || list.length === 0}
          >
            {refreshing ? "刷新中…" : "刷新"}
          </button>
        </div>
        <div className="add-row">
          <input
            type="text"
            className="input"
            placeholder="输入选手游戏昵称"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPlayer()}
            disabled={loading}
          />
          <button
            type="button"
            className="btn-add"
            onClick={addPlayer}
            disabled={loading}
          >
            {loading ? "添加中…" : "添加"}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {SORTABLE_COLUMNS.map(({ key, label }) => (
                  <th
                    key={key}
                    className="th-sort"
                    onClick={() => handleSort(key)}
                    title={
                      sortColumn === key
                        ? sortOrder === "desc"
                          ? "降序，点击切换升序"
                          : "升序，点击还原"
                        : "点击降序"
                    }
                  >
                    {label}
                    {sortColumn === key && sortOrder === "asc" && " ↑"}
                    {sortColumn === key && sortOrder === "desc" && " ↓"}
                  </th>
                ))}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={13} className="empty">
                    暂无选手，请在上方添加
                  </td>
                </tr>
              ) : (
                sortedList.map((nickname) => {
                  const id = cache[nickname];
                  const stats = statsCache[nickname];
                  const hasId = isValidId(id);
                  return (
                    <tr key={nickname}>
                      <td>{nickname}</td>
                      <td>{id ?? "—"}</td>
                      {!hasId ? (
                        <td colSpan={10} className="muted">
                          暂无 ID
                        </td>
                      ) : stats ? (
                        <>
                          <td>{stats.count}</td>
                          <td>{levelIdToLabel(stats.level.id)}</td>
                          <td>{levelScore(stats.level)}</td>
                          <td>{levelIdToLabel(stats.max_level.id)}</td>
                          <td>{levelScore(stats.max_level)}</td>
                          <td>
                            {Array.isArray(stats.rank_rates) && stats.rank_rates[0] != null
                              ? `${(stats.rank_rates[0] * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                          <td>
                            {Array.isArray(stats.rank_rates) && stats.rank_rates[1] != null
                              ? `${(stats.rank_rates[1] * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                          <td>
                            {Array.isArray(stats.rank_rates) && stats.rank_rates[2] != null
                              ? `${(stats.rank_rates[2] * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                          <td>
                            {Array.isArray(stats.rank_rates) && stats.rank_rates[3] != null
                              ? `${(stats.rank_rates[3] * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                          <td>
                            {typeof stats.avg_rank === "number"
                              ? stats.avg_rank.toFixed(2)
                              : "—"}
                          </td>
                        </>
                      ) : (
                        <td colSpan={10} className="muted">
                          暂无战绩缓存
                        </td>
                      )}
                      <td>
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => removePlayer(nickname)}
                        >
                          移除
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
      <style jsx>{`
        .wrap {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
        }
        .logo {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--accent);
        }
        .nav {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .nav-link {
          font-size: 0.9rem;
        }
        .nav-current {
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .main {
          flex: 1;
          padding: 2rem 1.5rem;
          overflow-x: auto;
        }
        .title {
          margin: 0 0 0.5rem;
          font-size: 1.25rem;
        }
        .desc {
          margin: 0 0 1rem;
          font-size: 0.9rem;
          color: var(--text-muted);
        }
        .tool-row {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .btn-secondary {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          color: var(--text);
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .btn-secondary:hover {
          background: var(--border);
        }
        .btn-refresh {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          color: #0f1419;
          background: var(--accent);
          border: none;
          border-radius: 8px;
        }
        .btn-refresh:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .btn-refresh:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-import {
          cursor: pointer;
        }
        .file-input {
          position: absolute;
          width: 0;
          height: 0;
          opacity: 0;
        }
        .add-row {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }
        .input {
          flex: 1;
          min-width: 0;
          padding: 0.6rem 0.75rem;
          font-size: 1rem;
          color: var(--text);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          outline: none;
        }
        .input:focus {
          border-color: var(--accent);
        }
        .btn-add {
          padding: 0.6rem 1.25rem;
          font-size: 1rem;
          font-weight: 500;
          color: #0f1419;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          white-space: nowrap;
        }
        .btn-add:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .btn-add:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .error {
          margin: 0 0 1rem;
          font-size: 0.9rem;
          color: var(--error);
        }
        .table-wrap {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 8px;
        }
        .table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
          font-size: 0.9rem;
        }
        .table th,
        .table td {
          padding: 0.5rem 0.6rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .table th {
          background: var(--bg-card);
          color: var(--text-muted);
          font-weight: 500;
          white-space: nowrap;
        }
        .th-sort {
          cursor: pointer;
          user-select: none;
        }
        .th-sort:hover {
          color: var(--accent);
        }
        .table tr:last-child td {
          border-bottom: none;
        }
        .empty {
          color: var(--text-muted);
          text-align: center;
          padding: 1.5rem;
        }
        .muted {
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .btn-remove {
          padding: 0.25rem 0.5rem;
          font-size: 0.85rem;
          color: var(--error);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 4px;
        }
        .btn-remove:hover {
          background: rgba(229, 83, 75, 0.15);
        }
      `}</style>
    </div>
  );
}
