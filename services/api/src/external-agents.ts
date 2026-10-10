import dns from "node:dns/promises";
import net from "node:net";
import crypto from "node:crypto";

export type ExternalAgentProtocol = "http" | "a2a" | "mcp";
export type ExternalAgentStatus = "configured" | "disabled" | "unsupported";
export type ExternalAgentLevel = "READ" | "ANALYZE" | "WRITE" | "ACT";

export interface ExternalAgent {
  id: string;
  name: string;
  protocol: ExternalAgentProtocol;
  endpoint: string;
  secretEnv?: string;
  capabilities: string[];
  enabled: boolean;
  status: ExternalAgentStatus;
  createdAt: string;
}

export interface ExternalAgentRegistration {
  id: string;
  name: string;
  protocol: ExternalAgentProtocol;
  endpoint: string;
  secretEnv?: string;
  capabilities?: string[];
  enabled?: boolean;
}

export interface AgentInvocation {
  input: string;
  tenantId: string;
  agentId: string;
  level: ExternalAgentLevel;
  dataSensitivity?: 0 | 1 | 2 | 3;
}

export interface AgentInvocationResult {
  agentId: string;
  status: "completed" | "approval_required" | "unsupported";
  output?: unknown;
  decision?: "ALLOW" | "APPROVAL" | "DENY";
  risk?: string;
  reason?: string;
}

const MAX_INPUT = 32_000;
const MAX_AGENTS = 100;
const PRIVATE_HOSTS = new Set(["localhost", "localhost.localdomain", "metadata.google.internal", "instance-data.ec2.internal"]);

function isPrivateIp(address: string): boolean {
  if (net.isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  return address === "::1" || address.toLowerCase().startsWith("fc") || address.toLowerCase().startsWith("fd") || address.toLowerCase().startsWith("fe80:");
}

async function assertSafeEndpoint(raw: string, allowLocal: boolean): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("invalid_endpoint");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname.includes("..")) throw new Error("unsafe_endpoint");
  const host = url.hostname.toLowerCase();
  if ((!allowLocal && PRIVATE_HOSTS.has(host)) || (!allowLocal && host === "127.0.0.1")) throw new Error("private_endpoint");
  if (!allowLocal && net.isIP(host) && isPrivateIp(host)) throw new Error("private_endpoint");
  if (!net.isIP(host)) {
    const resolved = await dns.lookup(host, { all: true });
    if (!resolved.length || (!allowLocal && resolved.some((entry) => isPrivateIp(entry.address)))) throw new Error("private_endpoint");
  }
  return url;
}

function publicAgent(agent: ExternalAgent): ExternalAgent {
  return { ...agent, secretEnv: agent.secretEnv ? "[server-side reference]" : undefined };
}

export function createExternalAgentGateway(env: NodeJS.ProcessEnv = process.env) {
  const agents = new Map<string, ExternalAgent>();
  const allowLocal = env.NODE_ENV !== "production";
  const configuredToken = env.AGENT_GATEWAY_TOKEN?.trim();

  const register = async (input: ExternalAgentRegistration): Promise<ExternalAgent> => {
    if (agents.size >= MAX_AGENTS && !agents.has(input.id)) throw new Error("agent_limit");
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/.test(input.id)) throw new Error("invalid_id");
    if (!input.name.trim() || input.name.length > 80) throw new Error("invalid_name");
    await assertSafeEndpoint(input.endpoint, allowLocal);
    if (input.secretEnv && !/^[A-Z][A-Z0-9_]{1,127}$/.test(input.secretEnv)) throw new Error("invalid_secret_reference");
    const agent: ExternalAgent = {
      id: input.id,
      name: input.name.trim(),
      protocol: input.protocol,
      endpoint: input.endpoint,
      secretEnv: input.secretEnv,
      capabilities: [...new Set((input.capabilities ?? []).filter((x) => typeof x === "string").map((x) => x.slice(0, 80)))].slice(0, 50),
      enabled: input.enabled ?? true,
      status: input.protocol === "http" ? "configured" : "unsupported",
      createdAt: new Date().toISOString(),
    };
    agents.set(agent.id, agent);
    return publicAgent(agent);
  };

  const list = (): ExternalAgent[] => [...agents.values()].map(publicAgent);

  const invoke = async (id: string, request: AgentInvocation): Promise<AgentInvocationResult> => {
    const agent = agents.get(id);
    if (!agent) throw new Error("agent_not_found");
    if (!agent.enabled) throw new Error("agent_disabled");
    if (request.input.trim().length === 0 || request.input.length > MAX_INPUT) throw new Error("invalid_input");
    if (agent.protocol !== "http") return { agentId: id, status: "unsupported", reason: `${agent.protocol}_adapter_not_configured` };

    const endpoint = await assertSafeEndpoint(agent.endpoint, allowLocal);
    const secret = agent.secretEnv ? env[agent.secretEnv]?.trim() : undefined;
    const headers: Record<string, string> = { "content-type": "application/json", "x-agent-gateway-request-id": crypto.randomUUID() };
    if (secret) headers.authorization = `Bearer ${secret}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ input: request.input, tenantId: request.tenantId, agentId: request.agentId, level: request.level, dataSensitivity: request.dataSensitivity }),
        redirect: "error",
        signal: controller.signal,
      });
      const text = await response.text();
      let output: unknown = text;
      try { output = text ? JSON.parse(text) : undefined; } catch { /* preserve non-JSON provider output */ }
      if (!response.ok) throw new Error(`upstream_${response.status}`);
      return { agentId: id, status: "completed", output };
    } finally {
      clearTimeout(timer);
    }
  };

  return { configured: Boolean(configuredToken), token: configuredToken, register, list, invoke };
}
