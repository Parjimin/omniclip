import { loadStyleProfile, buildPanelPrompt } from "./prompt-builder";
import { applyGridTemplate } from "./grid-template-library";
import { buildCellAction, buildCellDialogue } from "./dialogue-planner";
import { CharacterBible, Choice, PanelSpec, SessionState, StoryGraph } from "./types";
import { getSession, updateSession } from "@/lib/runtime-store";
type StaticDecisionTemplate = {
  left: { title: string; consequence: string };
  right: { title: string; consequence: string };
};

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

function normalizeChoiceMap(
  selectedChoices: Array<{ decisionId: string; choice: Choice }>,
): Record<string, Choice> {
  return Object.fromEntries(
    selectedChoices.map((item) => [item.decisionId, item.choice]),
  ) as Record<string, Choice>;
}

function buildStaticDecisionTemplates(theme: SessionState["theme"]): StaticDecisionTemplate[] {
  if (theme === "mudik_ramadhan") {
    return [
      {
        left: {
          title: "Lewat Jalur Ramai",
          consequence: "Masuk jalur utama yang penuh orang, kios, dan kendaraan agar suasana mudik terasa hidup.",
        },
        right: {
          title: "Lewat Jalur Kampung",
          consequence: "Memilih jalan kecil yang lebih tenang, sempit, dan penuh detail suasana kampung menjelang magrib.",
        },
      },
      {
        left: {
          title: "Bantu Sesama Pemudik",
          consequence: "Menyempatkan diri membantu pemudik lain agar cerita terasa hangat dan emosional.",
        },
        right: {
          title: "Kejar Waktu Pulang",
          consequence: "Tetap fokus ke tujuan utama agar perjalanan terasa cepat, tegang, dan efisien.",
        },
      },
      {
        left: {
          title: "Berhenti Saat Azan",
          consequence: "Mengambil jeda singkat untuk berbuka, memberi momen hening dan atmosfer Ramadan yang kuat.",
        },
        right: {
          title: "Lanjut Sampai Rumah",
          consequence: "Menahan diri untuk terus bergerak sampai rumah, bikin klimaks terasa lebih tertahan.",
        },
      },
      {
        left: {
          title: "Masuk Lewat Gang Lama",
          consequence: "Pulang lewat gang kenangan masa kecil dengan vibe nostalgia kampung.",
        },
        right: {
          title: "Masuk Lewat Jalan Depan",
          consequence: "Masuk lewat jalan utama dengan sambutan keluarga yang lebih terbuka dan ramai.",
        },
      },
      {
        left: {
          title: "Datang Diam-Diam",
          consequence: "Tiba dengan momen tenang dan personal sebelum keluarga sadar.",
        },
        right: {
          title: "Datang Sambil Menyapa",
          consequence: "Tiba dengan energi hangat, langsung menyapa keluarga dan tetangga sekitar.",
        },
      },
    ];
  }

  return [
    {
      left: {
        title: "Ikuti Peta Lama",
        consequence: "Petualangan terasa klasik dan penuh jejak masa lalu.",
      },
      right: {
        title: "Ikuti Insting",
        consequence: "Petualangan terasa spontan, lincah, dan lebih penuh kejutan.",
      },
    },
    {
      left: {
        title: "Dekati Orang Misterius",
        consequence: "Cerita jadi lebih personal dan penuh percakapan penting.",
      },
      right: {
        title: "Amati Dari Jauh",
        consequence: "Cerita terasa lebih hati-hati, observatif, dan penuh ketegangan diam.",
      },
    },
    {
      left: {
        title: "Jelajahi Rute Dalam",
        consequence: "Masuk lebih jauh ke lokasi utama sehingga suasana tempat terasa dominan.",
      },
      right: {
        title: "Pilih Rute Pinggir",
        consequence: "Melihat area dari sudut-sudut unik dengan staging yang lebih longgar.",
      },
    },
    {
      left: {
        title: "Percaya Teman Baru",
        consequence: "Cerita bergerak lebih emosional dan hangat.",
      },
      right: {
        title: "Andalkan Diri Sendiri",
        consequence: "Cerita terasa lebih sepi, fokus, dan introspektif.",
      },
    },
    {
      left: {
        title: "Tutup Dengan Refleksi",
        consequence: "Ending lebih tenang dan kontemplatif.",
      },
      right: {
        title: "Tutup Dengan Tekad Baru",
        consequence: "Ending lebih optimis dan membuka arah langkah selanjutnya.",
      },
    },
  ];
}

