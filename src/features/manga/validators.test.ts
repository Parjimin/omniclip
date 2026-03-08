import { describe, expect, it } from "vitest";
import { sessionCreateSchema } from "./validators";

describe("sessionCreateSchema", () => {
  it("validates happy path", () => {
    const parsed = sessionCreateSchema.safeParse({
      name: "Adit",
      theme: "mudik_ramadhan",
      artStyle: "naruto",
      panelCount: 12,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects invalid panel count", () => {
    const parsed = sessionCreateSchema.safeParse({
      name: "Adit",
      theme: "petualangan",
      artStyle: "one_piece",
      panelCount: 22,
    });
    expect(parsed.success).toBe(false);
  });
});
