import { describe, expect, it } from "vitest";
import { createDeterministicPanelSeed } from "./image-orchestrator";
import { PanelSpec, SessionState } from "./types";

describe("image-orchestrator", () => {
  it("creates stable but distinct panel seed values", () => {
    const session: SessionState = {
      id: "session-1",
      name: "Findop",
      theme: "mudik_ramadhan",
      artStyle: "jujutsu_kaisen",
      panelCount: 4,
      createdAt: Date.now(),
      selectedChoices: {},
      characterPreferences: {
        gender: "androgynous",
        ageRange: "young_adult",
        build: "average",
        hairStyle: "spiky medium",
        hairColor: "black",
        outfitStyle: "urban traveler",
        personality: "berani, cepat beradaptasi, hangat",
        accessories: "tas kecil dan gelang",
        specialTraits: "mata tajam, ekspresi energik",
      },
      generationPreferences: {
        visualMode: "manga_bw",
        panelLayout: "dynamic_action",
        detailLevel: "high",
      },
    };

    const basePanel: PanelSpec = {
      index: 1,
      beat: "Findop menerobos terminal",
      setting: "terminal kota saat senja",
      storyMoment: "pembukaan konflik",
      camera: "medium shot",
      emotion: "tegang",
      continuityToken: "c1",
      templateId: "asym_topwide",
      layoutGuide: "Top wide + bottom duo",
      readingOrder: "right_to_left",
      requiredConsistency: ["jaket tetap", "tas tetap"],
      cellPlan: [],
      prompt: "",
    };

    const seedA = createDeterministicPanelSeed({ session, panel: basePanel });
    const seedB = createDeterministicPanelSeed({ session, panel: basePanel });
    const seedC = createDeterministicPanelSeed({
      session,
      panel: { ...basePanel, index: 2, continuityToken: "c2" },
    });

    expect(seedA).toBe(seedB);
    expect(seedA).not.toBe(seedC);
    expect(seedA).toBeGreaterThan(0);
  });
});
