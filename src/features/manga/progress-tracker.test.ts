import { describe, expect, it } from "vitest";
import { clampProgress, panelRenderingProgress } from "./progress-tracker";

describe("progress tracker", () => {
  it("clamps progress between 0 and 100", () => {
    expect(clampProgress(-8)).toBe(0);
    expect(clampProgress(50.4)).toBe(50);
    expect(clampProgress(120)).toBe(100);
  });

  it("computes rendering progress by panel slot", () => {
    expect(panelRenderingProgress(0, 8)).toBe(12.5);
    expect(panelRenderingProgress(1, 8)).toBe(25);
    expect(panelRenderingProgress(4, 8)).toBe(62.5);
    expect(panelRenderingProgress(8, 8)).toBe(100);
  });
});
