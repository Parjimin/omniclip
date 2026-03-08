"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createRamadanDinoModule } from "@/features/ramadan-dino";
import { RamadanDinoPublicApi } from "@/features/ramadan-dino/types";

type ProgressPayload = {
  status: string;
  progress: {
    value: number;
    stage: string;
    message: string;
  };
};

type ResultPayload = {
  status: string;
  progress?: {
    value: number;
    stage: string;
    message: string;
  };
  renderedPanelCount?: number;
  panelTargetCount?: number;
  error?: string;
};

function hasAllPanelsRendered(payload: ResultPayload): boolean {
  const target = payload.panelTargetCount ?? 0;
  const rendered = payload.renderedPanelCount ?? 0;
  return target > 0 && rendered >= target;
}

function confirmedPanelProgress(done: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  const boundedDone = Math.max(0, Math.min(done, total));
  return (boundedDone / total) * 100;
}

function renderingSegmentCap(done: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  if (done >= total) {
    return 100;
  }
  if (done === total - 1) {
    return 98;
  }

  const nextBoundary = ((done + 1) / total) * 100;
  const gap = Math.max(1.4, Math.min(4, 12 / total));
  return Math.max(confirmedPanelProgress(done, total), nextBoundary - gap);
}

function estimateRenderingProgress(done: number, total: number, elapsedMs: number): number {
  if (total <= 0) {
    return 0;
  }

  const confirmed = confirmedPanelProgress(done, total);
  if (done >= total) {
    return 100;
  }

  const cap = renderingSegmentCap(done, total);
  const expectedMs = 95_000;
  const phase = Math.max(0, Math.min(1, elapsedMs / expectedMs));
  const eased = 1 - Math.pow(1 - phase, 2.25);
  const wave =
    phase >= 0.96
      ? 0
      : Math.sin(elapsedMs / 1700 + done * 0.9) * 0.55 +
        Math.sin(elapsedMs / 5200 + total * 0.3) * 0.3;

  return Math.min(cap, Math.max(confirmed, confirmed + (cap - confirmed) * eased + wave));
}

