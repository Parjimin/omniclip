import { z } from "zod";
import {
  DEFAULT_CHARACTER_PREFERENCES,
  DEFAULT_GENERATION_PREFERENCES,
} from "./types";

export const sessionCreateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  theme: z.enum(["mudik_ramadhan", "petualangan"]),
  artStyle: z.enum([
    "jujutsu_kaisen",
    "one_piece",
    "naruto",
    "bleach",
    "demon_slayer",
  ]),
  panelCount: z.coerce.number().int().min(4).max(20),
  promptAddon: z.string().trim().max(4000).optional(),
  characterPreferences: z
    .object({
      gender: z.enum(["male", "female", "androgynous"]).default("androgynous"),
      ageRange: z.enum(["teen", "young_adult", "adult"]).default("young_adult"),
      build: z.enum(["slim", "average", "athletic"]).default("average"),
      hairStyle: z.string().trim().min(2).max(80).default("spiky medium"),
      hairColor: z.string().trim().min(2).max(60).default("black"),
      outfitStyle: z.string().trim().min(2).max(100).default("urban traveler"),
      personality: z
        .string()
        .trim()
        .min(2)
        .max(180)
        .default("berani, cepat beradaptasi, hangat"),
      accessories: z.string().trim().min(2).max(140).default("tas kecil dan gelang"),
      specialTraits: z.string().trim().min(2).max(140).default("mata tajam, ekspresi energik"),
    })
    .default(DEFAULT_CHARACTER_PREFERENCES),
  generationPreferences: z
    .object({
      visualMode: z.enum(["manga_bw", "anime_color"]).default("manga_bw"),
      panelLayout: z
        .enum(["classic_grid", "dynamic_action", "cinematic_wide"])
        .default("dynamic_action"),
      detailLevel: z.enum(["standard", "high"]).default("high"),
    })
    .default(DEFAULT_GENERATION_PREFERENCES),
});

export const storyGraphRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

export const storyChoiceSchema = z.object({
  sessionId: z.string().uuid(),
  decisionId: z.string().min(1),
  choice: z.enum(["left", "right"]),
});

export const generationStartSchema = z.object({
  sessionId: z.string().uuid(),
});

const optionalDownloadIndexSchema = z.preprocess(
  (value) => (value == null || value === "" ? undefined : value),
  z.coerce.number().int().min(1).max(20).optional(),
);

export const downloadQuerySchema = z
  .object({
    format: z.enum(["pdf", "zip", "panel"]),
    index: optionalDownloadIndexSchema,
  })
  .superRefine((value, ctx) => {
    if (value.format === "panel" && value.index == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["index"],
        message: "index panel wajib diisi untuk format panel",
      });
    }
  });

export const MAX_PHOTO_SIZE = 8 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
