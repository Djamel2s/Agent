import { describe, expect, it } from "vitest";
import { isExternal, windowSize } from "./native";

describe("native window sizing", () => {
  it("grows with the island and leaves room for the pending pill", () => {
    expect(windowSize("idle", 0).w).toBeLessThan(windowSize("compact", 0).w);
    expect(windowSize("compact", 1).h).toBeGreaterThan(windowSize("compact", 0).h);
    expect(windowSize("expanded", 0).h).toBeGreaterThan(windowSize("alert", 1).h);
  });
  it("recognises bridge approvals", () => { expect(isExternal("ext:abc")).toBe(true); expect(isExternal("a1")).toBe(false); });
});
