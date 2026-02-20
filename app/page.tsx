"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="home-wrap">
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
      <main className="main">
        <p className="welcome">已登录，欢迎使用雀魂数据站。</p>
        <p className="hint">
          <Link href="/settings">选手列表与战绩</Link> 可管理选手、查看缓存战绩，并一键刷新 ID 与战绩。
        </p>
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
          padding: 2rem 1.5rem;
        }
        .welcome {
          margin: 0 0 0.5rem;
          font-size: 1.1rem;
        }
        .hint {
          margin: 0;
          color: var(--text-muted);
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  );
}
