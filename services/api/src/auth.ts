import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";

export interface AuthUser { id: string; email: string; tenantId: string; displayName: string }
interface UserRecord extends AuthUser { passwordHash: string; salt: string }

export function createAuthStore(env: NodeJS.ProcessEnv = process.env) {
  const users = new Map<string, UserRecord>();
  const sessions = new Map<string, { userId: string; expiresAt: number }>();
  const pool = env.DATABASE_URL?.trim() ? new Pool({ connectionString: env.DATABASE_URL, max: 5, ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined }) : undefined;
  const init = async () => {
    if (!pool) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, tenant_id TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS auth_sessions (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  };
  const hash = (password: string, salt: string) => scryptSync(password, salt, 64).toString("hex");
  const publicUser = ({ passwordHash: _passwordHash, salt: _salt, ...user }: UserRecord): AuthUser => user;
  const register = async (email: string, password: string, displayName: string) => {
    const normalized = email.trim().toLowerCase();
    const salt = randomBytes(16).toString("hex");
    const user: UserRecord = { id: randomUUID(), email: normalized, tenantId: `tenant-${randomUUID()}`, displayName: displayName.trim(), salt, passwordHash: hash(password, salt) };
    if (pool) {
      try {
        await pool.query("INSERT INTO auth_users (id,email,tenant_id,display_name,password_hash,salt) VALUES ($1,$2,$3,$4,$5,$6)", [user.id, user.email, user.tenantId, user.displayName, user.passwordHash, user.salt]);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "23505") throw new Error("email_already_registered");
        throw error;
      }
    }
    if (users.has(normalized)) throw new Error("email_already_registered");
    users.set(normalized, user);
    return publicUser(user);
  };
  const login = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    const result = pool ? await pool.query<UserRecord>("SELECT id, email, tenant_id AS \"tenantId\", display_name AS \"displayName\", password_hash AS \"passwordHash\", salt FROM auth_users WHERE email=$1", [normalized]) : undefined;
    const user = result?.rows[0] ?? users.get(normalized);
    if (!user) throw new Error("invalid_credentials");
    const expected = Buffer.from(user.passwordHash, "hex");
    const actual = Buffer.from(hash(password, user.salt), "hex");
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error("invalid_credentials");
    const token = randomBytes(32).toString("base64url");
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
    if (pool) await pool.query("INSERT INTO auth_sessions (token,user_id,expires_at) VALUES ($1,$2,$3)", [token, user.id, new Date(expiresAt)]);
    sessions.set(token, { userId: user.id, expiresAt });
    return { token, user: publicUser(user) };
  };
  const authenticate = async (token: string | undefined) => {
    if (!token) return undefined;
    if (pool) {
      const result = await pool.query<UserRecord>("SELECT u.id, u.email, u.tenant_id AS \"tenantId\", u.display_name AS \"displayName\", u.password_hash AS \"passwordHash\", u.salt FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at > NOW()", [token]);
      return result.rows[0] ? publicUser(result.rows[0]) : undefined;
    }
    const session = sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) { sessions.delete(token); return undefined; }
    const user = [...users.values()].find((candidate) => candidate.id === session.userId);
    return user ? publicUser(user) : undefined;
  };
  const logout = async (token: string | undefined) => {
    if (token && pool) await pool.query("DELETE FROM auth_sessions WHERE token=$1", [token]);
    if (token) sessions.delete(token);
  };
  return { init, register, login, authenticate, logout };
}

export function readCookie(header: string | undefined, name: string) {
  return header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}
