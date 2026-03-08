import path from "node:path";
import { readFile, access } from "node:fs/promises";
import { PanelSpec, SessionState } from "./types";
import { renderGridGuideImage } from "./grid-guide-renderer";
import { jobDir, saveBinaryFile, stylePackDir } from "@/lib/storage";
import { appendJobLog } from "@/lib/runtime-store";
import { QwenImageEditService } from "@/lib/ai/qwen-image-edit-service";
import { QwenImage20GenerateService } from "@/lib/ai/qwen-image-20-generate-service";
import { WanImageService } from "@/lib/ai/wan-image-service";
import { retry } from "@/lib/ai/retries";

function createImageService() {
  const provider = (process.env.IMAGE_PROVIDER ?? "wan").toLowerCase();
  if (provider === "qwen") {
    return new QwenImageEditService();
  }
  if (provider === "qwen20" || provider === "qwen-image-2.0-pro") {
    return new QwenImage20GenerateService();
  }
  if (provider === "wan" || provider === "wan2.6" || provider === "wan2.6-image") {
    return new WanImageService();
  }
  if (provider !== "wan") {
    console.warn(`[image-provider] unknown provider "${provider}", fallback ke WAN2.6`);
  }
  return new WanImageService();
}

function mimeTypeFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "image/png";
}

function toDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

async function readUserPhotoDataUrl(session: SessionState): Promise<string | undefined> {
  if (!session.photoPath) {
    return undefined;
  }

  const buffer = await readFile(session.photoPath);
  const mimeType = session.photoMimeType ?? "image/jpeg";
  return toDataUrl(buffer.toString("base64"), mimeType);
}

type StyleReferenceImage = {
  baseName: string;
  dataUrl: string;
};

async function loadStyleReferenceImagesDataUrl(
  artStyle: string,
): Promise<StyleReferenceImage[]> {
  const dir = stylePackDir(artStyle);
  const requiredBaseNames = [
    "action-1",
    "action-2",
    "action-3",
    "closeup-1",
    "environment-1",
  ] as const;
  const extCandidates = [".png", ".jpg", ".jpeg", ".webp"] as const;

  try {
    const dataUrlList: StyleReferenceImage[] = [];
    const missingFiles: string[] = [];

    for (const baseName of requiredBaseNames) {
      let foundPath: string | null = null;

      for (const ext of extCandidates) {
        const candidate = path.join(dir, `${baseName}${ext}`);
        try {
          await access(candidate);
          foundPath = candidate;
          break;
        } catch {
          // Try next extension
        }
      }

      if (!foundPath) {
        missingFiles.push(baseName);
        continue;
      }

      const raw = await readFile(foundPath);
      dataUrlList.push({
        baseName,
        dataUrl: toDataUrl(raw.toString("base64"), mimeTypeFromExtension(foundPath)),
      });
    }

    const showStyleWarn = process.env.STYLE_PACK_VERBOSE_WARN === "true";
    if (showStyleWarn && missingFiles.length > 0) {
      console.warn(
        `[style-pack] ${artStyle} missing references: ${missingFiles.join(", ")} (.png/.jpg/.jpeg/.webp)`,
      );
    }

    return dataUrlList;
  } catch {
    return [];
  }
}

type ImageService = {
  generatePanel(input: {
    prompt: string;
    userPhotoDataUrl?: string;
    continuityImageDataUrl?: string;
    styleImageDataUrls?: string[];
    guideImageDataUrls?: string[];
    negativePrompt?: string;
    seed?: number;
    promptExtend?: boolean;
  }): Promise<Buffer>;
};

async function buildImageInputs(session: SessionState): Promise<{
  userPhotoDataUrl?: string;
  styleImageDataUrls: StyleReferenceImage[];
}> {
  const [userPhotoDataUrl, styleImageDataUrls] = await Promise.all([
    readUserPhotoDataUrl(session),
    loadStyleReferenceImagesDataUrl(session.artStyle),
  ]);

  return { userPhotoDataUrl, styleImageDataUrls };
}

function pickPreferredStyleImages(
  styleImageDataUrls: StyleReferenceImage[],
  preferredBaseNames: string[],
  limit: number,
): string[] {
  const picked: string[] = [];
  const seen = new Set<string>();

  for (const baseName of preferredBaseNames) {
    const match = styleImageDataUrls.find((item) => item.baseName === baseName);
    if (!match || seen.has(match.baseName)) {
      continue;
    }
    picked.push(match.dataUrl);
    seen.add(match.baseName);
    if (picked.length >= limit) {
      return picked;
    }
  }

  for (const item of styleImageDataUrls) {
    if (picked.length >= limit) {
      break;
    }
    if (seen.has(item.baseName)) {
      continue;
    }
    picked.push(item.dataUrl);
    seen.add(item.baseName);
  }

  return picked;
}

