import { Choice, CharacterBible, PanelSpec, SessionState, StoryGraph } from "@/features/manga/types";
import {
  buildCellAction,
  buildCellDialogue,
  shouldRewriteAction,
  shouldRewriteDialogue,
} from "@/features/manga/dialogue-planner";
import { QwenClient } from "./qwen-client";

interface StoryGraphResponse {
  draftOutline: string;
  decisionPoints: Array<{
    id: string;
    step: number;
    left: { title: string; consequence: string };
    right: { title: string; consequence: string };
  }>;
  continuityRules?: string[];
}

interface PanelPlanResponse {
  finalOutline: string;
  characterBible: CharacterBible;
  panels: Array<{
    index: number;
    beat: string;
    setting?: string;
    storyMoment?: string;
    camera: string;
    emotion: string;
    continuityToken: string;
    templateId?: string;
    layoutGuide: string;
    readingOrder: "right_to_left";
    requiredConsistency?: string[];
    cellPlan: Array<{
      order: number;
      cellId: string;
      position: string;
      shot: string;
      action: string;
      expression: string;
      dialogue?: string;
    }>;
  }>;
}

function describeCharacterPreferences(session: SessionState): string {
  const pref = session.characterPreferences;
  return [
    `gender=${pref.gender}`,
    `age=${pref.ageRange}`,
    `build=${pref.build}`,
    `hair=${pref.hairStyle}`,
    `hairColor=${pref.hairColor}`,
    `outfit=${pref.outfitStyle}`,
    `personality=${pref.personality}`,
    `accessories=${pref.accessories}`,
    `specialTraits=${pref.specialTraits}`,
  ].join("; ");
}

function describeGenerationPreferences(session: SessionState): string {
  const pref = session.generationPreferences;
  return [
    `visualMode=${pref.visualMode}`,
    `panelLayout=${pref.panelLayout}`,
    `detailLevel=${pref.detailLevel}`,
  ].join("; ");
}

function describePromptAddon(session: SessionState): string {
  return "Tidak ada instruksi tambahan.";
}

