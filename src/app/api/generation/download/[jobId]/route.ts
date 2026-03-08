import path from "node:path";
import { downloadQuerySchema } from "@/features/manga/validators";
import { errorResponse } from "@/lib/http";
import { getGenerationJob } from "@/lib/runtime-store";
import { jobDir, readBinaryFile } from "@/lib/storage";

export const runtime = "nodejs";

function attachmentHeaders(fileName: string, contentType: string) {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename=\"${fileName}\"`,
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

  try {
    if (parsed.data.format === "pdf") {
      const filePath = path.join(jobDir(jobId), "exports", "omniclip-export.pdf");
      const data = await readBinaryFile(filePath);
      return new Response(new Uint8Array(data), {
        headers: attachmentHeaders("omniclip-export.pdf", "application/pdf"),
      });
    }

    if (parsed.data.format === "zip") {
      const filePath = path.join(jobDir(jobId), "exports", "omniclip-export.zip");
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