function chooseStyleReferencesForWan(styleImageDataUrls: StyleReferenceImage[]): string[] {
  return pickPreferredStyleImages(
    styleImageDataUrls,
    ["action-1", "closeup-1", "environment-1", "action-2", "action-3"],
    3,
  );
}

function chooseStyleReferencesForQwen(styleImageDataUrls: StyleReferenceImage[]): string[] {
  return pickPreferredStyleImages(
    styleImageDataUrls,
    ["action-1", "closeup-1", "environment-1", "action-2", "action-3"],
    5,
  );
}

function pickStyleImagesForProvider(
  service: ImageService,
  styleImageDataUrls: StyleReferenceImage[],
): string[] {
  if (service instanceof WanImageService) {
    return chooseStyleReferencesForWan(styleImageDataUrls);
  }
  return chooseStyleReferencesForQwen(styleImageDataUrls);
}

function createConfiguredImageService(): { service: ImageService; provider: "wan" | "qwen" } {
  const service = createImageService();
  if (service instanceof QwenImageEditService || service instanceof QwenImage20GenerateService) {
    return { service, provider: "qwen" };
  }
  return { service, provider: "wan" };
}

function buildNegativePrompt(session: SessionState): string | undefined {
  const textLeakNegativePrompt =
    process.env.TEXT_LEAK_NEGATIVE_PROMPT ??
    "english text in speech bubble, prompt instructions, technical labels, metadata text, ui labels, template text, task text, scene text, grid text, cell text, long paragraph inside bubble, watermark, logo, signature, prompt text pasted into bubble";

  const consistencyNegativePrompt =
    process.env.CONSISTENCY_NEGATIVE_PROMPT ??
    "inconsistent outfit, costume changed, hairstyle changed, face drift, different character face, inconsistent accessories, background drift, inconsistent setting, inconsistent lighting, blurry face, distorted hands";

  if (session.generationPreferences.visualMode !== "manga_bw") {
    return `${textLeakNegativePrompt}, ${consistencyNegativePrompt}`;
  }

  const mangaBwNegativePrompt =
    process.env.MANGA_BW_NEGATIVE_PROMPT ??
    "full color, colorful image, saturated colors, vivid RGB, neon palette, watercolor tone";

  return `${mangaBwNegativePrompt}, ${textLeakNegativePrompt}, ${consistencyNegativePrompt}`;
}

function buildQwen20BaseNegativePrompt(session: SessionState): string {
  const base =
    process.env.QWEN_IMAGE_BASE_NEGATIVE_PROMPT ??
    "generic anime face, inconsistent character face, changed hairstyle, changed outfit, simple recolor only, english text, readable text, speech bubble, speech balloon, watermark, logo, signature, realistic photo rendering, weak screentone, weak line art";

  if (session.generationPreferences.visualMode === "manga_bw") {
    return `full color, colorful image, saturated colors, ${base}`;
  }

  return base;
}

function toPngDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export function createDeterministicPanelSeed(args: {
  session: SessionState;
  panel: PanelSpec;
}): number {
  const manualSeed = process.env.WAN_FIXED_SEED;
  const base = manualSeed?.trim()
    ? `${manualSeed}|${args.panel.index}`
    : `${args.session.id}|${args.session.name}|${args.session.theme}|${args.session.artStyle}|${args.panel.index}|${args.panel.continuityToken}`;

  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) & 0x7fffffff;
  }

  return hash || 1;
}

function buildQwen20BasePrompt(args: {
  session: SessionState;
  panel: PanelSpec;
  hasContinuityReference: boolean;
}): string {
  const character = args.session.characterPreferences;
  const consistency = args.panel.requiredConsistency.join(", ");
  const scenePlanLines = args.panel.cellPlan
    .map((cell) =>
      `${cell.position}; shot ${cell.shot}; action ${cell.action}; expression ${cell.expression}; rect x=${cell.rect?.x ?? 0}, y=${cell.rect?.y ?? 0}, w=${cell.rect?.w ?? 1}, h=${cell.rect?.h ?? 1}`,
    )
    .join(" | ");

  return [
    "Generate one finished manga page panel in black and white.",
    "Use Image 1 as the main identity reference for the protagonist.",
    args.hasContinuityReference
      ? "Use Image 2 as the continuity anchor and keep the same face, jawline, hairstyle silhouette, outfit details, and accessories as Image 2."
      : "Keep the same protagonist identity consistently and avoid face drift.",
    "Use the remaining reference image only for target manga style.",
    `Target manga style: ${args.session.artStyle}. Strong manga inking, sharp line weight, expressive faces, dramatic contrast, clean screentone, no watercolor look.`,
    `Main character identity lock: hair ${character.hairStyle}, hair color ${character.hairColor}, build ${character.build}, outfit ${character.outfitStyle}, accessories ${character.accessories}, special traits ${character.specialTraits}.`,
    `Scene beat: ${args.panel.beat}.`,
    `Setting: ${args.panel.setting}.`,
    `Story moment: ${args.panel.storyMoment}.`,
    `Camera: ${args.panel.camera}. Emotion: ${args.panel.emotion}.`,
    `Panel layout plan: template ${args.panel.templateId || "auto"}, ${args.panel.layoutGuide}, right-to-left manga reading order.`,
    `Cell plan: ${scenePlanLines}.`,
    `Consistency requirements: ${consistency}.`,
    "This is not a recolor task. Draw the panel directly in the target manga style from the beginning.",
    "Use the grid guide reference to preserve the panel borders, subdivisions, and spatial layout exactly.",
    "Do not add speech bubbles, speech balloons, readable text, English words, logo, watermark, signature, prompt text, or labels.",
  ].join(" ");
}

