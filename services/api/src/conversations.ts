import { Pool } from "pg";

export interface ConversationMessage { role: "user" | "assistant" | "system"; content: string }
export interface Conversation { id: string; tenantId: string; agentId: string; title: string; messages: ConversationMessage[]; createdAt: string; updatedAt: string }

export function createConversationStore(env: NodeJS.ProcessEnv = process.env) {
  const memory = new Map<string, Conversation>();
  const databaseUrl = env.DATABASE_URL?.trim();
  const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, max: 5 }) : undefined;
  const init = async () => {
    if (!pool) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, agent_id TEXT NOT NULL, title TEXT NOT NULL,
      messages JSONB NOT NULL DEFAULT '[]', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  };
  const list = async (tenantId: string) => {
    if (!pool) return [...memory.values()].filter((item) => item.tenantId === tenantId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const result = await pool.query("SELECT id, tenant_id AS \"tenantId\", agent_id AS \"agentId\", title, messages, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM conversations WHERE tenant_id=$1 ORDER BY updated_at DESC", [tenantId]);
    return result.rows as Conversation[];
  };
  const get = async (id: string, tenantId: string) => {
    if (!pool) {
      const item = memory.get(id);
      return item?.tenantId === tenantId ? item : undefined;
    }
    const result = await pool.query("SELECT id, tenant_id AS \"tenantId\", agent_id AS \"agentId\", title, messages, created_at AS \"createdAt\", updated_at AS \"updatedAt\" FROM conversations WHERE id=$1 AND tenant_id=$2", [id, tenantId]);
    return result.rows[0] as Conversation | undefined;
  };
  const create = async (tenantId: string, agentId: string, title: string) => {
    const now = new Date().toISOString();
    const item: Conversation = { id: crypto.randomUUID(), tenantId, agentId, title: title.trim().slice(0, 160) || "New conversation", messages: [], createdAt: now, updatedAt: now };
    if (pool) {
      const result = await pool.query("INSERT INTO conversations (id, tenant_id, agent_id, title, messages, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING id, tenant_id AS \"tenantId\", agent_id AS \"agentId\", title, messages, created_at AS \"createdAt\", updated_at AS \"updatedAt\"", [item.id, item.tenantId, item.agentId, item.title, JSON.stringify(item.messages), now]);
      return result.rows[0] as Conversation;
    }
    memory.set(item.id, item);
    return item;
  };
  const append = async (id: string, tenantId: string, messages: ConversationMessage[]) => {
    const item = await get(id, tenantId);
    if (!item) throw new Error("conversation_not_found");
    const next = { ...item, messages: [...item.messages, ...messages], updatedAt: new Date().toISOString() };
    if (pool) {
      const result = await pool.query("UPDATE conversations SET messages=$3, updated_at=$4 WHERE id=$1 AND tenant_id=$2 RETURNING id, tenant_id AS \"tenantId\", agent_id AS \"agentId\", title, messages, created_at AS \"createdAt\", updated_at AS \"updatedAt\"", [id, tenantId, JSON.stringify(next.messages), next.updatedAt]);
      return result.rows[0] as Conversation;
    }
    memory.set(id, next);
    return next;
  };
  return { init, list, get, create, append };
}
