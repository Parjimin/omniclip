import path from "node:path";
import { compilePanelSpecs, ensureStoryGraph, getCurrentDecision } from "./story-orchestrator";
import { renderPanels } from "./image-orchestrator";
import { buildPanelsPdf } from "./pdf-export";
import { buildPanelsZip } from "./zip-export";
import { clampProgress, panelRenderingProgress } from "./progress-tracker";
import { humanizeAiError } from "@/lib/ai/error-map";
import {
  appendJobEvent,
  appendJobLog,
  getGenerationJob,
  getSession,
  setJobProgress,
  updateGenerationJob,
} from "@/lib/runtime-store";
import { jobDir, saveBinaryFile } from "@/lib/storage";

export async function runGenerationJob(jobId: string) {
  const job = getGenerationJob(jobId);
  if (!job) {
    throw new Error("Job tidak ditemukan");
  }

  const session = getSession(job.sessionId);
  if (!session) {
    throw new Error("Session untuk job tidak ditemukan");
  }

  try {
    setJobProgress(
      jobId,
      {
        value: 4,
        stage: "preprocess",
        message: "Memvalidasi input dan memuat sesi",
      },
      "drafting",
    );

    await ensureStoryGraph(session.id);
    const refreshedSession = getSession(session.id);
    if (!refreshedSession?.storyGraph) {
      throw new Error("Story graph gagal disiapkan");
    }

    const pendingDecision = getCurrentDecision(refreshedSession);
    if (pendingDecision) {
      throw new Error("Masih ada decision yang belum dipilih user");
    }

    setJobProgress(
      jobId,
      {
        value: 14,
        stage: "drafting",
        message: "Menyusun outline final dan prompt panel",
      },
      "drafting",
    );

    let draftingProgress = 14;
    let draftingActive = true;
    const draftingHeartbeat = setInterval(() => {
      if (!draftingActive) {
        return;
      }
      const currentJob = getGenerationJob(jobId);
      if (!currentJob || currentJob.status !== "drafting") {
        return;
      }
      draftingProgress = Math.min(29, draftingProgress + 1);
      setJobProgress(
        jobId,
        {
          value: draftingProgress,
          stage: "drafting",
          message: "Drafting cerita dan prompt masih berjalan...",
        },
        "drafting",
      );
    }, 3500);

    const { finalOutline, panelSpecs } = await compilePanelSpecs(session.id).finally(() => {
      draftingActive = false;
      clearInterval(draftingHeartbeat);
    });

    const debugForceSinglePanel =
      (process.env.DEBUG_FORCE_SINGLE_PANEL ?? "false").toLowerCase() === "true";
    const effectivePanelSpecs = debugForceSinglePanel ? panelSpecs.slice(0, 1) : panelSpecs;
    updateGenerationJob(jobId, {
      panelTargetCount: effectivePanelSpecs.length,
    });
    if (debugForceSinglePanel) {
      appendJobLog(jobId, "DEBUG_FORCE_SINGLE_PANEL aktif: hanya render 1 panel");
    }

    setJobProgress(
      jobId,
      {
        value: clampProgress(panelRenderingProgress(0, effectivePanelSpecs.length)),
        stage: "rendering",
        message: `Mulai render panel 0/${effectivePanelSpecs.length}`,
      },
      "rendering",
    );
    appendJobEvent(jobId, "panel_done", {
      panelIndex: 0,
      total: effectivePanelSpecs.length,
    });

    const panelFiles = await renderPanels({
      session: refreshedSession,
      jobId,
      panelSpecs: effectivePanelSpecs,
      onPanelDone: ({ panelIndex, total }) => {
        const value = clampProgress(panelRenderingProgress(panelIndex, total));
        setJobProgress(
          jobId,
          {
            value,
            stage: "rendering",
            message: `Render panel ${panelIndex}/${total}`,
          },
          "rendering",
        );

        appendJobEvent(jobId, "panel_done", {
          panelIndex,
          total,
        });
      },
    });

    setJobProgress(
      jobId,
      {
        value: 100,
        stage: "packaging",
        message: "Menyusun PDF dan ZIP",
      },
      "packaging",
    );

    const zipBytes = await buildPanelsZip({
      files: panelFiles.map((panel) => ({
        fileName: panel.fileName,
        data: panel.data,
      })),
    });

    const pdfBytes = await buildPanelsPdf({
      files: panelFiles.map((panel) => ({
        fileName: panel.fileName,
        data: panel.data,
      })),
    });

    const exportsDir = path.join(jobDir(jobId), "exports");
    const zipPath = path.join(exportsDir, "omniclip-export.zip");
    const pdfPath = path.join(exportsDir, "omniclip-export.pdf");
    await saveBinaryFile(zipPath, zipBytes);
    await saveBinaryFile(pdfPath, pdfBytes);

    const panels = panelFiles.map((panel) => ({
      index: panel.index,
      fileName: panel.fileName,
      mimeType: "image/png",
      path: panel.path,
      downloadUrl: `/api/generation/download/${jobId}?format=panel&index=${panel.index}`,
    }));

    const result = {
      jobId,
      panels,
      panelPlans: effectivePanelSpecs.map((panel) => ({
        index: panel.index,
        templateId: panel.templateId,
        layoutGuide: panel.layoutGuide,
        readingOrder: panel.readingOrder,
        cellPlan: panel.cellPlan,
      })),
      previewSheetUrl:
        panels[0]?.downloadUrl ?? `/api/generation/download/${jobId}?format=panel&index=1`,
      pdfUrl: `/api/generation/download/${jobId}?format=pdf`,
      zipUrl: `/api/generation/download/${jobId}?format=zip`,
      finalOutline,
    };

    updateGenerationJob(jobId, {
      status: "done",
      progress: {
        value: 100,
        stage: "done",
        message: "Semua panel selesai dibuat",
      },
      result,
      error: undefined,
    });

    appendJobEvent(jobId, "completed", result);
    appendJobLog(jobId, "Selesai generate semua output");
  } catch (error) {
    const message = humanizeAiError(error);
    updateGenerationJob(jobId, {
      status: "error",
      progress: {
        value: 100,
        stage: "error",
        message,
      },
      error: message,
    });
    appendJobLog(jobId, `Error: ${message}`);
    appendJobEvent(jobId, "failed", { error: message });
  }
}
