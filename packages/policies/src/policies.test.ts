import { describe, expect, it } from "vitest";
import { evaluate, computeRisk, type PolicySet } from "./index";

const github = { READ: "ALLOW", ANALYZE: "ALLOW", WRITE: "APPROVAL", ACT: "DENY" } as const;
const set = (over: Partial<PolicySet["killed"]> = {}): PolicySet => ({
  resources: { github },
  killed: { platform: false, resources: [], agents: [], ...over },
});
const base = { tenantId: "t1", agentId: "a1", resource: "github" } as const;

describe("policy engine", () => {
  it("applies the GitHub example from the spec", () => {
    expect(evaluate(set(), { ...base, level: "READ" }).decision).toBe("ALLOW");
    expect(evaluate(set(), { ...base, level: "ANALYZE" }).decision).toBe("ALLOW");
    expect(evaluate(set(), { ...base, level: "WRITE" }).decision).toBe("APPROVAL");
    expect(evaluate(set(), { ...base, level: "ACT" }).decision).toBe("DENY");
  });
  it("denies unknown resources (fail-closed)", () => {
    expect(evaluate(set(), { ...base, resource: "unknown", level: "READ" }).decision).toBe("DENY");
  });
  it("kill switches override allow", () => {
    expect(evaluate(set({ platform: true }), { ...base, level: "READ" }).decision).toBe("DENY");
    expect(evaluate(set({ agents: ["a1"] }), { ...base, level: "READ" }).decision).toBe("DENY");
    expect(evaluate(set({ resources: ["github"] }), { ...base, level: "READ" }).decision).toBe("DENY");
  });
  it("never allows CRITICAL risk without approval", () => {
    const r = evaluate(set(), { ...base, level: "READ", dataSensitivity: 3, externalDestination: true });
    expect(r.risk).toBe("HIGH");
    const c = evaluate(
      { resources: { github: { ...github, WRITE: "ALLOW" } }, killed: { platform: false, resources: [], agents: [] } },
      { ...base, level: "WRITE", dataSensitivity: 3, externalDestination: true },
    );
    expect(c.risk).toBe("CRITICAL");
    expect(c.decision).toBe("APPROVAL");
  });
  it("scores risk monotonically", () => {
    expect(computeRisk({ ...base, level: "READ" })).toBe("LOW");
    expect(computeRisk({ ...base, level: "WRITE" })).toBe("MEDIUM");
  });
});
