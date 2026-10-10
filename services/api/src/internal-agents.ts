export type InternalAgentProvider = "google" | "openai";
export type InternalAgentState = "idle" | "ready" | "disabled";

export interface InternalAgent {
  id: string;
  tenantId?: string;
  name: string;
  role: string;
  provider: InternalAgentProvider;
  model: string;
  instructions: string;
  capabilities: string[];
  state: InternalAgentState;
  hue: number;
}

export interface InternalAgentPatch {
  name?: string;
  instructions?: string;
  provider?: InternalAgentProvider;
  model?: string;
  capabilities?: string[];
  state?: InternalAgentState;
  hue?: number;
}
export type InternalAgentSummary = Omit<InternalAgent, "instructions">;
export type InternalAgentCreate = Pick<InternalAgent, "name" | "role" | "provider" | "model" | "instructions"> & Partial<Pick<InternalAgent, "capabilities" | "state" | "hue">>;

const DEFAULT_AGENTS: InternalAgent[] = [
  { id: "researcher", name: "Researcher", role: "Finds and collects sources", provider: "google", model: "gemini-2.5-flash", instructions: "Be precise, cite sources when available, and separate facts from assumptions.", capabilities: ["conversation", "research"], state: "ready", hue: 205 },
  { id: "developer", name: "Developer", role: "Writes and tests code", provider: "google", model: "gemini-2.5-flash", instructions: "Prefer small safe changes, explain trade-offs, and propose tests.", capabilities: ["conversation", "code"], state: "ready", hue: 150 },
  { id: "security", name: "Security Reviewer", role: "Reviews changes for risk", provider: "google", model: "gemini-2.5-flash", instructions: "Fail closed. Identify concrete security risks and avoid exposing secrets.", capabilities: ["conversation", "security"], state: "ready", hue: 25 },
  { id: "analyst", name: "Data Analyst", role: "Queries and explains data", provider: "google", model: "gemini-2.5-flash", instructions: "State assumptions, show calculations, and never invent missing data.", capabilities: ["conversation", "analysis"], state: "ready", hue: 280 },
  { id: "writer", name: "Report Writer", role: "Drafts final deliverables", provider: "google", model: "gemini-2.5-flash", instructions: "Write clearly for the intended audience and lead with the key takeaway.", capabilities: ["conversation", "writing"], state: "ready", hue: 330 },
];

function publicAgent(agent: InternalAgent): InternalAgentSummary {
  const { instructions: _instructions, ...summary } = agent;
  return summary;
}

