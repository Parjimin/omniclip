import path from "node:path";
import { createSession, updateSession } from "@/lib/runtime-store";
import { errorResponse, jsonResponse } from "@/lib/http";
import { saveBinaryFile, sessionDir } from "@/lib/storage";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_SIZE,
  sessionCreateSchema,
} from "@/features/manga/validators";

export const runtime = "nodejs";

const extensionByMime: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

function readOptionalText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = sessionCreateSchema.safeParse({
    name: formData.get("name"),
    theme: formData.get("theme"),
    artStyle: formData.get("artStyle"),
    panelCount: formData.get("panelCount"),
    promptAddon: readOptionalText(formData, "promptAddon"),
    characterPreferences: {
      gender: formData.get("characterGender") ?? undefined,
      ageRange: formData.get("characterAgeRange") ?? undefined,
      build: formData.get("characterBuild") ?? undefined,
      hairStyle: readOptionalText(formData, "characterHairStyle"),
      hairColor: readOptionalText(formData, "characterHairColor"),
      outfitStyle: readOptionalText(formData, "characterOutfitStyle"),
      personality: readOptionalText(formData, "characterPersonality"),
      accessories: readOptionalText(formData, "characterAccessories"),
      specialTraits: readOptionalText(formData, "characterSpecialTraits"),
    },
    generationPreferences: {
      visualMode: formData.get("visualMode") ?? undefined,
      panelLayout: formData.get("panelLayout") ?? undefined,
      detailLevel: formData.get("detailLevel") ?? undefined,
    },
  });

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const session = createSession(parsed.data);
  const photo = formData.get("photo");

  if (photo instanceof File && photo.size > 0) {
    if (!ACCEPTED_PHOTO_TYPES.includes(photo.type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
      return errorResponse("Format foto harus PNG/JPG/WEBP", 400);
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return errorResponse("Ukuran foto maksimal 8MB", 400);
    }

    const extension = extensionByMime[photo.type] ?? ".png";
    const outputPath = path.join(sessionDir(session.id), `photo${extension}`);
    const bytes = new Uint8Array(await photo.arrayBuffer());
    await saveBinaryFile(outputPath, bytes);

    updateSession(session.id, {
      photoPath: outputPath,
      photoMimeType: photo.type,
    });
  }

  return jsonResponse({
    sessionId: session.id,
  });
}
