import { applyChoice } from "@/features/manga/story-orchestrator";
import { storyChoiceSchema } from "@/features/manga/validators";
import { errorResponse, jsonResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = storyChoiceSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  try {
    const result = applyChoice(parsed.data);
    return jsonResponse(result);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Gagal menyimpan pilihan",
      400,
    );
  }
}
