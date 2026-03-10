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

  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { getSession } = await import("@/lib/runtime-store");
  const session = getSession(parsed.data.sessionId);
  if (!session || session.userId !== userId) {
    return errorResponse("Session tidak ditemukan atau akses ditolak", 403);
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
