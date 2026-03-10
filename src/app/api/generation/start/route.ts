import { ensureStoryGraph, getCurrentDecision } from "@/features/manga/story-orchestrator";
import { generationStartSchema } from "@/features/manga/validators";
import { errorResponse, jsonResponse } from "@/lib/http";
import { createGenerationJob, getSession } from "@/lib/runtime-store";
import { checkRateLimit, getClientIp, isValidOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return errorResponse("Origin tidak valid", 403);
  }

  const ip = getClientIp(request);
  const limit = checkRateLimit(`gen-start:${ip}`, 5, 600_000);
  if (!limit.allowed) {
    return errorResponse(
      `Terlalu banyak request. Coba lagi dalam ${Math.ceil(limit.retryAfterMs / 1000)} detik.`,
      429,
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = generationStartSchema.safeParse(payload);
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

