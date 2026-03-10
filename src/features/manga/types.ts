export type Theme = "mudik_ramadhan" | "petualangan";

export type Choice = "left" | "right";

export type CharacterGender = "male" | "female" | "androgynous";
export type CharacterAgeRange = "teen" | "young_adult" | "adult";
export type CharacterBuild = "slim" | "average" | "athletic";

export type VisualMode = "manga_bw" | "anime_color";
export type PanelLayout = "classic_grid" | "dynamic_action" | "cinematic_wide";
export type DetailLevel = "standard" | "high";

export type JobStatus =
  | "queued"
  | "drafting"
  | "rendering"
  | "packaging"
  | "done"
  | "error";

export interface StoryChoiceOption {
  title: string;
  consequence: string;
}

export interface StoryDecision {
  id: string;
  step: number;
  left: StoryChoiceOption;
  right: StoryChoiceOption;
}

export interface StoryGraph {
  draftOutline: string;
  decisionPoints: StoryDecision[];
  continuityRules: string[];
}

export interface CharacterBible {
  appearance: string;
  outfit: string;
  signatureItems: string[];
  expressionBias: string;
  visualLock: string;
  dialogueRules: string[];
  forbiddenText: string[];
}

export interface CharacterPreferences {
  gender: CharacterGender;
  ageRange: CharacterAgeRange;
  build: CharacterBuild;
  hairStyle: string;
  hairColor: string;
  outfitStyle: string;
  personality: string;
  accessories: string;
  specialTraits: string;
}

export interface GenerationPreferences {
  visualMode: VisualMode;
  panelLayout: PanelLayout;
  detailLevel: DetailLevel;
}

export interface PanelRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BubbleAnchor {
  x: number;
  y: number;
  align: "left" | "right" | "center";
}

export interface PanelCellPlan {
  order: number;
  cellId: string;
  position: string;
  shot: string;
  action: string;
  expression: string;
  dialogue: string;
  rect?: PanelRect;
  bubble?: BubbleAnchor;
}

export interface PanelSpec {
  index: number;
  beat: string;
  setting: string;
  storyMoment: string;
  camera: string;
  emotion: string;
  continuityToken: string;
  templateId: string;
  layoutGuide: string;
  readingOrder: "right_to_left";
  requiredConsistency: string[];
  cellPlan: PanelCellPlan[];
  prompt: string;
}

export interface PanelAsset {
  index: number;
  fileName: string;
  mimeType: string;
  path: string;
  downloadUrl: string;
}

export interface GenerationResult {
  jobId: string;
  panels: PanelAsset[];
  panelPlans: Array<{
    index: number;
    templateId: string;
    layoutGuide: string;
      readingOrder: "right_to_left";
      cellPlan: PanelCellPlan[];
    }>;
  previewSheetUrl: string;
  pdfUrl: string;
  zipUrl: string;
  finalOutline: string;
}

export interface SessionState {
  id: string;
  userId: string;
  name: string;
  theme: Theme;
  artStyle: string;
  panelCount: number;
  characterPreferences: CharacterPreferences;
  generationPreferences: GenerationPreferences;
  promptAddon?: string;
  photoPath?: string;
  photoMimeType?: string;
  createdAt: number;
  storyGraph?: StoryGraph;
  selectedChoices: Record<string, Choice>;
}

export interface GenerationProgress {
  value: number;
  stage: string;
  message: string;
}

export interface GenerationEvent {
  type: "snapshot" | "progress" | "panel_done" | "completed" | "failed";
  data: unknown;
  at: number;
}

export interface GenerationJob {
  id: string;
  sessionId: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  progress: GenerationProgress;
  panelTargetCount?: number;
  logs: string[];
  result?: GenerationResult;
  error?: string;
  events: GenerationEvent[];
}

export interface SessionCreateInput {
  name: string;
  userId: string;
  theme: Theme;
  artStyle: string;
  panelCount: number;
  characterPreferences: CharacterPreferences;
  generationPreferences: GenerationPreferences;
  promptAddon?: string;
}

export const DEFAULT_CHARACTER_PREFERENCES: CharacterPreferences = {
  gender: "androgynous",
  ageRange: "young_adult",
  build: "average",
  hairStyle: "spiky medium",
  hairColor: "black",
  outfitStyle: "urban traveler",
  personality: "berani, cepat beradaptasi, hangat",
  accessories: "tas kecil dan gelang",
  specialTraits: "mata tajam, ekspresi energik",
};

export const DEFAULT_GENERATION_PREFERENCES: GenerationPreferences = {
  visualMode: "manga_bw",
  panelLayout: "dynamic_action",
  detailLevel: "high",
};

export function ensureCharacterPreferences(
  value?: Partial<CharacterPreferences> | null,
): CharacterPreferences {
  return {
    gender: value?.gender ?? DEFAULT_CHARACTER_PREFERENCES.gender,
    ageRange: value?.ageRange ?? DEFAULT_CHARACTER_PREFERENCES.ageRange,
    build: value?.build ?? DEFAULT_CHARACTER_PREFERENCES.build,
    hairStyle:
      value?.hairStyle?.trim() ||
      DEFAULT_CHARACTER_PREFERENCES.hairStyle,
    hairColor:
      value?.hairColor?.trim() ||
      DEFAULT_CHARACTER_PREFERENCES.hairColor,
    outfitStyle:
      value?.outfitStyle?.trim() ||
      DEFAULT_CHARACTER_PREFERENCES.outfitStyle,
    personality:
      value?.personality?.trim() ||
      DEFAULT_CHARACTER_PREFERENCES.personality,
    accessories:
      value?.accessories?.trim() ||
      DEFAULT_CHARACTER_PREFERENCES.accessories,
    specialTraits:
      value?.specialTraits?.trim() ||
      DEFAULT_CHARACTER_PREFERENCES.specialTraits,
  };
}

export function ensureGenerationPreferences(
  value?: Partial<GenerationPreferences> | null,
): GenerationPreferences {
  return {
    visualMode: value?.visualMode ?? DEFAULT_GENERATION_PREFERENCES.visualMode,
    panelLayout: value?.panelLayout ?? DEFAULT_GENERATION_PREFERENCES.panelLayout,
    detailLevel: value?.detailLevel ?? DEFAULT_GENERATION_PREFERENCES.detailLevel,
  };
}
