export type ActionLevel = "READ" | "ANALYZE" | "WRITE" | "ACT";
export type Decision = "ALLOW" | "DENY" | "APPROVAL";
export type Risk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Per-resource policy: what happens at each action level. */
export type ResourcePolicy = Readonly<Record<ActionLevel, Decision>>;

export interface PolicySet {
  /** Policies keyed by resource (e.g. "github"). */
  resources: Readonly<Record<string, ResourcePolicy>>;
  /** Organization-wide kill switches. */
  killed: { platform: boolean; resources: readonly string[]; agents: readonly string[] };
}

export interface ActionRequest {
  tenantId: string;
  agentId: string;
  resource: string;
  level: ActionLevel;
  /** True when data leaves the organization (email, webhook, external agent...). */
  externalDestination?: boolean;
  /** 0 = public ... 3 = regulated/sensitive. */
  dataSensitivity?: 0 | 1 | 2 | 3;
}

export interface PolicyResult {
  decision: Decision;
  risk: Risk;
  reason: string;
}

const LEVEL_SCORE: Record<ActionLevel, number> = { READ: 0, ANALYZE: 1, WRITE: 3, ACT: 4 };

/** Deterministic risk score from action level, sensitivity and destination. */
export function computeRisk(req: ActionRequest): Risk {
  const score =
    LEVEL_SCORE[req.level] + (req.dataSensitivity ?? 0) * 1.5 + (req.externalDestination ? 2 : 0);
  if (score >= 9) return "CRITICAL";
  if (score >= 6) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

const rank: Record<Decision, number> = { ALLOW: 0, APPROVAL: 1, DENY: 2 };

/**
 * Evaluate one action. Fail-closed: unknown resources are denied, kill switches win,
 * and CRITICAL risk can never resolve to ALLOW.
 */
export function evaluate(policies: PolicySet, req: ActionRequest): PolicyResult {
  const risk = computeRisk(req);
  if (policies.killed.platform) return { decision: "DENY", risk, reason: "platform kill switch" };
  if (policies.killed.agents.includes(req.agentId))
    return { decision: "DENY", risk, reason: "agent kill switch" };
  if (policies.killed.resources.includes(req.resource))
    return { decision: "DENY", risk, reason: "resource kill switch" };

  const policy = policies.resources[req.resource];
  if (!policy) return { decision: "DENY", risk, reason: "no policy for resource (fail-closed)" };

  let decision = policy[req.level];
  let reason = `policy ${req.resource}:${req.level}`;
  if (risk === "CRITICAL" && rank[decision] < rank.APPROVAL) {
    decision = "APPROVAL";
    reason += " escalated: critical risk";
  }
  return { decision, risk, reason };
}