function buildStaticStoryGraph(session: SessionState, decisionCount: number): StoryGraph {
  const templates = buildStaticDecisionTemplates(session.theme).slice(0, decisionCount);

  return {
    draftOutline:
      session.theme === "mudik_ramadhan"
        ? `${session.name} menempuh perjalanan mudik Ramadan yang padat, hangat, dan penuh detail keseharian. Pilihan user menentukan jalur, ritme perjalanan, momen berbuka, dan cara ${session.name} tiba di rumah.`
        : `${session.name} menjalani petualangan yang lebih fokus pada eksplorasi, atmosfer, ekspresi, dan perubahan emosi. Pilihan user menentukan cara ${session.name} bergerak, berinteraksi, dan menutup perjalanan.`,
    continuityRules:
      session.theme === "mudik_ramadhan"
        ? [
            "Jaga outfit, wajah, rambut, dan aksesori karakter utama tetap konsisten.",
            "Suasana Ramadan harus terasa lewat properti, lampu, makanan, masjid, atau keramaian sore.",
            "Fokus pada perjalanan, gestur, dan emosi, bukan pertarungan berlebihan.",
          ]
        : [
            "Jaga outfit, wajah, rambut, dan aksesori karakter utama tetap konsisten.",
            "Fokus pada eksplorasi tempat, ekspresi, dan staging dramatis.",
            "Aksi boleh dinamis, tapi tetap berbasis petualangan visual, bukan pertarungan acak.",
          ],
    decisionPoints: templates.map((template, index) => ({
      id: `d${index + 1}`,
      step: index + 1,
      left: template.left,
      right: template.right,
    })),
  };
}

function buildMudikEvents(args: {
  session: SessionState;
  selectedChoiceMap: Record<string, Choice>;
}): string[] {
  const routeText =
    args.selectedChoiceMap.d1 === "right"
      ? "melewati jalan kampung yang lebih tenang dan sempit"
      : "melewati jalur utama yang penuh keramaian terminal dan kendaraan";
  const empathyText =
    args.selectedChoiceMap.d2 === "left"
      ? "sempat membantu pemudik lain yang kewalahan"
      : "tetap fokus menjaga ritme perjalanan agar tidak kehilangan waktu";
  const iftarText =
    args.selectedChoiceMap.d3 === "left"
      ? "berhenti sejenak saat azan untuk berbuka sederhana"
      : "menahan diri dan terus bergerak agar bisa berbuka di rumah";
  const arrivalText =
    args.selectedChoiceMap.d4 === "left"
      ? "masuk ke kampung lewat gang lama yang penuh nostalgia"
      : "masuk lewat jalan depan yang lebih terbuka dan ramai";
  const closingText =
    args.selectedChoiceMap.d5 === "left"
      ? "tiba dengan langkah tenang dan momen personal"
      : "tiba dengan sapaan hangat dan energi yang langsung pecah";

  return [
    `${args.session.name} menyiapkan tas kecil dan menatap terminal sore menjelang mudik.`,
    `${args.session.name} mulai perjalanan dengan suasana padat, lampu Ramadan, dan antrean panjang.`,
    `${args.session.name} ${routeText} sambil menjaga ekspresi tetap fokus.`,
    `${args.session.name} melihat perubahan suasana jalan, kios takjil, dan arus manusia yang makin rapat.`,
    `${args.session.name} ${empathyText}.`,
    `${args.session.name} bergerak lagi dengan ritme yang lebih mantap setelah keputusan tadi.`,
    `${args.session.name} ${iftarText}.`,
    `${args.session.name} melanjutkan langkah saat langit makin gelap dan kampung mulai dekat.`,
    `${args.session.name} ${arrivalText}.`,
    `${args.session.name} ${closingText} ketika rumah akhirnya terlihat.`,
  ];
}

