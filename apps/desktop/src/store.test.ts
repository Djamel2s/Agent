import { describe, expect, it } from "vitest";
import { initialState, modeOf, reducer } from "./store";

describe("companion state", () => {
  it("is idle at start and compact once a task runs", () => {
    let s = initialState();
    expect(modeOf(s)).toBe("idle");
    s = reducer(s, { type: "START_TASK" });
    expect(modeOf(s)).toBe("compact");
  });
  it("alerts on approval, dismisses to compact, and resolves", () => {
    let s = reducer(initialState(), { type: "REQUEST", kind: "action" });
    expect(modeOf(s)).toBe("alert");
    s = reducer(s, { type: "DISMISS" });
    expect(modeOf(s)).toBe("compact");
    const id = s.approvals[0]!.id;
    s = reducer(s, { type: "DECIDE", id, ok: false });
    expect(s.approvals).toHaveLength(0);
    expect(s.agents.find((a) => a.id === "developer")!.state).toBe("idle");
  });
  it("celebrates on completion, then settles", () => {
    let s = reducer(initialState(), { type: "COMPLETE" });
    expect(modeOf(s)).toBe("celebrate");
    s = reducer(s, { type: "CLEAR_CELEBRATE" });
    expect(modeOf(s)).not.toBe("celebrate");
  });
  it("ignores unknown approval ids", () => {
    const s = initialState();
    expect(reducer(s, { type: "DECIDE", id: "nope", ok: true })).toBe(s);
  });
});

describe("external agents", () => {
  it("adds and updates agents from the bridge", () => {
    let s = reducer(initialState(), { type: "UPSERT_AGENT", agent: { id: "ci", name: "CI bot", state: "working", doing: "Running tests" } });
    expect(s.agents.find((a) => a.id === "ci")?.doing).toBe("Running tests");
    s = reducer(s, { type: "UPSERT_AGENT", agent: { id: "ci", name: "CI bot", state: "idle" } });
    expect(s.agents.filter((a) => a.id === "ci")).toHaveLength(1);
    expect(s.agents.find((a) => a.id === "ci")?.state).toBe("idle");
  });
  it("shows and cancels external approvals", () => {
    const item = { id: "ext:1", kind: "action" as const, title: "t", action: "A", by: "CI bot", risk: "HIGH" as const, target: "x", yes: "Approve", no: "Reject" };
    let s = reducer(initialState(), { type: "REQUEST_EXT", item });
    expect(modeOf(s)).toBe("alert");
    s = reducer(s, { type: "CANCEL_EXT", id: "ext:1" });
    expect(s.approvals).toHaveLength(0);
  });
});