export default function GeneratePage() {
  const router = useRouter();
  const params = useParams<{ jobId: string }>();
  const jobId = params.jobId;

  const gameContainerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<RamadanDinoPublicApi | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const doneRef = useRef(false);
  const stageEnteredAtRef = useRef(Date.now());
  const lastPanelDoneRef = useRef(0);
  const panelTimerStartedAtRef = useRef(Date.now());

  const [score, setScore] = useState(0);
  const [serverProgress, setServerProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [stage, setStage] = useState("queued");
  const [message, setMessage] = useState("Menunggu job...");
  const [isDone, setIsDone] = useState(false);
  const [panelCountDone, setPanelCountDone] = useState(0);
  const [panelCountTotal, setPanelCountTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const effectiveStage = useMemo(() => {
    if (panelCountTotal > 0 && !isDone && stage !== "done" && stage !== "error") {
      return "rendering";
    }
    return stage;
  }, [panelCountTotal, isDone, stage]);

  const progressLabel = useMemo(() => {
    if (panelCountTotal > 0) {
      return displayProgress.toFixed(1);
    }
    return `${Math.round(displayProgress)}`;
  }, [displayProgress, panelCountTotal]);

  const statusLabel = useMemo(
    () =>
      `${progressLabel}% • ${effectiveStage}${
        panelCountTotal ? ` • panel ${panelCountDone}/${panelCountTotal}` : ""
      }`,
    [progressLabel, effectiveStage, panelCountDone, panelCountTotal],
  );

  useEffect(() => {
    stageEnteredAtRef.current = Date.now();
    if (effectiveStage === "rendering") {
      panelTimerStartedAtRef.current = Date.now();
      lastPanelDoneRef.current = 0;
    }
  }, [effectiveStage]);

  useEffect(() => {
    if (effectiveStage !== "rendering") {
      return;
    }
    if (panelCountDone !== lastPanelDoneRef.current) {
      lastPanelDoneRef.current = panelCountDone;
      panelTimerStartedAtRef.current = Date.now();
    }
  }, [panelCountDone, effectiveStage]);

  useEffect(() => {
    const interval = setInterval(() => {
      const stageElapsedSec = (Date.now() - stageEnteredAtRef.current) / 1000;
      let target = serverProgress;
      const panelElapsedMs = Date.now() - panelTimerStartedAtRef.current;
      const confirmedByPanel =
        panelCountTotal > 0 ? confirmedPanelProgress(panelCountDone, panelCountTotal) : 0;

      if (!isDone) {
        if (confirmedByPanel > 0) {
          target = Math.max(target, confirmedByPanel);
        }

        if (effectiveStage === "queued") {
          target = Math.max(target, Math.min(3, stageElapsedSec * 0.6));
        } else if (effectiveStage === "preprocess") {
          target = Math.max(target, Math.min(10, 3 + stageElapsedSec * 1.1));
        } else if (effectiveStage === "drafting") {
          target = Math.max(target, Math.min(30, 10 + stageElapsedSec * 1.2));
        } else if (effectiveStage === "rendering") {
          if (panelCountTotal > 0) {
            target = Math.max(
              target,
              estimateRenderingProgress(panelCountDone, panelCountTotal, panelElapsedMs),
            );
          } else {
            target = Math.max(target, Math.min(40, 30 + stageElapsedSec * 0.8));
          }
        } else if (effectiveStage === "packaging") {
          target = Math.max(target, 99);
        } else if (effectiveStage === "done") {
          target = 100;
        }
      } else {
        target = 100;
      }

      setDisplayProgress((current) => {
        if (effectiveStage === "rendering" && panelCountTotal > 0) {
          const confirmed = confirmedPanelProgress(panelCountDone, panelCountTotal);
          if (current < confirmed) {
            const boost = Math.max(1.4, (confirmed - current) * 0.34);
            return Math.min(confirmed, current + boost);
          }
          if (target <= current) {
            return current;
          }
          const delta = target - current;
          const wave = Math.abs(Math.sin(Date.now() / 650 + current / 11));
          const step = Math.max(0.12, Math.min(1.15, delta * (0.14 + wave * 0.1)));
          return Math.min(target, current + step);
        }
        if (target <= current) {
          return current;
        }
        const delta = target - current;
        const step = delta > 20 ? 2.2 : delta > 8 ? 1.3 : 0.45;
        return Math.min(target, current + step);
      });
    }, 180);

    return () => clearInterval(interval);
  }, [serverProgress, effectiveStage, panelCountDone, panelCountTotal, isDone]);

  useEffect(() => {
    if (!jobId || !gameContainerRef.current) {
      return;
    }

    const game = createRamadanDinoModule();
    game.init(gameContainerRef.current, {
      onScoreChange(next) {
        setScore(next);
      },
      onGameOver(finalScore) {
        setScore(finalScore);
      },
    });
    game.start();
    gameRef.current = game;

    const markFailed = (reason: string) => {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      setError(reason);
      setStage("error");
      setMessage(reason);
      game.stop("generation_failed");
      eventSourceRef.current?.close();
    };

    const finalizeSuccess = () => {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      setIsDone(true);
      setStage("done");
      setServerProgress(100);
      setDisplayProgress((prev) => Math.max(prev, 100));
      const finalScore = game.getScore();
      setScore(finalScore);
      game.stop("generation_complete");
      eventSourceRef.current?.close();
      setTimeout(() => {
        router.push(`/result/${jobId}?score=${finalScore}`);
      }, 900);
    };

    const redirectToResultAfterPanelComplete = () => {
      if (doneRef.current) {
        return;
      }
      doneRef.current = true;
      const finalScore = game.getScore();
      setScore(finalScore);
      game.stop("generation_complete");
      eventSourceRef.current?.close();
      router.push(`/result/${jobId}?score=${finalScore}`);
    };

    const eventSource = new EventSource(`/api/generation/stream/${jobId}`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("snapshot", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as ProgressPayload;
      setServerProgress(payload.progress.value);
      setStage(payload.progress.stage);
      setMessage(payload.progress.message);
    });

    eventSource.addEventListener("progress", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as ProgressPayload;
      setServerProgress(payload.progress.value);
      setStage(payload.progress.stage);
      setMessage(payload.progress.message);
    });

    eventSource.addEventListener("panel_done", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as {
        panelIndex: number;
        total: number;
      };
      setPanelCountDone(payload.panelIndex);
      setPanelCountTotal(payload.total);
    });

    eventSource.addEventListener("completed", () => {
      finalizeSuccess();
    });

    eventSource.addEventListener("failed", (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as { error?: string };
      markFailed(payload.error ?? "Generation gagal");
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    const pollInterval = setInterval(async () => {
      if (doneRef.current) {
        return;
      }
      try {
        const response = await fetch(`/api/generation/result/${jobId}`);
        const payload = (await response.json()) as ResultPayload;
        if (payload.progress) {
          setServerProgress(payload.progress.value);
          setStage(payload.progress.stage);
          setMessage(payload.progress.message);
        }
        if ((payload.panelTargetCount ?? 0) > 0) {
          setPanelCountTotal(payload.panelTargetCount ?? 0);
          setPanelCountDone(payload.renderedPanelCount ?? 0);
          if (payload.status !== "done" && payload.status !== "error") {
            setMessage(`Render panel ${payload.renderedPanelCount ?? 0}/${payload.panelTargetCount ?? 0}`);
          }
          if (hasAllPanelsRendered(payload)) {
            setServerProgress(100);
            setDisplayProgress(100);
          }
        }
        if (payload.status === "done") {
          finalizeSuccess();
        } else if (payload.status === "error") {
          markFailed(payload.error ?? "Generation gagal");
        } else if (hasAllPanelsRendered(payload)) {
          redirectToResultAfterPanelComplete();
        }
      } catch {
        // Ignore temporary polling issues.
      }
    }, 1200);

    return () => {
      clearInterval(pollInterval);
      eventSource.close();
      game.stop("navigation");
    };
  }, [jobId, router]);

  return (
    <main className="page-shell">
      <header className="page-header">
        <h1 className="page-title">Manga Sedang Dibuat</h1>
        <p className="page-subtitle">
          Progress estimasi menyesuaikan jumlah panel. Sambil nunggu, main Ramadan Dino di bawah.
        </p>
      </header>

      <section className="surface section-stack">
        <p style={{ marginTop: 0 }}>{message}</p>
        <div className="progress-wrap">
          <div className="progress-bar" style={{ width: `${displayProgress}%` }} />
        </div>
        <p className="text-muted" style={{ marginBottom: 0 }}>
          {statusLabel}
        </p>
      </section>

      {error && <div className="alert error">{error}</div>}
      {isDone && <div className="alert ok">Semua panel selesai. Mengalihkan ke halaman hasil...</div>}

      <section className="surface section-stack">
        <p style={{ marginTop: 0 }}>
          <strong>Ramadan Dino Mini-Game</strong> • Score: {score}
        </p>
        <div ref={gameContainerRef} />
      </section>
    </main>
  );
}