export async function renderPanels(args: {
  session: SessionState;
  jobId: string;
  panelSpecs: PanelSpec[];
  onPanelDone?: (payload: {
    panelIndex: number;
    panelPath: string;
    total: number;
  }) => void;
}) {
  const { userPhotoDataUrl, styleImageDataUrls } = await buildImageInputs(args.session);
  const negativePrompt = buildNegativePrompt(args.session);
  const qwen20BaseNegativePrompt = buildQwen20BaseNegativePrompt(args.session);
  const { service, provider } = createConfiguredImageService();
  const styleImagesForProvider = pickStyleImagesForProvider(service, styleImageDataUrls);
  const promptExtend =
    provider === "wan"
      ? (process.env.WAN_PROMPT_EXTEND ?? "true").toLowerCase() === "true"
      : undefined;
  console.info(`[image-provider] using ${provider} for panel generation`);

  const generatedFiles: Array<{
    index: number;
    fileName: string;
    data: Buffer;
    path: string;
  }> = [];
  let previousPanelDataUrl: string | undefined;

  for (const panel of args.panelSpecs) {
    appendJobLog(args.jobId, `Panel ${panel.index}: start base render`);
    const seed = provider === "wan"
      ? createDeterministicPanelSeed({
          session: args.session,
          panel,
        })
      : undefined;

    const gridGuideBuffer =
      service instanceof QwenImage20GenerateService
        ? await renderGridGuideImage({ panel }).catch((error) => {
            console.warn(`[grid-guide] gagal render untuk panel ${panel.index}`, error);
            return null;
          })
        : null;

    const baseImageBuffer = await retry(
      () =>
        service.generatePanel({
          prompt:
            service instanceof QwenImage20GenerateService
              ? buildQwen20BasePrompt({
                  session: args.session,
                  panel,
                  hasContinuityReference: Boolean(previousPanelDataUrl),
                })
              : panel.prompt,
          userPhotoDataUrl,
          continuityImageDataUrl:
            service instanceof QwenImage20GenerateService
              ? previousPanelDataUrl
              : previousPanelDataUrl,
          styleImageDataUrls: styleImagesForProvider,
          guideImageDataUrls: gridGuideBuffer ? [toPngDataUrl(gridGuideBuffer)] : undefined,
          negativePrompt:
            service instanceof QwenImage20GenerateService ? qwen20BaseNegativePrompt : negativePrompt,
          seed,
          promptExtend,
        }),
      {
        retries: 2,
        minDelayMs: 1200,
        maxDelayMs: 3500,
      },
    );
    const rawOutputPath = path.join(
      jobDir(args.jobId),
      "panels",
      "raw",
      `panel-${String(panel.index).padStart(2, "0")}.png`,
    );
    await saveBinaryFile(rawOutputPath, baseImageBuffer);
    appendJobLog(args.jobId, `Panel ${panel.index}: base render selesai`);

    const fileName = `panel-${String(panel.index).padStart(2, "0")}.png`;
    const outputPath = path.join(jobDir(args.jobId), "panels", fileName);
    await saveBinaryFile(outputPath, baseImageBuffer);
    appendJobLog(args.jobId, `Panel ${panel.index}: final panel tersimpan`);

    generatedFiles.push({
      index: panel.index,
      fileName,
      data: baseImageBuffer,
      path: outputPath,
    });
    previousPanelDataUrl = `data:image/png;base64,${baseImageBuffer.toString("base64")}`;

    args.onPanelDone?.({
      panelIndex: panel.index,
      panelPath: outputPath,
      total: args.panelSpecs.length,
    });
  }

  return generatedFiles;
}
