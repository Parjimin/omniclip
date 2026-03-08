import { describe, expect, it } from "vitest";
import { calculateDecisionCount } from "./story-orchestrator";

describe("calculateDecisionCount", () => {
  it("returns minimum 1", () => {
    expect(calculateDecisionCount(4)).toBe(1);
    expect(calculateDecisionCount(5)).toBe(1);
  });

  it("follows formula and caps at 5", () => {
    expect(calculateDecisionCount(8)).toBe(2);
    expect(calculateDecisionCount(11)).toBe(3);
    expect(calculateDecisionCount(20)).toBe(5);
  });
});
