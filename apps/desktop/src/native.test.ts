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

import { GLOW_NATIVE, SIZE } from "./layout";
import type { Mode } from "./store";

describe("native shadows stay inside the transparent window", () => {
  // A shadow cut off by the window edge shows up as a grey rectangle on the desktop.
  const reach = (css: string) => [...css.matchAll(/(-?\d+)px (-?\d+)px (\d+)px (-?\d+)px/g)].map(([, ox, oy, blur, spread]) => ({
    side: Math.abs(Number(ox)) + Number(blur) + Number(spread), down: Number(oy) + Number(blur) + Number(spread),
  }));
  for (const mode of Object.keys(SIZE) as Mode[]) {
    it(`${mode}: fades out before the window edge`, () => {
      const win = windowSize(mode, 1); const isl = SIZE[mode];
      for (const r of reach(GLOW_NATIVE[mode])) {
        expect(r.side).toBeLessThan((win.w - isl.w) / 2);
        expect(r.down).toBeLessThan(win.h - isl.h);
      }
    });
  }
});
