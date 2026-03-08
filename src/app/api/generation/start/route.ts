import { ensureStoryGraph, getCurrentDecision } from "@/features/manga/story-orchestrator";
import { generationStartSchema } from "@/features/manga/validators";
import { errorResponse, jsonResponse } from "@/lib/http";
import { createGenerationJob, getSession } from "@/lib/runtime-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = generationStartSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Input tidak valid", 400);
  }

  const session = getSession(parsed.data.sessionId);
  if (!session) {
    return errorResponse("Session tidak ditemukan", 404);
  }

  try {
    await ensureStoryGraph(session.id);
    const refreshed = getSession(session.id);
    if (!refreshed) {
      return errorResponse("Session tidak ditemukan", 404);
    }

    const pendingDecision = getCurrentDecision(refreshed);
    if (pendingDecision) {
      return errorResponse("Semua pilihan cerita harus diselesaikan dulu", 400);
    }

    const { runGenerationJob } = await import("@/features/manga/generation-orchestrator");
    const job = createGenerationJob(session.id);
    void runGenerationJob(job.id);

    return jsonResponse({ jobId: job.id });
  } catch (error) {
    console.error("[generation/start] failed", error);
    return errorResponse(
      error instanceof Error ? error.message : "Gagal memulai proses generate",
      500,
    );
  }
}
