"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import AnimatedDownloadButton from "@/components/ui/download-hover-button";

type GenerationResultPayload = {
  status: string;
  progress?: {
    value: number;
    stage: string;
    message: string;
  };
  error?: string;
  result?: {
    finalOutline: string;
    previewSheetUrl: string;
    pdfUrl: string;
    zipUrl: string;
    panels: Array<{
      index: number;
      fileName: string;
      downloadUrl: string;
    }>;
    panelPlans: Array<{
      index: number;
      readingOrder: "right_to_left";
      cellPlan: Array<{
        cellId: string;
        dialogue: string;
        bubble?: {
          x: number;
          y: number;
          align: "left" | "right" | "center";
        };
      }>;
    }>;
  };
};

export default function ResultPage() {
  const params = useParams<{ jobId: string }>();
  const searchParams = useSearchParams();
  const jobId = params.jobId;
  const score = Number(searchParams.get("score") ?? "0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<GenerationResultPayload | null>(null);

  useEffect(() => {
    let mounted = true;

    const poll = async () => {
      while (mounted) {
        const response = await fetch(`/api/generation/result/${jobId}`);
        const data = (await response.json()) as GenerationResultPayload;
        setPayload(data);

        if (data.status === "done") {
          setLoading(false);
          return;
        }
        if (data.status === "error") {
          setError(data.error ?? "Generation gagal");
          setLoading(false);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    };

    void poll().catch((pollError) => {
      setError(pollError instanceof Error ? pollError.message : "Gagal memuat hasil");
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [jobId]);

  const panelCount = useMemo(() => payload?.result?.panels.length ?? 0, [payload]);
  if (loading) {
    return (
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">Menunggu Hasil Akhir...</h1>
          <p className="page-subtitle">
            Status: {payload?.progress?.message ?? "Loading"} ({payload?.progress?.value ?? 0}%)
          </p>
        </header>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">Terjadi Error</h1>
        </header>
        <div className="alert error">{error}</div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <h1 className="page-title">Hasil OmniClip</h1>
        <p className="page-subtitle">
          Total panel: <span className="chip">{panelCount}</span> • Skor Mini-Game:{" "}
          <span className="chip">{score}</span>
        </p>
      </header>

      <section className="surface section-stack">
        <strong>Outline Final</strong>
        <p>{payload?.result?.finalOutline}</p>
      </section>

      <section className="surface manga-viewer section-stack">
        <strong>Viewer</strong>
        <div className="manga-strip">
          {payload?.result?.panels.map((panel) => (
            <div className="manga-page" key={panel.index}>
              <Image
                src={panel.downloadUrl}
                alt={`Panel ${panel.index}`}
                width={1024}
                height={1536}
                unoptimized
                loading="lazy"
              />
              <div className="manga-page-meta">
                <span>Panel {panel.index}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface section-stack">
        <strong>Download</strong>
        <div className="download-hover-row">
          <AnimatedDownloadButton href={payload?.result?.pdfUrl} label="Download PDF" />
          <AnimatedDownloadButton href={payload?.result?.zipUrl} label="Download ZIP" />
        </div>
      </section>
    </main>
  );
}
