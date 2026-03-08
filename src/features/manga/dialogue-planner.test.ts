import { describe, expect, it } from "vitest";
import {
  buildCellAction,
  buildCellDialogue,
  shouldRewriteAction,
  shouldRewriteDialogue,
} from "./dialogue-planner";

describe("dialogue-planner", () => {
  it("flags generic fallback dialogue and action for rewrite", () => {
    expect(
      shouldRewriteDialogue("Situasi berubah, aku harus ambil keputusan sekarang."),
    ).toBe(true);
    expect(shouldRewriteDialogue("Aku lanjutkan, target belum tercapai.")).toBe(true);
    expect(shouldRewriteAction("Aksi cell A untuk panel 2.")).toBe(true);
  });

  it("builds panel-specific dialogue and action", () => {
    const dialogue = buildCellDialogue({
      beat: "Kemacetan besar menutup jalur utama",
      panelIndex: 4,
      panelCount: 8,
      order: 2,
      theme: "mudik_ramadhan",
    });
    const action = buildCellAction({
      beat: "Kemacetan besar menutup jalur utama",
      panelIndex: 4,
      panelCount: 8,
      order: 2,
      totalCells: 3,
    });

    expect(dialogue).toContain("Fokus:");
    expect(dialogue.length).toBeGreaterThan(20);
    expect(action).toContain("konsekuensi");
  });
});

