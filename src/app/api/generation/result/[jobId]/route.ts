import { errorResponse, jsonResponse } from "@/lib/http";
import { getGenerationJob, getSession } from "@/lib/runtime-store";
import { jobDir } from "@/lib/storage";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

async function countRenderedPanels(jobId: string): Promise<number> {
  const panelsDir = path.join(jobDir(jobId), "panels");
  try {
    const files = await readdir(panelsDir, { withFileTypes: true });
    return files.filter((entry) => entry.isFile() && /\.png$/i.test(entry.name)).length;
  } catch {
    return 0;
  }
}

export async function GET(
  _: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getGenerationJob(jobId);

  if (!job) {
    return errorResponse("Job tidak ditemukan", 404);
  }

  const renderedPanelCount = await countRenderedPanels(jobId);
  const session = getSession(job.sessionId);
  const panelTargetCount = job.panelTargetCount ?? session?.panelCount ?? 0;

  return jsonResponse(
    {
      status: job.status,
      progress: job.progress,
      error: job.error,
      renderedPanelCount,
      panelTargetCount,
      result: job.result,
    },
    200,
  );
}