export function createInternalAgentRegistry(env: NodeJS.ProcessEnv = process.env) {
  const agents = new Map(DEFAULT_AGENTS.map((agent) => [agent.id, agent]));
  const databaseUrl = env.DATABASE_URL?.trim();
  const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, max: 5, ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined }) : undefined;
  const list = async (tenantId?: string) => {
    if (!pool) return [...agents.values()].filter((agent) => !agent.tenantId || agent.tenantId === tenantId).map(publicAgent);
    const result = await pool.query<InternalAgent>("SELECT id, tenant_id AS \"tenantId\", name, role, provider, model, instructions, capabilities, state, hue FROM internal_agents WHERE tenant_id IS NULL OR tenant_id=$1 ORDER BY created_at ASC", [tenantId ?? null]);
    return result.rows.map(publicAgent);
  };
  const get = async (id: string, tenantId?: string): Promise<InternalAgent> => {
    if (pool) {
      const result = await pool.query<InternalAgent>("SELECT id, tenant_id AS \"tenantId\", name, role, provider, model, instructions, capabilities, state, hue FROM internal_agents WHERE id = $1 AND ($2::text IS NULL OR tenant_id IS NULL OR tenant_id=$2)", [id, tenantId ?? null]);
      if (result.rows[0]) return result.rows[0];
    }
    const agent = agents.get(id);
    if (!agent) throw new Error("internal_agent_not_found");
    if (tenantId && agent.tenantId && agent.tenantId !== tenantId) throw new Error("internal_agent_forbidden");
    return { ...agent };
  };
  const update = async (id: string, patch: InternalAgentPatch, tenantId?: string) => {
    const agent = await get(id, tenantId);
    if (tenantId && agent.tenantId !== tenantId) throw new Error("internal_agent_forbidden");
    if (!agent) throw new Error("internal_agent_not_found");
    const next = { ...agent, ...patch, id: agent.id };
    if (!next.name.trim() || next.name.length > 80) throw new Error("invalid_agent_name");
    if (next.instructions.length > 8_000) throw new Error("invalid_agent_instructions");
    agents.set(id, next);
    if (pool) await pool.query("UPDATE internal_agents SET name=$2, role=$3, provider=$4, model=$5, instructions=$6, capabilities=$7, state=$8, hue=$9, updated_at=NOW() WHERE id=$1 AND ($10::text IS NULL OR tenant_id=$10)", [id, next.name, next.role, next.provider, next.model, next.instructions, next.capabilities, next.state, next.hue, tenantId ?? null]);
    return publicAgent(next);
  };
  const create = async (input: InternalAgentCreate, tenantId: string) => {
    const idBase = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "agent";
    let id = `${idBase}-${randomUUID().slice(0, 8)}`;
    while ([...agents.values()].some((agent) => agent.id === id)) id = `${idBase}-${randomUUID().slice(0, 8)}`;
    if (!input.name.trim() || input.name.length > 80) throw new Error("invalid_agent_name");
    if (input.instructions.length > 8_000) throw new Error("invalid_agent_instructions");
    const agent: InternalAgent = {
      id,
      tenantId,
      name: input.name.trim(),
      role: input.role.trim(),
      provider: input.provider,
      model: input.model.trim(),
      instructions: input.instructions.trim(),
      capabilities: input.capabilities ?? ["conversation"],
      state: input.state ?? "ready",
      hue: input.hue ?? 205,
    };
    agents.set(id, agent);
    if (pool) await pool.query("INSERT INTO internal_agents (id, tenant_id, name, role, provider, model, instructions, capabilities, state, hue) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING", [agent.id, tenantId, agent.name, agent.role, agent.provider, agent.model, agent.instructions, agent.capabilities, agent.state, agent.hue]);
    return publicAgent(agent);
  };
  const remove = async (id: string, tenantId?: string) => {
    if (pool) {
      const result = await pool.query("DELETE FROM internal_agents WHERE id=$1 AND ($2::text IS NULL OR tenant_id=$2)", [id, tenantId ?? null]);
      if (result.rowCount) return;
    }
    const agent = agents.get(id);
    if (!agent) throw new Error("internal_agent_not_found");
    if (tenantId && agent.tenantId !== tenantId) throw new Error("internal_agent_forbidden");
    agents.delete(id);
  };
  const init = async () => {
    if (!pool) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS internal_agents (
      id TEXT NOT NULL, tenant_id TEXT, name TEXT NOT NULL, role TEXT NOT NULL, provider TEXT NOT NULL,
      model TEXT NOT NULL, instructions TEXT NOT NULL, capabilities TEXT[] NOT NULL DEFAULT '{}',
      state TEXT NOT NULL DEFAULT 'ready', hue INTEGER NOT NULL DEFAULT 205,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      UNIQUE (id, tenant_id)
    )`);
    await pool.query("ALTER TABLE internal_agents ADD COLUMN IF NOT EXISTS tenant_id TEXT");
    for (const agent of DEFAULT_AGENTS) await pool.query("INSERT INTO internal_agents (id,tenant_id,name,role,provider,model,instructions,capabilities,state,hue) VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING", [agent.id, agent.name, agent.role, agent.provider, agent.model, agent.instructions, agent.capabilities, agent.state, agent.hue]);
  };
  return { list, get, update, create, remove, init };
}
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
