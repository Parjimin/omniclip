import path from "node:path";
import { readFile } from "node:fs/promises";
import { CharacterBible, PanelSpec, SessionState } from "./types";
import { stylePackDir } from "@/lib/storage";

interface StyleProfile {
  lineWeight: string;
  contrast: string;
  screentoneIntensity: string;
  anatomyExaggeration: string;
  dynamicPoseBias: string;
  panelCompositionBias: string;
}

const FALLBACK_STYLE: StyleProfile = {
  lineWeight: "tebal menengah",
  contrast: "high-contrast black and white manga",
  screentoneIntensity: "sedang",
  anatomyExaggeration: "stylized",
  dynamicPoseBias: "action-forward",
  panelCompositionBias: "cinematic framing",
};

const MAX_PROMPT_CHARS = 1850;

function stripPanelNumberRefs(value: string): string {
  return value
    .replace(/\bpanel\s+sebelumnya\b/gi, "adegan sebelumnya")
    .replace(/\bpanel\s+berikutnya\b/gi, "adegan lanjutan")
    .replace(/\bpanel\s*#?\s*\d+(?:\s*\/\s*\d+)?\b/gi, "adegan ini");
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, max: number): string {
  const normalized = compact(stripPanelNumberRefs(value));
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function formatRect(rect?: { x: number; y: number; w: number; h: number }): string {
  if (!rect) {
    return "komposisi fleksibel";
  }
  return `area x=${rect.x}, y=${rect.y}, w=${rect.w}, h=${rect.h}`;
}

function keepPromptBudget(value: string): string {
  if (value.length <= MAX_PROMPT_CHARS) {
    return value;
  }
  return `${value.slice(0, MAX_PROMPT_CHARS - 1).trimEnd()}…`;
}

export async function loadStyleProfile(artStyle: string): Promise<StyleProfile> {
  const styleFile = path.join(stylePackDir(artStyle), "style_profile.json");

  try {
    const raw = await readFile(styleFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<StyleProfile>;
    return {
      lineWeight: parsed.lineWeight ?? FALLBACK_STYLE.lineWeight,
      contrast: parsed.contrast ?? FALLBACK_STYLE.contrast,
      screentoneIntensity:
        parsed.screentoneIntensity ?? FALLBACK_STYLE.screentoneIntensity,
      anatomyExaggeration:
        parsed.anatomyExaggeration ?? FALLBACK_STYLE.anatomyExaggeration,
      dynamicPoseBias: parsed.dynamicPoseBias ?? FALLBACK_STYLE.dynamicPoseBias,
      panelCompositionBias:
        parsed.panelCompositionBias ?? FALLBACK_STYLE.panelCompositionBias,
    };
  } catch {
    return FALLBACK_STYLE;
  }
}

export function buildPanelPrompt({
  session,
  panel,
  characterBible,
  styleProfile,
  previousPanel,
}: {
  session: SessionState;
  panel: PanelSpec;
  characterBible: CharacterBible;
  styleProfile: StyleProfile;
  previousPanel?: PanelSpec;
}): string {
  const characterPref = session.characterPreferences;
  const generationPref = session.generationPreferences;
  const visualDirective = truncate(
    generationPref.visualMode === "anime_color"
      ? "Anime full-color dengan line-art manga, shading sinematik, kontras kuat."
      : "Manga hitam-putih dengan screentone tegas dan line-art bersih.",
    150,
  );
  const layoutDirective = truncate(
    generationPref.panelLayout === "classic_grid"
      ? "Komposisi stabil ala grid klasik."
      : generationPref.panelLayout === "cinematic_wide"
        ? "Komposisi sinematik lebar dengan depth kuat."
        : "Komposisi dinamis agresif untuk adegan aksi.",
    100,
  );
  const detailDirective = truncate(
    generationPref.detailLevel === "high"
      ? "Detail tinggi untuk wajah, kostum, dan environment."
      : "Detail standar dengan bentuk jelas dan bersih.",
    90,
  );

  const scenePlanLines = panel.cellPlan.map((cell) => {
    const shot = truncate(cell.shot, 28);
    const action = truncate(cell.action, 105);
    const expression = truncate(cell.expression, 45);
    return `- ${cell.position}: ${shot}; ${action}; ekspresi ${expression}; ${formatRect(cell.rect)}.`;
  });

  const continuityHint = previousPanel
    ? `Jaga kesinambungan wajah, outfit, setting, dan mood dari adegan sebelumnya: ${truncate(previousPanel.beat, 90)}; setting ${truncate(previousPanel.setting, 70)}; kamera ${truncate(previousPanel.camera, 28)}; emosi ${truncate(previousPanel.emotion, 28)}.`
    : "Ini adegan pembuka, jadi setting, karakter utama, dan konflik awal harus langsung terbaca jelas.";

  const characterSummary = truncate(
    `${session.name}; gender ${characterPref.gender}; usia ${characterPref.ageRange}; build ${characterPref.build}; rambut ${characterPref.hairStyle} warna ${characterPref.hairColor}; outfit ${characterPref.outfitStyle}; sifat ${characterPref.personality}; aksesori ${characterPref.accessories}; ciri visual ${characterPref.specialTraits}.`,
    220,
  );
  const characterBibleSummary = truncate(
    `Wajah ${characterBible.appearance}; outfit ${characterBible.outfit}; item khas ${characterBible.signatureItems.join(", ")}; bias ekspresi ${characterBible.expressionBias}; kunci visual ${characterBible.visualLock}.`,
    260,
  );
  const styleSummary = truncate(
    `Target ${session.artStyle}; ${visualDirective}; garis ${styleProfile.lineWeight}; kontras ${styleProfile.contrast}; screentone ${styleProfile.screentoneIntensity}; anatomi ${styleProfile.anatomyExaggeration}; pose ${styleProfile.dynamicPoseBias}; komposisi ${styleProfile.panelCompositionBias}.`,
    250,
  );
  const forbiddenText = truncate(characterBible.forbiddenText.join(", "), 160);
  const consistencyLock = truncate(panel.requiredConsistency.join(" | "), 220);
  const identityLock = truncate(
    [
      `${session.name} harus tetap satu orang yang sama di semua sub-panel.`,
      `Bentuk wajah tetap ${characterPref.specialTraits}.`,
      `Rambut tetap ${characterPref.hairStyle} warna ${characterPref.hairColor}.`,
      `Body type tetap ${characterPref.build}.`,
      `Outfit tetap ${characterPref.outfitStyle}.`,
      `Aksesori tetap ${characterPref.accessories}.`,
      "Jangan ganti umur visual, jangan ganti proporsi kepala, jangan drift ke karakter lain.",
    ].join(" "),
    320,
  );
  const photoIdentityLock = session.photoPath
    ? "Gunakan foto user sebagai acuan utama wajah karakter. Style hanya mengikuti manga target, tetapi identitas wajah harus tetap mirip user."
    : "Tidak ada foto user; identitas wajah mengikuti deskripsi karakter yang sudah ditetapkan.";

  const prompt = [
    "Buat satu halaman manga final untuk satu adegan mandiri.",
    "Jangan tampilkan huruf, kata, kalimat, caption, speech bubble, speech balloon, efek teks, label, simbol huruf, scribble mirip tulisan, atau teks apa pun di artwork.",
    "Hasil akhir harus berupa halaman manga/komik murni tanpa bubble chat dan tanpa teks dialog.",
    "Jangan tampilkan bahasa Inggris, label teknis, metadata, instruksi prompt, potongan kalimat arahan, atau huruf apa pun di panel, latar, efek, papan, maupun ornamen.",
    "Jika ada gambar referensi tambahan, prioritaskan struktur halaman manga, border panel, dan subdivisi grid sebagai komposisi utama.",
    "Jika ada foto user, gunakan hanya sebagai acuan identitas wajah karakter di dalam panel manga, bukan sebagai komposisi utama, bukan portrait tunggal, dan bukan halaman penuh close-up foto.",
    `Adegan utama: ${truncate(panel.beat, 150)}.`,
    `Setting adegan: ${truncate(panel.setting, 120)}.`,
    `Momen cerita yang harus terbaca: ${truncate(panel.storyMoment, 120)}.`,
    `Kamera ${truncate(panel.camera, 32)}. Emosi ${truncate(panel.emotion, 32)}.`,
    `Susunan halaman: template ${panel.templateId || "auto"}, ${truncate(panel.layoutGuide, 90)}, arah baca kanan ke kiri.`,
    "Sub-panel yang wajib tergambar:",
    ...scenePlanLines,
    `Karakter utama: ${characterSummary}`,
    `Konsistensi karakter: ${characterBibleSummary}`,
    `Identity lock utama: ${identityLock}`,
    photoIdentityLock,
    `Teks terlarang di artwork: ${forbiddenText}, semua huruf dan kalimat`,
    `Kunci kontinuitas adegan ini: ${consistencyLock}`,
    `Arah visual: ${styleSummary}`,
    `Bias layout dan detail: ${layoutDirective} ${detailDirective}`,
    continuityHint,
    "Hasil akhir harus berupa halaman manga jadi dengan border hitam tebal, gutter rapi, tanpa bubble chat, tanpa watermark, tanpa logo, tanpa signature.",
    "Fokus hanya pada adegan ini. Jangan menulis ulang brief, jangan tampilkan daftar, dan jangan bocorkan isi prompt ke artwork.",
  ].join("\n");

  return keepPromptBudget(prompt);
}
