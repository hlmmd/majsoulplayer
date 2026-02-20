import { createHmac } from "crypto";

// 写死的登录凭据（按你的要求不提供修改密码功能）
export const CREDENTIALS = {
  username: "admin",
  password: "admin123",
} as const;

const SESSION_COOKIE_NAME = "majsoul_session";
const SECRET = "majsoul-secret-key-change-in-production";

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i];
  return out === 0;
}

export function verifyCredentials(username: string, password: string): boolean {
  const userOk =
    username.length === CREDENTIALS.username.length &&
    timingSafeEqual(
      new TextEncoder().encode(username),
      new TextEncoder().encode(CREDENTIALS.username)
    );
  const passOk =
    password.length === CREDENTIALS.password.length &&
    timingSafeEqual(
      new TextEncoder().encode(password),
      new TextEncoder().encode(CREDENTIALS.password)
    );
  return !!userOk && !!passOk;
}

// 仅在 Node 环境（API 路由）中用于创建 session
export function createSessionCookie(): string {
  const payload = `${CREDENTIALS.username}:${Date.now()}`;
  const signature = createHmac("sha256", SECRET).update(payload).digest("hex");
  const token = Buffer.from(`${payload}.${signature}`).toString("base64url");
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

// 解析 hex 字符串为 Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++)
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

// 使用 Web Crypto，可在 Edge（middleware）中运行
async function verifySessionCookieAsync(
  cookieValue: string | undefined
): Promise<boolean> {
  if (!cookieValue) return false;
  try {
    const raw = atob(cookieValue.replace(/-/g, "+").replace(/_/g, "/"));
    const [payload, signatureHex] = raw.split(".");
    if (!payload || !signatureHex || signatureHex.length !== 64) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(payload)
    );
    const expectedHex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const got = hexToBytes(signatureHex);
    const exp = hexToBytes(expectedHex);
    if (got.length !== exp.length) return false;
    return timingSafeEqual(got, exp);
  } catch {
    return false;
  }
}

export async function getSessionFromRequest(
  cookieHeader: string | null
): Promise<boolean> {
  if (!cookieHeader) return false;
  const match = cookieHeader.match(
    new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`)
  );
  return verifySessionCookieAsync(match?.[1]?.trim());
}
