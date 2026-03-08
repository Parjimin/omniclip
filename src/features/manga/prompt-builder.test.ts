import { describe, expect, it } from "vitest";
import { buildPanelPrompt } from "./prompt-builder";
import { PanelSpec, SessionState } from "./types";

describe("prompt-builder", () => {
  it("builds standalone panel prompt without dialogue bubbles or technical english labels", () => {
    const session: SessionState = {
      id: "s1",
      name: "Findop",
      theme: "mudik_ramadhan",
      artStyle: "jujutsu_kaisen",
      panelCount: 8,
      createdAt: Date.now(),
      selectedChoices: {},
      characterPreferences: {
        gender: "androgynous",
        ageRange: "young_adult",
        build: "average",
        hairStyle: "spiky medium",
        hairColor: "black",
        outfitStyle: "urban traveler",
        personality: "berani",
        accessories: "tas kecil",
        specialTraits: "mata tajam",
      },
      generationPreferences: {
        visualMode: "manga_bw",
        panelLayout: "dynamic_action",
        detailLevel: "high",
      },
    };

    const panel: PanelSpec = {
      index: 3,
      beat: "Karakter menemukan jalur alternatif sempit di pasar malam",
      setting: "pasar malam Ramadan dengan lorong sempit dan lampu gantung",
      storyMoment: "eskalasi konflik ketika karakter menemukan jalur alternatif",
      camera: "medium shot",
      emotion: "tegang",
      continuityToken: "token-3",
      templateId: "asym_topwide",
      layoutGuide: "Top wide + bottom duo",
      readingOrder: "right_to_left",
      requiredConsistency: [
        "outfit utama tetap urban traveler",
        "tas kecil dan gelang tetap terlihat",
        "setting pasar malam Ramadan tetap dominan",
      ],
      cellPlan: [
        {
          order: 1,
          cellId: "A",
          position: "kanan atas",
          shot: "close-up",
          action: "Karakter melihat rute alternatif di sela lampu pasar.",
          expression: "fokus",
          dialogue: "Jalur sempit ini mungkin jadi satu-satunya peluang.",
          rect: { x: 0.04, y: 0.04, w: 0.92, h: 0.42 },
          bubble: { x: 0.72, y: 0.12, align: "right" },
        },
        {
          order: 2,
          cellId: "B",
          position: "kiri bawah",
          shot: "wide",
          action: "Arus kendaraan menekan dari dua sisi.",
          expression: "tegang",
          dialogue: "Fokus, jangan sampai keburu macet total.",
          rect: { x: 0.52, y: 0.5, w: 0.44, h: 0.46 },
          bubble: { x: 0.66, y: 0.6, align: "left" },
        },
      ],
      prompt: "",
    };

    const prompt = buildPanelPrompt({
      session,
      panel,
      characterBible: {
        appearance: "Wajah tegas, mata tajam",
        outfit: "jaket ringan",
        signatureItems: ["tas kecil"],
        expressionBias: "fokus",
        visualLock: "wajah, rambut, outfit, dan tas kecil harus konsisten",
        dialogueRules: ["Semua bubble bahasa Indonesia", "Dialog singkat dan konkret"],
        forbiddenText: ["prompt", "layout", "grid"],
      },
      styleProfile: {
        lineWeight: "tebal menengah",
        contrast: "high-contrast",
        screentoneIntensity: "sedang",
        anatomyExaggeration: "stylized",
        dynamicPoseBias: "action-forward",
        panelCompositionBias: "cinematic framing",
      },
    });

    expect(prompt).toContain("tanpa bubble chat dan tanpa teks dialog");
    expect(prompt).toContain("Jangan tampilkan huruf, kata, kalimat, caption");
    expect(prompt).toContain("Setting adegan:");
    expect(prompt).toContain("Konsistensi karakter:");
    expect(prompt).toContain("- kanan atas:");
    expect(prompt).not.toContain("Dialog aplikasi untuk bubble");
    expect(prompt).not.toContain("Bubble dan teks dialog akan dirender oleh aplikasi");
    expect(prompt).not.toMatch(/\bpanel\s*#?\s*\d+/i);
    expect(prompt).not.toContain("lanjutkan cerita panel");
    expect(prompt).not.toContain("TASK:");
    expect(prompt).not.toContain("SCENE CORE");
    expect(prompt).not.toContain("GRID:");
    expect(prompt).not.toContain("Cell 1");
    expect(prompt.length).toBeLessThanOrEqual(1850);
  });
});
