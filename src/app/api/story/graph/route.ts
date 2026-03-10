import { ensureStoryGraph, getCurrentDecision } from "@/features/manga/story-orchestrator";
import { storyGraphRequestSchema } from "@/features/manga/validators";
import { errorResponse, jsonResponse } from "@/lib/http";
import { getSession } from "@/lib/runtime-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = storyGraphRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const session = getSession(parsed.data.sessionId);
  if (!session) {
    return errorResponse("Session tidak ditemukan", 404);
  }

  if (session.userId !== userId) {
    return errorResponse("Forbidden: You do not own this session", 403);
  }

  try {
    const storyGraph = await ensureStoryGraph(session.id);
    const refreshed = getSession(session.id);
    if (!refreshed) {
      return errorResponse("Session tidak ditemukan", 404);
    }

    const currentDecision = getCurrentDecision(refreshed);

    return jsonResponse({
      draftOutline: storyGraph.draftOutline,
      decisionPoints: storyGraph.decisionPoints,
      currentDecision,
      selectedChoices: refreshed.selectedChoices,
      isComplete: !currentDecision,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Gagal generate story graph",
      500,
    );
  }
}