function buildAdventureEvents(args: {
  session: SessionState;
  selectedChoiceMap: Record<string, Choice>;
}): string[] {
  const routeText =
    args.selectedChoiceMap.d1 === "right"
      ? "mengikuti insting dan petunjuk kecil di sekitar lokasi"
      : "mengikuti peta lama yang penuh tanda dan simbol";
  const strangerText =
    args.selectedChoiceMap.d2 === "left"
      ? "berani mendekati sosok misterius untuk mencari jawaban"
      : "memilih mengamati dari jauh sebelum bergerak";
  const deepRouteText =
    args.selectedChoiceMap.d3 === "left"
      ? "masuk lebih dalam ke pusat lokasi utama"
      : "berputar lewat sisi luar dengan sudut pandang yang lebih luas";
  const partnerText =
    args.selectedChoiceMap.d4 === "left"
      ? "mulai membuka ruang percaya pada orang yang ditemui di perjalanan"
      : "tetap mengandalkan penilaian pribadi di setiap langkah";
  const endingText =
    args.selectedChoiceMap.d5 === "left"
      ? "menutup perjalanan dengan refleksi tenang tentang apa yang baru dipahami"
      : "menutup perjalanan dengan tekad baru untuk langkah berikutnya";

  return [
    `${args.session.name} memasuki lokasi petualangan dengan tatapan penuh rasa ingin tahu.`,
    `${args.session.name} ${routeText}.`,
    `${args.session.name} membaca detail ruang, tekstur dinding, cahaya, dan jejak yang tertinggal.`,
    `${args.session.name} ${strangerText}.`,
    `${args.session.name} bergerak lebih jauh sambil menyesuaikan ritme dan arah pandang.`,
    `${args.session.name} ${deepRouteText}.`,
    `${args.session.name} ${partnerText}.`,
    `${args.session.name} menemukan titik paling penting dalam perjalanan itu.`,
    `${args.session.name} mulai memahami arti semua petunjuk yang dilihat sejak awal.`,
    `${args.session.name} ${endingText}.`,
  ];
}

function wrapEventByIndex(events: string[], index: number): string {
  const safeEvents = events.length > 0 ? events : ["Adegan utama bergerak maju dengan ritme yang konsisten."];
  const base = safeEvents[Math.min(index, safeEvents.length - 1)] ?? safeEvents[0];
  const cycle = Math.floor(index / safeEvents.length);
  return cycle === 0 ? base : `${base} Nuansa lanjutan tahap ${cycle + 1}.`;
}

