"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STORAGE_LIST = "majsoul_player_list";
const STORAGE_STATS = "majsoul_player_stats_cache";
const STORAGE_TEAM_COUNT = "majsoul_team_count";
const STORAGE_TEAMS = "majsoul_teams_draft";
const STORAGE_STANDBY = "majsoul_standby";

type PlayerStats = {
  count: number;
  level: { id: number; score: number; delta: number };
  max_level: { id: number; score: number; delta: number };
  rank_rates: [number, number, number, number];
  avg_rank: number;
  id: number;
  nickname: string;
};

const LEVEL_RANK_MAP: Record<number, string> = {
  103: "雀杰",
  104: "雀豪",
  105: "雀圣",
  107: "魂天",
};

function loadList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_LIST);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function loadStatsCache(): Record<string, PlayerStats> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_STATS);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

function levelIdToLabel(levelId: number | undefined | null): string {
  if (levelId == null || levelId === undefined) return "—";
  const rankCode = Math.floor(levelId / 100);
  const segment = levelId % 100;
  const rankName = LEVEL_RANK_MAP[rankCode];
  if (!rankName) return String(levelId);
  return `${rankName}${segment}`;
}

function levelScore(l: { score: number; delta: number } | undefined): string {
  if (l == null) return "—";
  return String(l.score + l.delta);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type DragSource = { kind: "pool" } | { kind: "team"; teamIndex: number } | { kind: "standby" };

export default function HomePage() {
  const router = useRouter();
  const [list, setList] = useState<string[]>([]);
  const [statsCache, setStatsCache] = useState<Record<string, PlayerStats>>({});
  const [teamCount, setTeamCount] = useState(2);
  const [teams, setTeams] = useState<string[][]>([]);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragNickname, setDragNickname] = useState<string | null>(null);
  const [pointerDrag, setPointerDrag] = useState<{ nickname: string; source: DragSource; offsetX: number; offsetY: number } | null>(null);
  const [deletedNicknames, setDeletedNicknames] = useState<string[]>([]);
  const [expandedNicknames, setExpandedNicknames] = useState<string[]>([]);
  const [standbyPool, setStandbyPool] = useState<string[]>([]);
  const deletedSet = useMemo(() => new Set(deletedNicknames), [deletedNicknames]);
  const expandedSet = useMemo(() => new Set(expandedNicknames), [expandedNicknames]);
  const standbySet = useMemo(() => new Set(standbyPool), [standbyPool]);

  const toggleExpanded = useCallback((nickname: string) => {
    setExpandedNicknames((prev) =>
      prev.includes(nickname) ? prev.filter((n) => n !== nickname) : [...prev, nickname]
    );
  }, []);

  const toggleExpandedRef = useRef(toggleExpanded);
  toggleExpandedRef.current = toggleExpanded;
  const mainRef = useRef<HTMLElement | null>(null);
  const lastCardClickRef = useRef<{ nickname: string; time: number } | null>(null);
  const DOUBLE_CLICK_MS = 400;

  const pool = useMemo(() => {
    const inTeams = new Set(teams.flat());
    return list.filter((n) => !deletedSet.has(n) && !inTeams.has(n) && !standbySet.has(n));
  }, [list, teams, deletedSet, standbySet]);

  useEffect(() => {
    const handler = (e: Event) => {
      const target = (e as MouseEvent).target as HTMLElement | null;
      if (target?.closest?.(".home-player-card-delete")) return;
      const card = e.currentTarget as HTMLElement;
      const nickname = card.getAttribute("data-nickname");
      if (!nickname) return;
      const now = Date.now();
      const last = lastCardClickRef.current;
      if (last?.nickname === nickname && now - last.time < DOUBLE_CLICK_MS) {
        lastCardClickRef.current = null;
        e.preventDefault();
        e.stopPropagation();
        toggleExpandedRef.current(nickname);
      } else {
        lastCardClickRef.current = { nickname, time: now };
      }
    };
    let cleanups: (() => void)[] = [];
    const id = requestAnimationFrame(() => {
      const cards = document.querySelectorAll(".home-player-card");
      cards.forEach((el) => {
        if (!(el instanceof HTMLElement)) return;
        el.addEventListener("click", handler);
        cleanups.push(() => el.removeEventListener("click", handler));
      });
    });
    return () => {
      cancelAnimationFrame(id);
      cleanups.forEach((c) => c());
    };
  }, [pool, teams, standbyPool]);

  const hydrate = useCallback(() => {
    setList(loadList());
    setStatsCache(loadStatsCache());
    const savedCount = localStorage.getItem(STORAGE_TEAM_COUNT);
    const n = savedCount ? Math.max(2, Math.min(16, parseInt(savedCount, 10) || 2)) : 2;
    setTeamCount(n);
    const savedTeams = localStorage.getItem(STORAGE_TEAMS);
    let saved: string[][] = [];
    if (savedTeams) {
      try {
        const parsed = JSON.parse(savedTeams);
        if (Array.isArray(parsed)) saved = parsed.filter((t): t is string[] => Array.isArray(t) && t.every((x) => typeof x === "string"));
      } catch {
        // ignore
      }
    }
    if (saved.length !== n) {
      const next: string[][] = Array.from({ length: n }, (_, i) => saved[i] ?? []);
      setTeams(next);
    } else {
      setTeams(saved);
    }
    const savedStandby = localStorage.getItem(STORAGE_STANDBY);
    let standby: string[] = [];
    if (savedStandby) {
      try {
        const parsed = JSON.parse(savedStandby);
        if (Array.isArray(parsed)) standby = parsed.filter((x: unknown) => typeof x === "string");
      } catch {
        // ignore
      }
    }
    setStandbyPool(standby);
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const n = Math.max(2, Math.min(16, teamCount));
    if (n !== teamCount) {
      setTeamCount(n);
      return;
    }
    localStorage.setItem(STORAGE_TEAM_COUNT, String(n));
    setTeams((prev) => {
      const next: string[][] = [];
      for (let i = 0; i < n; i++) next.push(prev[i] ?? []);
      const saved = next.map((t) => [...t]);
      localStorage.setItem(STORAGE_TEAMS, JSON.stringify(saved));
      return next;
    });
  }, [teamCount]);

  const moveToPool = useCallback((nickname: string) => {
    setTeams((prev) => {
      const next = prev.map((t) => t.filter((n) => n !== nickname));
      localStorage.setItem(STORAGE_TEAMS, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveToTeam = useCallback((nickname: string, teamIndex: number) => {
    setTeams((prev) => {
      const next = prev.map((t) => t.filter((n) => n !== nickname));
      if (teamIndex >= 0 && teamIndex < next.length && !next[teamIndex].includes(nickname)) {
        next[teamIndex] = [...next[teamIndex], nickname];
      }
      localStorage.setItem(STORAGE_TEAMS, JSON.stringify(next));
      return next;
    });
  }, []);

  const moveToStandby = useCallback((nickname: string) => {
    setTeams((prev) => {
      const next = prev.map((t) => t.filter((n) => n !== nickname));
      localStorage.setItem(STORAGE_TEAMS, JSON.stringify(next));
      return next;
    });
    setStandbyPool((prev) => {
      if (prev.includes(nickname)) return prev;
      const next = [...prev, nickname];
      localStorage.setItem(STORAGE_STANDBY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFromStandby = useCallback((nickname: string) => {
    setStandbyPool((prev) => {
      const next = prev.filter((n) => n !== nickname);
      localStorage.setItem(STORAGE_STANDBY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleDeleteCard = useCallback((nickname: string) => {
    setDeletedNicknames((prev) => (prev.includes(nickname) ? prev : [...prev, nickname]));
    setTeams((prev) => {
      const next = prev.map((t) => t.filter((n) => n !== nickname));
      localStorage.setItem(STORAGE_TEAMS, JSON.stringify(next));
      return next;
    });
    setStandbyPool((prev) => {
      const next = prev.filter((n) => n !== nickname);
      if (next.length !== prev.length) localStorage.setItem(STORAGE_STANDBY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleRestoreAll = useCallback(() => {
    setDeletedNicknames([]);
    setTeams((prev) => {
      const next = prev.map(() => [] as string[]);
      localStorage.setItem(STORAGE_TEAMS, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleRandomGroup = useCallback(() => {
    setTeams((prev) => {
      const inTeams = new Set(prev.flat());
      const poolList = list.filter((n) => !deletedSet.has(n) && !standbySet.has(n) && !inTeams.has(n));
      const shuffled = shuffle(poolList);
      const n = Math.max(1, prev.length);
      const next: string[][] = prev.map((t) => [...t]);
      shuffled.forEach((nickname, i) => {
        next[i % n].push(nickname);
      });
      localStorage.setItem(STORAGE_TEAMS, JSON.stringify(next));
      return next;
    });
  }, [list, deletedSet, standbySet]);

  const handleDropPool = (e: React.DragEvent) => {
    e.preventDefault();
    const nickname = e.dataTransfer.getData("text/plain");
    if (nickname) moveToPool(nickname);
    setDragSource(null);
    setDragNickname(null);
  };

  const handleDropTeam = (e: React.DragEvent, teamIndex: number) => {
    e.preventDefault();
    const nickname = e.dataTransfer.getData("text/plain");
    if (nickname) moveToTeam(nickname, teamIndex);
    setDragSource(null);
    setDragNickname(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const [dragPreviewPos, setDragPreviewPos] = useState<{ x: number; y: number } | null>(null);
  const [dragPending, setDragPending] = useState<{
    nickname: string;
    source: DragSource;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const DRAG_THRESHOLD = 6;
  const moveToPoolRef = useRef(moveToPool);
  const moveToTeamRef = useRef(moveToTeam);
  const moveToStandbyRef = useRef(moveToStandby);
  const removeFromStandbyRef = useRef(removeFromStandby);
  const teamCountRef = useRef(teamCount);
  const handleRestoreAllRef = useRef(handleRestoreAll);
  const deletedNicknamesRef = useRef(deletedNicknames);
  const teamsRef = useRef(teams);
  moveToPoolRef.current = moveToPool;
  moveToTeamRef.current = moveToTeam;
  moveToStandbyRef.current = moveToStandby;
  removeFromStandbyRef.current = removeFromStandby;
  teamCountRef.current = teamCount;
  handleRestoreAllRef.current = handleRestoreAll;
  deletedNicknamesRef.current = deletedNicknames;
  teamsRef.current = teams;

  const handleCardPointerDown = useCallback((e: React.MouseEvent<HTMLDivElement>, nickname: string, source: DragSource) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragPending({
      nickname,
      source,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
    });
  }, []);

  useEffect(() => {
    if (!dragPending) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragPending.startX;
      const dy = e.clientY - dragPending.startY;
      if (dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
        setPointerDrag({
          nickname: dragPending.nickname,
          source: dragPending.source,
          offsetX: dragPending.offsetX,
          offsetY: dragPending.offsetY,
        });
        setDragPreviewPos({ x: e.clientX, y: e.clientY });
        setDragSource(dragPending.source);
        setDragNickname(dragPending.nickname);
        setDragPending(null);
      }
    };
    const onUp = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const restoreBtn = target?.closest?.(".btn-restore");
      const hasDeleted = deletedNicknamesRef.current.length > 0;
      const hasInTeams = teamsRef.current.some((t) => t.length > 0);
      if (restoreBtn && (hasDeleted || hasInTeams)) {
        handleRestoreAllRef.current();
      }
      setDragPending(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragPending]);

  useEffect(() => {
    if (!pointerDrag) return;
    document.body.setAttribute("data-dragging", "true");
    const onMove = (e: MouseEvent) => {
      setDragPreviewPos({ x: e.clientX, y: e.clientY });
    };
    const onUp = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const teamBox = el?.closest?.("[data-team-index]");
      const poolArea = el?.closest?.(".pool-area");
      const standbyArea = el?.closest?.(".standby-area");
      if (standbyArea) {
        moveToStandbyRef.current(pointerDrag.nickname);
      } else if (teamBox) {
        const idxStr = teamBox.getAttribute("data-team-index");
        const idx = idxStr != null ? parseInt(idxStr, 10) : -1;
        if (idx >= 0 && idx < teamCountRef.current) {
          removeFromStandbyRef.current(pointerDrag.nickname);
          moveToTeamRef.current(pointerDrag.nickname, idx);
        }
      } else if (poolArea) {
        removeFromStandbyRef.current(pointerDrag.nickname);
        moveToPoolRef.current(pointerDrag.nickname);
      }
      setPointerDrag(null);
      setDragPreviewPos(null);
      setDragSource(null);
      setDragNickname(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.body.removeAttribute("data-dragging");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [pointerDrag]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function PlayerCard({
    nickname,
    source,
    dim,
    onDelete,
    expanded,
  }: {
    nickname: string;
    source: DragSource;
    dim?: boolean;
    onDelete: () => void;
    expanded: boolean;
  }) {
    const stats = statsCache[nickname];
    const currentLevelLabel = stats ? levelIdToLabel(stats.level?.id) : "—";
    const currentScore = stats ? levelScore(stats.level) : "—";
    const avgRank = stats != null && typeof stats.avg_rank === "number" ? stats.avg_rank.toFixed(2) : "—";
    const rankCode = stats?.level?.id != null ? Math.floor(stats.level.id / 100) : null;
    const rankClass = rankCode !== null && [103, 104, 105, 107].includes(rankCode) ? `home-player-card-rank-${rankCode}` : "";
    return (
      <div
        className={`home-player-card ${rankClass} ${dim ? "dim" : ""} ${expanded ? "home-player-card-expanded" : ""}`}
        data-nickname={nickname}
        data-source={JSON.stringify(source)}
        draggable={false}
        onMouseDown={(e) => handleCardPointerDown(e, nickname, source)}
      >
        {expanded && (
          <button
            type="button"
            className="home-player-card-delete"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="临时删除"
            aria-label="临时删除"
          >
            ×
          </button>
        )}
        <div className="home-player-card-name">{nickname}</div>
        {expanded ? (
          <div className="home-player-card-detail">
            {stats ? (
              <>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">场次</span>
                  <span>{stats.count}</span>
                </div>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">当前分段</span>
                  <span>{levelIdToLabel(stats.level?.id)}</span>
                </div>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">当前分数</span>
                  <span>{levelScore(stats.level)}</span>
                </div>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">最高分段</span>
                  <span>{levelIdToLabel(stats.max_level?.id)}</span>
                </div>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">最高分数</span>
                  <span>{levelScore(stats.max_level)}</span>
                </div>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">1位率</span>
                  <span>{stats.rank_rates?.[0] != null ? `${(stats.rank_rates[0] * 100).toFixed(1)}%` : "—"}</span>
                </div>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">2位率</span>
                  <span>{stats.rank_rates?.[1] != null ? `${(stats.rank_rates[1] * 100).toFixed(1)}%` : "—"}</span>
                </div>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">3位率</span>
                  <span>{stats.rank_rates?.[2] != null ? `${(stats.rank_rates[2] * 100).toFixed(1)}%` : "—"}</span>
                </div>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">4位率</span>
                  <span>{stats.rank_rates?.[3] != null ? `${(stats.rank_rates[3] * 100).toFixed(1)}%` : "—"}</span>
                </div>
                <div className="home-player-card-detail-row">
                  <span className="detail-label">平均顺位</span>
                  <span>{typeof stats.avg_rank === "number" ? stats.avg_rank.toFixed(2) : "—"}</span>
                </div>
              </>
            ) : (
              <div className="home-player-card-detail-row">暂无战绩缓存</div>
            )}
          </div>
        ) : (
          <div className="home-player-card-stats">
            <span title="当前段位">{currentLevelLabel}</span>
            <span className="sep">/</span>
            <span title="当前分数">{currentScore}</span>
            <span className="sep">/</span>
            <span title="平均顺位">{avgRank}</span>
          </div>
        )}
      </div>
    );
  }

  const dragPreviewCard = pointerDrag && dragPreviewPos && (() => {
    const stats = statsCache[pointerDrag.nickname];
    const currentLevelLabel = stats ? levelIdToLabel(stats.level?.id) : "—";
    const currentScore = stats ? levelScore(stats.level) : "—";
    const avgRank = stats != null && typeof stats.avg_rank === "number" ? stats.avg_rank.toFixed(2) : "—";
    const rankCode = stats?.level?.id != null ? Math.floor(stats.level.id / 100) : null;
    const rankClass = rankCode !== null && [103, 104, 105, 107].includes(rankCode) ? `home-player-card-rank-${rankCode}` : "";
    return (
      <div
        className={`home-player-card home-player-card-drag-preview ${rankClass}`}
        style={{
          position: "fixed",
          left: dragPreviewPos.x - pointerDrag.offsetX,
          top: dragPreviewPos.y - pointerDrag.offsetY,
          pointerEvents: "none",
          zIndex: 10000,
        }}
      >
        <div className="home-player-card-name">{pointerDrag.nickname}</div>
        <div className="home-player-card-stats">
          <span>{currentLevelLabel}</span>
          <span className="sep">/</span>
          <span>{currentScore}</span>
          <span className="sep">/</span>
          <span>{avgRank}</span>
        </div>
      </div>
    );
  })();

  return (
    <div className="home-wrap">
      {dragPreviewCard}
      <header className="header">
        <h1 className="logo">雀魂数据</h1>
        <nav className="nav">
          <Link href="/settings" className="nav-link">
            选手列表与战绩
          </Link>
          <button type="button" onClick={handleLogout} className="logout-btn">
            退出登录
          </button>
        </nav>
      </header>
      <main className="main" ref={mainRef}>
        <div className="config-row" data-config-row>
          <label className="config-label">
            队伍个数：
            <input
              type="number"
              min={2}
              max={16}
              value={teamCount}
              onChange={(e) => setTeamCount(parseInt(e.target.value, 10) || 2)}
              className="config-input"
            />
          </label>
          <button
            type="button"
            className="btn-restore"
            onClick={handleRestoreAll}
            disabled={deletedNicknames.length === 0 && !teams.some((t) => t.length > 0)}
            title={
              deletedNicknames.length === 0 && !teams.some((t) => t.length > 0)
                ? "没有可复原的内容"
                : "恢复被删除的选手，并将所有选手放回选手区"
            }
          >
            复原
          </button>
          <button
            type="button"
            className="btn-random"
            onClick={handleRandomGroup}
            disabled={pool.length === 0}
            title="将选手区中的选手随机均分到各队伍"
          >
            随机分组
          </button>
        </div>

        <section className="teams-section" aria-label="队伍区域">
          <div className="teams-grid" style={{ gridTemplateColumns: `repeat(${teamCount}, 1fr)` }}>
            {teams.slice(0, teamCount).map((team, idx) => (
              <div
                key={idx}
                className="team-box"
                data-team-index={idx}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropTeam(e, idx)}
                data-drag-over={dragSource !== null && dragNickname !== null && !team.filter((n) => !deletedSet.has(n)).includes(dragNickname)}
              >
                <div className="team-box-title">队伍 {idx + 1}</div>
                <div className="team-box-list">
                  {team.filter((n) => !deletedSet.has(n)).map((nickname) => (
                    <PlayerCard
                      key={nickname}
                      nickname={nickname}
                      source={{ kind: "team", teamIndex: idx }}
                      dim={dragNickname === nickname}
                      onDelete={() => handleDeleteCard(nickname)}
                      expanded={expandedSet.has(nickname)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pool-section" aria-label="选手区">
          <h2 className="pool-title">选手区（可拖动到上方队伍框）</h2>
          <div
            className="pool-area"
            onDragOver={handleDragOver}
            onDrop={handleDropPool}
            data-drag-over={dragSource !== null}
          >
            {pool.length === 0 ? (
              <p className="pool-empty">暂无选手，或已全部放入队伍。请先在「选手列表与战绩」中添加选手。</p>
            ) : (
              <div className="pool-cards">
                {pool.map((nickname) => (
                  <PlayerCard
                    key={nickname}
                    nickname={nickname}
                    source={{ kind: "pool" }}
                    dim={dragNickname === nickname}
                    onDelete={() => handleDeleteCard(nickname)}
                    expanded={expandedSet.has(nickname)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="standby-section" aria-label="备战区">
          <h2 className="standby-title">备战区（复原时不会恢复）</h2>
          <div
            className="standby-area"
            onDragOver={handleDragOver}
            onDrop={(e) => {
              e.preventDefault();
              const nickname = e.dataTransfer.getData("text/plain");
              if (nickname) moveToStandby(nickname);
              setDragSource(null);
              setDragNickname(null);
            }}
            data-drag-over={dragSource !== null}
          >
            {standbyPool.length === 0 ? (
              <p className="standby-empty">可将选手区或队伍中的卡片拖入备战区</p>
            ) : (
              <div className="standby-cards">
                {standbyPool.map((nickname) => (
                  <PlayerCard
                    key={nickname}
                    nickname={nickname}
                    source={{ kind: "standby" }}
                    dim={dragNickname === nickname}
                    onDelete={() => handleDeleteCard(nickname)}
                    expanded={expandedSet.has(nickname)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <style jsx>{`
        .home-wrap {
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
        .logout-btn {
          padding: 0.35rem 0.6rem;
          font-size: 0.9rem;
          color: var(--accent);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
        }
        .logout-btn:hover {
          background: var(--border);
          color: var(--text);
        }
        .main {
          flex: 1;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .config-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          position: relative;
          z-index: 10;
        }
        .btn-restore {
          padding: 0.35rem 0.75rem;
          font-size: 0.9rem;
          color: var(--accent);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          position: relative;
          z-index: 11;
        }
        .btn-restore:hover:not(:disabled) {
          background: var(--border);
          color: var(--text);
        }
        .btn-restore:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-random {
          padding: 0.35rem 0.75rem;
          font-size: 0.9rem;
          color: var(--accent);
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          cursor: pointer;
          position: relative;
          z-index: 11;
        }
        .btn-random:hover:not(:disabled) {
          background: var(--border);
          color: var(--text);
        }
        .btn-random:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .config-label {
          font-size: 0.95rem;
          color: var(--text-muted);
        }
        .config-input {
          width: 4rem;
          padding: 0.35rem 0.5rem;
          font-size: 1rem;
          color: var(--text);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          outline: none;
        }
        .config-input:focus {
          border-color: var(--accent);
        }
        .teams-section {
          flex: 0 0 auto;
        }
        .teams-grid {
          display: grid;
          gap: 1rem;
          min-height: 140px;
        }
        .team-box {
          background: var(--bg-card);
          border: 2px dashed var(--border);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          transition: border-color 0.15s, background 0.15s;
        }
        .team-box[data-drag-over="true"] {
          border-color: var(--accent);
          background: rgba(201, 162, 39, 0.08);
        }
        .team-box-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 0.5rem;
        }
        .team-box-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          min-height: 2rem;
        }
        .pool-section {
          margin-top: auto;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border);
        }
        .pool-title {
          margin: 0 0 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .pool-area {
          min-height: 120px;
          padding: 1rem;
          background: var(--bg-card);
          border: 2px dashed var(--border);
          border-radius: 12px;
          transition: border-color 0.15s, background 0.15s;
        }
        .pool-area[data-drag-over="true"] {
          border-color: var(--accent);
          background: rgba(201, 162, 39, 0.06);
        }
        .pool-empty {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .pool-cards {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .standby-section {
          padding-top: 0.5rem;
          border-top: 1px solid var(--border);
        }
        .standby-title {
          margin: 0 0 0.5rem;
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .standby-area {
          min-height: 80px;
          padding: 1rem;
          background: var(--bg-card);
          border: 2px dashed var(--border);
          border-radius: 12px;
          transition: border-color 0.15s, background 0.15s;
        }
        .standby-area[data-drag-over="true"] {
          border-color: var(--accent);
          background: rgba(201, 162, 39, 0.06);
        }
        .standby-empty {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .standby-cards {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
      `}</style>
    </div>
  );
}
