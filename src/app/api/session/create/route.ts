import path from "node:path";
import sharp from "sharp";
import { createSession, updateSession } from "@/lib/runtime-store";
import { errorResponse, jsonResponse } from "@/lib/http";
import { saveBinaryFile, sessionDir } from "@/lib/storage";
import {
  ACCEPTED_PHOTO_TYPES,
  MAX_PHOTO_SIZE,
  sessionCreateSchema,
} from "@/features/manga/validators";
import { checkRateLimit, getClientIp, isValidOrigin } from "@/lib/security";

export const runtime = "nodejs";

const extensionByMime: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const SHARP_VALID_FORMATS = new Set(["png", "jpeg", "webp"]);

function readOptionalText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return errorResponse("Origin tidak valid", 403);
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit(`session-create:${ip}`, 20, 600_000);
  if (!limit.allowed) {
    return errorResponse(
      `Terlalu banyak request. Coba lagi dalam ${Math.ceil(limit.retryAfterMs / 1000)} detik.`,
      429,
    );
  }

  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

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

  const session = createSession(userId, parsed.data);
  const photo = formData.get("photo");

  if (photo instanceof File && photo.size > 0) {
    if (!ACCEPTED_PHOTO_TYPES.includes(photo.type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
      return errorResponse("Format foto harus PNG/JPG/WEBP", 400);
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return errorResponse("Ukuran foto maksimal 8MB", 400);
    }

    const bytes = new Uint8Array(await photo.arrayBuffer());

    // Validate actual image content using sharp (don't trust client MIME type)
    try {
      const metadata = await sharp(bytes).metadata();
      if (!metadata.format || !SHARP_VALID_FORMATS.has(metadata.format)) {
        return errorResponse("File bukan gambar yang valid (PNG/JPG/WEBP)", 400);
      }
    } catch {
      return errorResponse("File bukan gambar yang valid", 400);
    }

    const extension = extensionByMime[photo.type] ?? ".png";
    const outputPath = path.join(sessionDir(session.id), `photo${extension}`);
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