function buildStaticPanelPlan(args: {
  session: SessionState;
  storyGraph: StoryGraph;
  selectedChoices: Array<{ decisionId: string; choice: Choice }>;
}): { finalOutline: string; characterBible: CharacterBible; panels: PanelSpec[] } {
  const character = args.session.characterPreferences;
  const selectedChoiceMap = normalizeChoiceMap(args.selectedChoices);
  const events =
    args.session.theme === "mudik_ramadhan"
      ? buildMudikEvents({
          session: args.session,
          selectedChoiceMap,
        })
      : buildAdventureEvents({
          session: args.session,
          selectedChoiceMap,
        });

  const finalOutline =
    args.session.theme === "mudik_ramadhan"
      ? `${args.session.name} menjalani mudik Ramadan dengan ritme yang lebih manusiawi, fokus pada perjalanan, suasana jalan, keputusan personal, dan momen pulang ke rumah.`
      : `${args.session.name} menjalani petualangan visual yang fokus pada eksplorasi tempat, ekspresi, keputusan personal, dan penutup yang jelas.`;
  const characterBible: CharacterBible = {
    appearance: `Wajah ${args.session.name} dengan ${character.specialTraits}, rambut ${character.hairStyle} warna ${character.hairColor}, build ${character.build}, usia ${character.ageRange}.`,
    outfit: character.outfitStyle,
    signatureItems: character.accessories
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
    expressionBias: character.personality,
    visualLock: `${args.session.name} selalu punya wajah, rambut, outfit, dan aksesori yang sama di seluruh adegan kecuali ada perubahan eksplisit.`,
    dialogueRules: [
      "Bubble dialog wajib bahasa Indonesia natural.",
      "Dialog singkat, konkret, dan tidak mengandung bahasa Inggris.",
      "Tidak boleh ada istilah teknis prompt di dalam bubble.",
    ],
    forbiddenText: ["prompt", "layout", "grid", "cell", "camera", "shot", "style"],
  };

  const panels: PanelSpec[] = [];
  const layoutPool = [
    "2-cell diagonal split",
    "3-cell top-wide bottom-duo",
    "2-cell cinematic wide",
    "4-cell clean manga grid",
    "3-cell vertical cascade",
  ];
  for (let i = 1; i <= args.session.panelCount; i += 1) {
    const beat = wrapEventByIndex(events, i - 1);
    const layoutGuide = layoutPool[(i - 1) % layoutPool.length];
    const totalCells = i % 3 === 0 ? 2 : i % 4 === 0 ? 4 : 3;
    const baseCells = [
      {
        order: 1,
        cellId: "A",
        position: "kanan atas",
        shot: "close-up",
        action: buildCellAction({
          beat,
          panelIndex: i,
          panelCount: args.session.panelCount,
          order: 1,
          totalCells,
        }),
        expression: "fokus",
        dialogue: buildCellDialogue({
          beat,
          panelIndex: i,
          panelCount: args.session.panelCount,
          order: 1,
          theme: args.session.theme,
        }),
      },
      {
        order: 2,
        cellId: "B",
        position: "kiri atas",
        shot: "medium",
        action: buildCellAction({
          beat,
          panelIndex: i,
          panelCount: args.session.panelCount,
          order: 2,
          totalCells,
        }),
        expression: i <= Math.floor(args.session.panelCount * 0.7) ? "tegang" : "lega",
        dialogue: buildCellDialogue({
          beat,
          panelIndex: i,
          panelCount: args.session.panelCount,
          order: 2,
          theme: args.session.theme,
        }),
      },
      {
        order: 3,
        cellId: "C",
        position: "bawah lebar",
        shot: "wide atmospheric",
        action: buildCellAction({
          beat,
          panelIndex: i,
          panelCount: args.session.panelCount,
          order: 3,
          totalCells,
        }),
        expression: "determined",
        dialogue: buildCellDialogue({
          beat,
          panelIndex: i,
          panelCount: args.session.panelCount,
          order: 3,
          theme: args.session.theme,
        }),
      },
      {
        order: 4,
        cellId: "D",
        position: "insert detail",
        shot: "detail shot",
        action: `Detail kecil yang menegaskan ${clampSentence(beat.toLowerCase(), 80)}.`,
        expression: "hening",
        dialogue: "",
      },
    ];
    const cellPlan = baseCells.slice(0, totalCells);
    panels.push({
      index: i,
      beat,
      setting:
        args.session.theme === "mudik_ramadhan"
          ? i <= 2
            ? "terminal dan area keberangkatan mudik saat senja"
            : i <= 5
              ? "jalur mudik, kios takjil, jalan padat, dan suasana kampung sore"
              : i <= args.session.panelCount - 1
                ? "jalan masuk kampung dengan lampu rumah dan udara malam Ramadan"
                : "teras rumah keluarga dengan suasana hangat menjelang buka atau malam"
          : i <= 2
            ? "pintu masuk area petualangan dengan detail lokasi yang kuat"
            : i <= 5
              ? "jalur eksplorasi utama dengan detail ruang yang makin kaya"
              : i <= args.session.panelCount - 1
                ? "titik terdalam lokasi dengan atmosfer paling kuat"
                : "lokasi tenang setelah konflik mereda",
      storyMoment:
        i <= 2
          ? "pembukaan perjalanan dan pengenalan suasana"
          : i <= Math.floor(args.session.panelCount * 0.75)
            ? "perkembangan perjalanan dan perubahan keputusan"
            : "penutup perjalanan dan resolusi emosional",
      camera:
        i % 4 === 1
          ? "wide shot"
          : i % 4 === 2
            ? "medium shot"
            : i % 4 === 3
              ? "close-up"
              : "dynamic angle",
      emotion:
        i <= 2
          ? "anticipation"
          : i <= Math.floor(args.session.panelCount * 0.7)
            ? "focus"
            : "relief",
      continuityToken: `fallback_panel_${i}`,
      templateId: "",
      layoutGuide,
      readingOrder: "right_to_left",
      requiredConsistency: [
        `outfit utama tetap ${character.outfitStyle}`,
        `rambut tetap ${character.hairStyle} warna ${character.hairColor}`,
        `aksesori tetap ${character.accessories}`,
      ],
      cellPlan,
      prompt: "",
    });
  }

  return {
    finalOutline,
    characterBible,
    panels,
  };
}

