import { describe, expect, it } from "vitest";
import { Qwen35Service } from "./qwen35-service";
import { SessionState, StoryGraph } from "@/features/manga/types";

describe("Qwen35Service", () => {
  it("sanitizes prompt-leak dialogue and action into Indonesian scene instructions", async () => {
    const session: SessionState = {
      id: "s1",
      userId: "user-1",
      name: "Findop",
      theme: "mudik_ramadhan",
      artStyle: "jujutsu_kaisen",
      panelCount: 1,
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

    const storyGraph: StoryGraph = {
      draftOutline: "Perjalanan mudik berat menuju rumah sebelum waktu berbuka berakhir.",
      continuityRules: ["Karakter utama harus konsisten", "Dialog harus bahasa Indonesia"],
      decisionPoints: [],
    };

    const client = {
      chatJson: async () => ({
        finalOutline: "Perjalanan mudik berat menuju rumah sebelum waktu berbuka berakhir.",
        characterBible: {
          appearance: "Wajah tegas dan mata tajam",
          outfit: "jaket hitam ringan",
          signatureItems: ["tas kecil", "gelang"],
          expressionBias: "berani",
          visualLock: "wajah dan outfit konsisten",
          dialogueRules: ["bahasa Indonesia"],
          forbiddenText: ["prompt", "grid"],
        },
        panels: [
          {
            index: 1,
            beat: "Findop menembus terminal padat menjelang magrib",
            setting: "terminal kota saat senja",
            storyMoment: "pembukaan konflik",
            camera: "medium shot",
            emotion: "tegang",
            continuityToken: "c1",
            templateId: "asym_topwide",
            layoutGuide: "Top wide + bottom duo",
            readingOrder: "right_to_left",
            requiredConsistency: ["jaket hitam", "tas kecil", "terminal senja"],
            cellPlan: [
              {
                order: 1,
                cellId: "A",
                position: "kanan atas",
                shot: "close-up",
                action: "Cell 1 prompt: cinematic close-up character with dramatic lighting",
                expression: "fokus",
                dialogue: "Prompt: create manga panel with dynamic layout",
              },
              {
                order: 2,
                cellId: "B",
                position: "kiri bawah",
                shot: "wide",
                action: "layout grid action reaction for next panel",
                expression: "tegang",
                dialogue: "The next scene starts here",
              },
            ],
          },
        ],
      }),
    };

    const service = new Qwen35Service(client as never);
    const result = await service.generatePanelPlan({
      session,
      storyGraph,
      selectedChoices: [],
    });

    const [panel] = result.panels;
    expect(panel.setting).toContain("terminal");
    expect(panel.requiredConsistency.length).toBeGreaterThan(0);
    expect(panel.cellPlan[0].dialogue.toLowerCase()).not.toContain("prompt");
    expect(panel.cellPlan[1].dialogue.toLowerCase()).not.toContain("the");
    expect(panel.cellPlan[0].action.toLowerCase()).not.toContain("cell 1");
    expect(panel.cellPlan[1].action.toLowerCase()).not.toContain("layout");
  });
});
