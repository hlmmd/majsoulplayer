"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "登录失败");
        return;
      }
      router.push(from);
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="login-title">雀魂数据</h1>
        <p className="login-desc">请登录以继续</p>
        <form onSubmit={handleSubmit} className="login-form">
          <label className="label">用户名</label>
          <input
            type="text"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
          <label className="label">密码</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      </div>
      <style jsx>{`
        .login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: linear-gradient(160deg, #0f1419 0%, #1a2332 50%, #0f1419 100%);
        }
        .login-card {
          width: 100%;
          max-width: 360px;
          padding: 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .login-title {
          margin: 0 0 0.25rem;
          font-size: 1.5rem;
          font-weight: 600;
          text-align: center;
          color: var(--accent);
        }
        .login-desc {
          margin: 0 0 1.5rem;
          font-size: 0.9rem;
          color: var(--text-muted);
          text-align: center;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .input {
          width: 100%;
          padding: 0.6rem 0.75rem;
          font-size: 1rem;
          color: var(--text);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 8px;
          outline: none;
          transition: border-color 0.2s;
        }
        .input:focus {
          border-color: var(--accent);
        }
        .error {
          margin: 0;
          font-size: 0.875rem;
          color: var(--error);
        }
        .btn {
          margin-top: 0.5rem;
          padding: 0.65rem 1rem;
          font-size: 1rem;
          font-weight: 500;
          color: #0f1419;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        加载中…
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