export function calculateDecisionCount(panelCount: number): number {
  const maxByFormula = Math.floor((panelCount - 2) / 3);
  return Math.max(1, Math.min(5, maxByFormula));
}

export async function ensureStoryGraph(sessionId: string): Promise<StoryGraph> {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error("Session tidak ditemukan");
  }

  if (session.storyGraph) {
    return session.storyGraph;
  }

  const decisionCount = calculateDecisionCount(session.panelCount);
  const storyGraph = buildStaticStoryGraph(session, decisionCount);

  updateSession(sessionId, { storyGraph });
  return storyGraph;
}

export function getCurrentDecision(session: SessionState) {
  if (!session.storyGraph) {
    return undefined;
  }

  for (const decision of session.storyGraph.decisionPoints) {
    if (!session.selectedChoices[decision.id]) {
      return decision;
    }
  }

  return undefined;
}

export function applyChoice(args: {
  sessionId: string;
  decisionId: string;
  choice: Choice;
}) {
  const session = getSession(args.sessionId);
  if (!session) {
    throw new Error("Session tidak ditemukan");
  }

  if (!session.storyGraph) {
    throw new Error("Story graph belum tersedia");
  }

  const validDecision = session.storyGraph.decisionPoints.find(
    (item) => item.id === args.decisionId,
  );

  if (!validDecision) {
    throw new Error("Decision id tidak valid");
  }

  const selectedChoices = {
    ...session.selectedChoices,
    [args.decisionId]: args.choice,
  };

  const nextSession = updateSession(args.sessionId, {
    selectedChoices,
  });

  if (!nextSession) {
    throw new Error("Gagal update sesi");
  }

  const nextDecision = getCurrentDecision(nextSession);

  return {
    nextDecision,
    isComplete: !nextDecision,
    selectedChoices,
  };
}

export function selectedChoicesInOrder(session: SessionState) {
  if (!session.storyGraph) {
    return [];
  }

  return session.storyGraph.decisionPoints
    .filter((decision) => session.selectedChoices[decision.id])
    .map((decision) => ({
      decisionId: decision.id,
      choice: session.selectedChoices[decision.id],
    }));
}

export async function compilePanelSpecs(sessionId: string): Promise<{
  finalOutline: string;
  panelSpecs: PanelSpec[];
}> {
  const session = getSession(sessionId);
  if (!session) {
    throw new Error("Session tidak ditemukan");
  }

  const storyGraph = await ensureStoryGraph(sessionId);
  const selectedChoices = selectedChoicesInOrder(session);

  const generated = buildStaticPanelPlan({
    session,
    storyGraph,
    selectedChoices,
  });

  const styleProfile = await loadStyleProfile(session.artStyle);

  const templatedPanels = generated.panels.map((panel) =>
    applyGridTemplate({
      panel,
      panelLayout: session.generationPreferences.panelLayout,
    }),
  );

  const finalPanels = templatedPanels.map((panel, index) => {
    const previousPanel = templatedPanels[index - 1];
    return {
      ...panel,
      prompt: buildPanelPrompt({
        session,
        panel,
        styleProfile,
        characterBible: generated.characterBible,
        previousPanel,
      }),
    };
  });

  return {
    finalOutline: generated.finalOutline,
    panelSpecs: finalPanels,
  };
}