function stripPanelReferences(text: string): string {
  return text
    .replace(/\bpanel\s*\d+\s*-\s*\d+\s*:?\s*/gi, "")
    .replace(/\bpanel\s*\d+\s*:?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeDraftOutline(outline: string | undefined, theme: SessionState["theme"]): string {
  const cleaned = stripPanelReferences(outline ?? "");
  if (cleaned.length > 0) {
    return cleaned;
  }
  if (theme === "mudik_ramadhan") {
    return "Karakter memulai mudik Ramadan dengan rintangan berlapis, pilihan user mengubah cara karakter menembus hambatan sampai momen tiba di rumah.";
  }
  return "Karakter memulai petualangan bertingkat, pilihan user menentukan strategi menghadapi konflik hingga akhir cerita.";
}

function pickFallbackDecisionCount(args: {
  session: SessionState;
  min: number;
  max: number;
}): number {
  if (args.max <= args.min) {
    return args.min;
  }
  const seed = `${args.session.id}|${args.session.name}|${args.session.panelCount}|${args.session.theme}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const span = args.max - args.min + 1;
  return args.min + (hash % span);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeBeat(value: string): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 180) {
    return cleaned;
  }
  return `${cleaned.slice(0, 177).trimEnd()}...`;
}

function clampSentence(value: string, max: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }
  if (cleaned.length <= max) {
    return cleaned;
  }
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

function diversifyBeat(rawBeat: string, seen: Map<string, number>): string {
  const cleaned = normalizeBeat(rawBeat || "Peristiwa utama adegan saat ini");
  const key = normalizeText(cleaned);
  const count = seen.get(key) ?? 0;
  seen.set(key, count + 1);
  if (count === 0) {
    return cleaned;
  }
  return `${cleaned} (perkembangan adegan ${count + 1})`;
}

const PROMPT_LEAK_PATTERNS = [
  /\bprompt\b/i,
  /\bnegative prompt\b/i,
  /\blayout\b/i,
  /\bgrid\b/i,
  /\btemplate\b/i,
  /\bcell\b/i,
  /\bbubble\b/i,
  /\bshot\b/i,
  /\bcamera\b/i,
  /\bclose-?up\b/i,
  /\bwide\b/i,
  /\bdialogue\b/i,
  /\breading order\b/i,
  /\bright_to_left\b/i,
  /\bwatermark\b/i,
  /\blogo\b/i,
  /\bsignature\b/i,
  /\bpanel\b/i,
  /\bcharacter\b/i,
  /\bstyle\b/i,
  /\bfinal manga\b/i,
];

const ENGLISH_DIALOGUE_HINTS = [
  /\bthe\b/i,
  /\band\b/i,
  /\bwith\b/i,
  /\bfrom\b/i,
  /\bfor\b/i,
  /\bthis\b/i,
  /\bthat\b/i,
  /\byour\b/i,
  /\byou\b/i,
  /\bscene\b/i,
  /\bfocus\b/i,
  /\bstart\b/i,
  /\bnext\b/i,
  /\bfinally\b/i,
];

function looksLikePromptLeak(text: string | undefined): boolean {
  const cleaned = normalizeText(text ?? "");
  if (!cleaned) {
    return true;
  }
  return PROMPT_LEAK_PATTERNS.some((pattern) => pattern.test(cleaned));
}

function looksTooEnglish(text: string | undefined): boolean {
  const cleaned = normalizeText(text ?? "");
  if (!cleaned) {
    return true;
  }
  const englishHits = ENGLISH_DIALOGUE_HINTS.filter((pattern) => pattern.test(cleaned)).length;
  return englishHits >= 2;
}

function sanitizeDialogueText(args: {
  raw: string | undefined;
  beat: string;
  panelIndex: number;
  panelCount: number;
  order: number;
  theme: SessionState["theme"];
}): string {
  const cleaned = normalizeText(
    (args.raw ?? "")
      .replace(/^["']+|["']+$/g, "")
      .replace(/\s+/g, " "),
  );

  const wordCount = cleaned.length === 0 ? 0 : cleaned.split(" ").length;
  if (
    wordCount < 2 ||
    wordCount > 16 ||
    shouldRewriteDialogue(cleaned) ||
    looksLikePromptLeak(cleaned) ||
    looksTooEnglish(cleaned)
  ) {
    return buildCellDialogue({
      beat: args.beat,
      panelIndex: args.panelIndex,
      panelCount: args.panelCount,
      order: args.order,
      theme: args.theme,
    });
  }

  return clampSentence(cleaned, 110);
}

function sanitizeActionText(args: {
  raw: string | undefined;
  beat: string;
  panelIndex: number;
  panelCount: number;
  order: number;
  totalCells: number;
}): string {
  const cleaned = normalizeText(args.raw ?? "");
  if (
    shouldRewriteAction(cleaned) ||
    looksLikePromptLeak(cleaned) ||
    looksTooEnglish(cleaned)
  ) {
    return buildCellAction({
      beat: args.beat,
      panelIndex: args.panelIndex,
      panelCount: args.panelCount,
      order: args.order,
      totalCells: args.totalCells,
    });
  }
  return clampSentence(cleaned, 150);
}

function fallbackSetting(theme: SessionState["theme"], panelIndex: number): string {
  const mudik = [
    "terminal keberangkatan saat senja dengan antrean pemudik",
    "jalur utama kota yang macet dan sesak mendekati magrib",
    "pasar malam Ramadan dengan lampu gantung dan lorong sempit",
    "jembatan kecil yang licin diguyur hujan",
    "rest area padat dengan kendaraan berhenti rapat",
    "jalan arteri gelap dengan lampu kendaraan panjang",
    "gerbang kampung yang mulai ramai dan hangat",
    "teras rumah keluarga dengan suasana takbiran",
  ];
  const adventure = [
    "gerbang area misterius dengan kabut tipis",
    "lorong batu tua penuh jejak pertarungan",
    "hutan gelap dengan pepohonan tinggi dan bayangan tajam",
    "jembatan gantung di atas jurang",
    "reruntuhan kuil dengan simbol kuno",
    "pelataran pertempuran dengan puing beterbangan",
    "puncak arena dengan angin kencang",
    "lokasi tenang setelah konflik mereda",
  ];
  const pool = theme === "mudik_ramadhan" ? mudik : adventure;
  return pool[Math.min(panelIndex - 1, pool.length - 1)] ?? pool[(panelIndex - 1) % pool.length];
}

function fallbackStoryMoment(beat: string, panelIndex: number, panelCount: number): string {
  const stage = panelIndex <= Math.max(2, Math.floor(panelCount * 0.25))
    ? "pembukaan konflik"
    : panelIndex >= Math.max(3, Math.ceil(panelCount * 0.75))
      ? "penyelesaian konflik"
      : "eskalasi konflik";
  return clampSentence(`${stage}: ${beat}`, 120);
}

function buildRequiredConsistency(args: {
  session: SessionState;
  characterBible: CharacterBible;
  setting: string;
  emotion: string;
}): string[] {
  const accessoryList = args.characterBible.signatureItems.filter((item) => item.trim().length > 0);
  return [
    `wajah utama tetap ${clampSentence(args.characterBible.appearance, 90)}`,
    `outfit utama tetap ${clampSentence(args.characterBible.outfit, 70)}`,
    accessoryList.length > 0 ? `aksesori wajib tetap ${clampSentence(accessoryList.join(", "), 70)}` : "",
    `setting adegan ${clampSentence(args.setting, 80)}`,
    `emosi dominan ${clampSentence(args.emotion, 40)}`,
  ].filter(Boolean);
}

function normalizeCharacterBible(args: {
  session: SessionState;
  raw?: Partial<CharacterBible>;
}): CharacterBible {
  const signatureItems = (args.raw?.signatureItems?.length
    ? args.raw.signatureItems
    : args.session.characterPreferences.accessories.split(",")
  )
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 5);

  return {
    appearance:
      clampSentence(
        args.raw?.appearance ||
          `Wajah ${args.session.name} dengan ${args.session.characterPreferences.specialTraits}, rambut ${args.session.characterPreferences.hairStyle} warna ${args.session.characterPreferences.hairColor}, build ${args.session.characterPreferences.build}`,
        180,
      ) ||
      `Wajah ${args.session.name} konsisten dengan ciri utama yang mudah dikenali.`,
    outfit:
      clampSentence(args.raw?.outfit || args.session.characterPreferences.outfitStyle, 90) ||
      args.session.characterPreferences.outfitStyle,
    signatureItems,
    expressionBias:
      clampSentence(args.raw?.expressionBias || args.session.characterPreferences.personality, 90) ||
      args.session.characterPreferences.personality,
    visualLock:
      clampSentence(
        args.raw?.visualLock ||
          `${args.session.name} harus selalu memakai outfit yang sama, wajah yang sama, rambut yang sama, dan aksesori yang sama kecuali ada perubahan eksplisit dalam adegan.`,
        190,
      ) ||
      `${args.session.name} wajib tampil konsisten di setiap adegan.`,
    dialogueRules:
      args.raw?.dialogueRules?.filter((item) => item.trim().length > 0).slice(0, 5) ?? [
        "Semua bubble dialog wajib bahasa Indonesia natural.",
        "Dialog singkat, spesifik, dan relevan dengan aksi visual.",
        "Tidak boleh ada bahasa Inggris atau istilah teknis prompt.",
      ],
    forbiddenText:
      args.raw?.forbiddenText?.filter((item) => item.trim().length > 0).slice(0, 10) ?? [
        "prompt",
        "layout",
        "grid",
        "cell",
        "camera",
        "shot",
        "style",
        "watermark",
        "logo",
        "signature",
      ],
  };
}

function diversifyRepeatedCellText(args: {
  panels: PanelSpec[];
  panelCount: number;
  theme: SessionState["theme"];
}): PanelSpec[] {
  const dialogueFrequency = new Map<string, number>();
  const actionFrequency = new Map<string, number>();

  for (const panel of args.panels) {
    for (const cell of panel.cellPlan) {
      const dialogueKey = normalizeText(cell.dialogue);
      if (dialogueKey) {
        dialogueFrequency.set(dialogueKey, (dialogueFrequency.get(dialogueKey) ?? 0) + 1);
      }
      const actionKey = normalizeText(cell.action);
      if (actionKey) {
        actionFrequency.set(actionKey, (actionFrequency.get(actionKey) ?? 0) + 1);
      }
    }
  }

  return args.panels.map((panel) => {
    const totalCells = panel.cellPlan.length;
    const cellPlan = panel.cellPlan.map((cell) => {
      const dialogueKey = normalizeText(cell.dialogue);
      const actionKey = normalizeText(cell.action);
      const shouldDiversifyDialogue =
        cell.order > 1 && (dialogueFrequency.get(dialogueKey) ?? 0) >= 3;
      const shouldDiversifyAction = (actionFrequency.get(actionKey) ?? 0) >= 3;

      return {
        ...cell,
        dialogue: shouldDiversifyDialogue
          ? buildCellDialogue({
              beat: panel.beat,
              panelIndex: panel.index,
              panelCount: args.panelCount,
              order: cell.order,
              theme: args.theme,
            })
          : cell.dialogue,
        action: shouldDiversifyAction
          ? buildCellAction({
              beat: panel.beat,
              panelIndex: panel.index,
              panelCount: args.panelCount,
              order: cell.order,
              totalCells,
            })
          : cell.action,
      };
    });
    return {
      ...panel,
      cellPlan,
    };
  });
}

export class Qwen35Service {
  private readonly client: QwenClient;
  private readonly model: string;

  constructor(client?: QwenClient) {
    this.client = client ?? new QwenClient();
    this.model = process.env.QWEN_CHAT_MODEL ?? "qwen3.5-plus";
  }

  async generateStoryGraph(args: {
    session: SessionState;
    minDecisionCount: number;
    maxDecisionCount: number;
  }): Promise<StoryGraph> {
    const payload = await this.client.chatJson<StoryGraphResponse>({
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah penulis cerita komik interaktif. Balas JSON valid saja.",
        },
        {
          role: "user",
          content: [
            "Buat story graph bercabang kiri/kanan.",
            `Nama karakter utama: ${args.session.name}.`,
            `Tema: ${args.session.theme}.`,
            `Gaya: ${args.session.artStyle}.`,
            `Custom karakter: ${describeCharacterPreferences(args.session)}.`,
            `Render setup: ${describeGenerationPreferences(args.session)}.`,
            `Prompt tambahan user: ${describePromptAddon(args.session)}.`,
            `Jumlah panel final: ${args.session.panelCount}.`,
            `Jumlah decision point fleksibel antara ${args.minDecisionCount} sampai ${args.maxDecisionCount}.`,
            "Tentukan sendiri jumlah decision point paling cocok untuk alur ini.",
            "Schema JSON:",
            "{draftOutline:string, decisionPoints:[{id:string,step:number,left:{title:string,consequence:string},right:{title:string,consequence:string}}], continuityRules:string[]}",
            "Draft outline jangan menyebut nomor panel, cukup alur naratif.",
            "Setiap decision harus berupa pertanyaan preferensi user dengan opsi kiri/kanan yang jelas beda.",
            "Buat id decision konsisten: d1,d2,... sesuai jumlah decision yang kamu pilih.",
            "Bahasa Indonesia.",
          ].join(" "),
        },
      ],
      temperature: 0.9,
    });

    const min = Math.max(1, args.minDecisionCount);
    const max = Math.max(min, args.maxDecisionCount);
    const targetCount =
      payload.decisionPoints && payload.decisionPoints.length >= min
        ? Math.min(max, payload.decisionPoints.length)
        : pickFallbackDecisionCount({
            session: args.session,
            min,
            max,
          });

    const decisionPoints = payload.decisionPoints?.slice(0, targetCount) ?? [];
    while (decisionPoints.length < targetCount) {
      const index = decisionPoints.length + 1;
      decisionPoints.push({
        id: `d${index}`,
        step: index,
        left: {
          title: `Ambil jalur cepat ${index}`,
          consequence: "Langkah agresif dengan risiko tinggi namun progres cepat.",
        },
        right: {
          title: `Ambil jalur aman ${index}`,
          consequence: "Langkah lebih aman dan stabil, tetapi butuh waktu lebih lama.",
        },
      });
    }

    const normalizedDecisionPoints = decisionPoints.map((decision, index) => ({
      id: decision.id?.trim() || `d${index + 1}`,
      step: index + 1,
      left: {
        title: stripPanelReferences(decision.left?.title || `Pilihan kiri ${index + 1}`),
        consequence: stripPanelReferences(
          decision.left?.consequence || "Langkah agresif dengan risiko tinggi.",
        ),
      },
      right: {
        title: stripPanelReferences(decision.right?.title || `Pilihan kanan ${index + 1}`),
        consequence: stripPanelReferences(
          decision.right?.consequence || "Langkah aman dengan progres lebih stabil.",
        ),
      },
    }));

    return {
      draftOutline: sanitizeDraftOutline(payload.draftOutline, args.session.theme),
      continuityRules: payload.continuityRules ?? [
        "Gunakan karakter utama yang konsisten di semua panel",
        "Jaga tone visual dan arah aksi antar panel",
      ],
      decisionPoints: normalizedDecisionPoints,
    };
  }

  async generatePanelPlan(args: {
    session: SessionState;
    storyGraph: StoryGraph;
    selectedChoices: Array<{ decisionId: string; choice: Choice }>;
  }): Promise<{ finalOutline: string; characterBible: CharacterBible; panels: PanelSpec[] }> {
    const choiceText = args.selectedChoices
      .map((item) => `${item.decisionId}:${item.choice}`)
      .join(", ");

    const payload = await this.client.chatJson<PanelPlanResponse>({
      model: this.model,
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah showrunner manga. Balas JSON valid saja sesuai schema.",
        },
        {
          role: "user",
          content: [
            `Nama: ${args.session.name}`,
            `Tema: ${args.session.theme}`,
            `Art style: ${args.session.artStyle}`,
            `Character preferences: ${describeCharacterPreferences(args.session)}`,
            `Generation preferences: ${describeGenerationPreferences(args.session)}`,
            `Prompt tambahan user: ${describePromptAddon(args.session)}`,
            `Panel count: ${args.session.panelCount}`,
            `Draft outline: ${args.storyGraph.draftOutline}`,
            `Pilihan user: ${choiceText}`,
            `Continuity rules: ${args.storyGraph.continuityRules.join(" | ")}`,
            "Return JSON schema:",
            "{finalOutline:string,characterBible:{appearance:string,outfit:string,signatureItems:string[],expressionBias:string,visualLock:string,dialogueRules:string[],forbiddenText:string[]},panels:[{index:number,beat:string,setting:string,storyMoment:string,camera:string,emotion:string,continuityToken:string,templateId?:string,layoutGuide:string,readingOrder:\"right_to_left\",requiredConsistency:string[],cellPlan:[{order:number,cellId:string,position:string,shot:string,action:string,expression:string,dialogue?:string}]}]}",
            "Jumlah panels wajib persis sesuai panel count.",
            "Setiap panel wajib punya 2-5 cellPlan dengan variasi layoutGuide antarpanel.",
            "Setiap panel harus punya beat unik dan berkembang, jangan copy-paste beat panel lain.",
            "Setiap panel wajib punya setting eksplisit: lokasi, waktu, dan atmosfer yang mudah divisualkan.",
            "Karakter utama wajib konsisten: wajah, rambut, outfit, dan aksesori tetap sama di semua panel kecuali ada perubahan eksplisit di beat.",
            "Setiap panel wajib punya requiredConsistency yang bisa dipakai model image untuk menjaga kostum, lokasi, dan mood.",
            "Setiap dialogue cell harus konkret, spesifik ke beat panel, maksimal 16 kata.",
            "Semua dialogue bubble wajib berbahasa Indonesia natural, tanpa satu pun kata Inggris.",
            "Dialog dilarang mengandung kata: panel, cell, layout, grid, prompt, shot, camera, style, character, watermark, logo, signature.",
            "Action setiap cell harus mendeskripsikan hal yang digambar, bukan instruksi teknis render.",
            "DILARANG pakai frasa generik berulang seperti: 'Situasi berubah' / 'aku lanjutkan' / 'target belum tercapai'.",
          ].join(" "),
        },
      ],
      temperature: 0.7,
    });

    const panels = payload.panels ?? [];
    const characterBible = normalizeCharacterBible({
      session: args.session,
      raw: payload.characterBible,
    });
    const normalizedPanels: PanelSpec[] = [];
    const beatSeen = new Map<string, number>();

    for (let i = 1; i <= args.session.panelCount; i += 1) {
      const existing = panels.find((panel) => panel.index === i);
      const beat = diversifyBeat(existing?.beat ?? "Peristiwa utama adegan saat ini", beatSeen);
      const fallbackCellCount = 3;
      const fallbackPositions = ["kanan atas", "kiri atas", "bawah penuh", "kanan bawah", "kiri bawah"];
      const fallbackShots = ["close-up", "medium", "wide dynamic", "over-shoulder", "long shot"];
      const fallbackCells = Array.from({ length: fallbackCellCount }, (_, idx) => {
        const order = idx + 1;
        return {
          order,
          cellId: String.fromCharCode(65 + idx),
          position: fallbackPositions[idx] ?? "tengah",
          shot: fallbackShots[idx] ?? "medium",
          action: buildCellAction({
            beat,
            panelIndex: i,
            panelCount: args.session.panelCount,
            order,
            totalCells: fallbackCellCount,
          }),
          expression: order === 1 ? "fokus" : order === fallbackCellCount ? "determined" : "tegang",
          dialogue: buildCellDialogue({
            beat,
            panelIndex: i,
            panelCount: args.session.panelCount,
            order,
            theme: args.session.theme,
          }),
        };
      });

      const normalizedCellPlan = existing?.cellPlan?.length
        ? existing.cellPlan
            .slice(0, 5)
            .map((cell, cellIndex) => {
              const order = Number.isFinite(cell.order) ? cell.order : cellIndex + 1;
              const totalCells = Math.max(2, Math.min(5, existing.cellPlan.length));
              const rawAction = cell.action?.trim();
              const rawDialogue = cell.dialogue?.trim();
              return {
                ...cell,
                order,
                cellId: cell.cellId?.trim() || String.fromCharCode(65 + cellIndex),
                position: cell.position?.trim() || fallbackPositions[cellIndex] || "tengah",
                shot: cell.shot?.trim() || fallbackShots[cellIndex] || "medium",
                expression: cell.expression?.trim() || (order === 1 ? "fokus" : "tegang"),
                action: sanitizeActionText({
                  raw: rawAction,
                  beat,
                  panelIndex: i,
                  panelCount: args.session.panelCount,
                  order,
                  totalCells,
                }),
                dialogue: sanitizeDialogueText({
                  raw: rawDialogue,
                  beat,
                  panelIndex: i,
                  panelCount: args.session.panelCount,
                  order,
                  theme: args.session.theme,
                }),
              };
            })
            .sort((a, b) => a.order - b.order)
        : fallbackCells;

      const setting =
        clampSentence(existing?.setting ?? "", 120) ||
        fallbackSetting(args.session.theme, i);
      const storyMoment =
        clampSentence(existing?.storyMoment ?? "", 120) ||
        fallbackStoryMoment(beat, i, args.session.panelCount);
      const requiredConsistency =
        existing?.requiredConsistency?.filter((item) => item.trim().length > 0).slice(0, 6) ??
        buildRequiredConsistency({
          session: args.session,
          characterBible,
          setting,
          emotion: existing?.emotion ?? "determined",
        });

      normalizedPanels.push({
        index: i,
        beat,
        setting,
        storyMoment,
        camera: existing?.camera ?? "medium shot",
        emotion: existing?.emotion ?? "determined",
        continuityToken: existing?.continuityToken ?? `panel_${i}_continuity`,
        templateId: existing?.templateId ?? "",
        layoutGuide: existing?.layoutGuide ?? "2-cell diagonal split",
        readingOrder: "right_to_left",
        requiredConsistency,
        cellPlan: normalizedCellPlan,
        prompt: "",
      });
    }

    const diversifiedPanels = diversifyRepeatedCellText({
      panels: normalizedPanels,
      panelCount: args.session.panelCount,
      theme: args.session.theme,
    });

    return {
      finalOutline: payload.finalOutline ?? args.storyGraph.draftOutline,
      characterBible,
      panels: diversifiedPanels,
    };
  }
}
