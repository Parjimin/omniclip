import path from "node:path";
import { downloadQuerySchema } from "@/features/manga/validators";
import { errorResponse } from "@/lib/http";
import { getGenerationJob } from "@/lib/runtime-store";
import { jobDir, readBinaryFile } from "@/lib/storage";
import { isPathWithin, sanitizeFilename } from "@/lib/security";

export const runtime = "nodejs";

function attachmentHeaders(fileName: string, contentType: string) {
  const safe = sanitizeFilename(fileName);
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${safe}"`,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const job = getGenerationJob(jobId);
  if (!job) {
    return errorResponse("Job tidak ditemukan", 404);
  }

  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { getSession } = await import("@/lib/runtime-store");
  const session = getSession(job.sessionId);
  if (!session || session.userId !== userId) {
    return errorResponse("Forbidden: You do not own this job", 403);
  }
  if (job.status !== "done" || !job.result) {
    return errorResponse("Hasil belum siap", 409);
  }

  const url = new URL(request.url);
  const parsed = downloadQuerySchema.safeParse({
    format: url.searchParams.get("format"),
    index: url.searchParams.get("index"),
  });
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Query download tidak valid", 400);
  }

  const rootDir = jobDir(jobId);

  try {
    if (parsed.data.format === "pdf") {
      const filePath = path.join(rootDir, "exports", "omniclip-export.pdf");
      if (!isPathWithin(filePath, rootDir)) {
        return errorResponse("Path tidak valid", 403);
      }
      const data = await readBinaryFile(filePath);
      return new Response(new Uint8Array(data), {
        headers: attachmentHeaders("omniclip-export.pdf", "application/pdf"),
      });
    }

    if (parsed.data.format === "zip") {
      const filePath = path.join(rootDir, "exports", "omniclip-export.zip");
      if (!isPathWithin(filePath, rootDir)) {
        return errorResponse("Path tidak valid", 403);
      }
      const data = await readBinaryFile(filePath);
      return new Response(new Uint8Array(data), {
        headers: attachmentHeaders("omniclip-export.zip", "application/zip"),
      });
    }

    const panelIndex = parsed.data.index;
    if (!panelIndex) {
      return errorResponse("index panel wajib diisi untuk format panel", 400);
    }

    const panel = job.result.panels.find((item) => item.index === panelIndex);
    if (!panel) {
      return errorResponse("Panel tidak ditemukan", 404);
    }

    // Path traversal protection: ensure panel.path is within job directory
    if (!isPathWithin(panel.path, rootDir)) {
      return errorResponse("Path panel tidak valid", 403);
    }

    const data = await readBinaryFile(panel.path);
    return new Response(new Uint8Array(data), {
      headers: attachmentHeaders(panel.fileName, panel.mimeType),
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : "Gagal membaca file hasil",
      500,
    );
  }
}

