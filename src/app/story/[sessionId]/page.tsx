"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { GlowButton } from "@/components/ui/glow-button";

const STORY_GRAPH_REQUEST_TIMEOUT_MS = 90_000;
const STORY_GRAPH_MAX_WAIT_MS = 180_000;
const STORY_GRAPH_RETRY_DELAY_MS = 2_500;

type StoryChoiceOption = { title: string; consequence: string };
type StoryDecision = {
  id: string;
  step: number;
  left: StoryChoiceOption;
  right: StoryChoiceOption;
};

type StoryGraphResponse = {
  draftOutline: string;
  decisionPoints: StoryDecision[];
  currentDecision?: StoryDecision;
  selectedChoices: Record<string, "left" | "right">;
  isComplete: boolean;
};

type StoryChooseResponse = {
  nextDecision?: StoryDecision;
  isComplete: boolean;
  selectedChoices: Record<string, "left" | "right">;
  error?: string;
};

type GenerationStartResponse = {
  jobId: string;
  error?: string;
};

async function readApiPayload<T>(response: Response): Promise<T | { error?: string } | null> {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T | { error?: string };
  } catch {
    const trimmed = raw.trim();
    if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
      return {
        error: "Server mengembalikan error HTML, bukan JSON. Cek log backend route terkait.",
      };
    }
    return {
      error: trimmed.slice(0, 300),
    };
  }
}

export default function StoryChoicePage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StoryGraphResponse | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

    const run = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      const startedAt = Date.now();

      while (!cancelled) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), STORY_GRAPH_REQUEST_TIMEOUT_MS);

        try {
          const response = await fetch("/api/story/graph", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({ sessionId }),
            signal: controller.signal,
          });

          const payload = (await response.json().catch(() => null)) as
            | (StoryGraphResponse & { error?: string })
            | null;

          if (!response.ok) {
            const message = payload?.error ?? "Gagal memuat story graph";
            if (response.status >= 500) {
              throw new Error(message);
            }

            if (!cancelled) {
              setError(message);
              setLoading(false);
            }
            return;
          }

          if (!cancelled) {
            setData(payload as StoryGraphResponse);
            setError(null);
            setLoading(false);
          }
          return;
        } catch (loadError) {
          clearTimeout(timeout);
          const elapsedMs = Date.now() - startedAt;
          const isAbort =
            loadError instanceof Error && loadError.name === "AbortError";
          const nextMessage = isAbort
            ? "Penyusunan alur masih berjalan. Sistem sedang menunggu hasil model."
            : loadError instanceof Error
              ? loadError.message
              : "Gagal memuat story graph";

          if (elapsedMs >= STORY_GRAPH_MAX_WAIT_MS) {
            if (!cancelled) {
              setError(
                `${nextMessage} Coba tekan muat ulang untuk lanjut ambil hasil yang mungkin sudah selesai di server.`,
              );
              setLoading(false);
            }
            return;
          }

          if (!cancelled) {
            setError(nextMessage);
          }
          await sleep(STORY_GRAPH_RETRY_DELAY_MS);
          continue;
        } finally {
          clearTimeout(timeout);
        }
      }
    };

    if (sessionId) {
      void run();
    }

    return () => {
      cancelled = true;
    };
  }, [sessionId, reloadToken]);

  const progressLabel = useMemo(() => {
    if (!data) {
      return "0/0";
    }
    const selected = Object.keys(data.selectedChoices).length;
    return `${selected}/${data.decisionPoints.length}`;
  }, [data]);

  const onChoose = async (choice: "left" | "right") => {
    if (!data?.currentDecision) {
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/story/choose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          decisionId: data.currentDecision.id,
          choice,
        }),
      });
      const payload = await readApiPayload<StoryChooseResponse>(response);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Gagal simpan pilihan");
      }
      if (!payload || !("selectedChoices" in payload) || !("isComplete" in payload)) {
        throw new Error("Respons story choice tidak valid");
      }

      setData((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          currentDecision: payload.nextDecision,
          isComplete: payload.isComplete,
          selectedChoices: payload.selectedChoices,
        };
      });
    } catch (chooseError) {
      setError(chooseError instanceof Error ? chooseError.message : "Gagal menyimpan pilihan");
    } finally {
      setSubmitting(false);
    }
  };

  const onStartGeneration = async () => {
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/generation/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId }),
      });
      const payload = await readApiPayload<GenerationStartResponse>(response);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Gagal memulai generation");
      }
      if (!payload || !("jobId" in payload) || !payload.jobId) {
        throw new Error("Respons generation start tidak valid");
      }
      router.push(`/generate/${payload.jobId}`);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Gagal memulai generation");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <section className="surface story-loading-shell">
          <div className="story-loading-header">
            <h1>Menyusun Alur Cerita...</h1>
            <p>Model sedang merangkai cabang cerita. Halaman ini tidak freeze.</p>
          </div>

          <div className="loading-row">
            <span className="loading-spinner" />
            <div>
              <strong>Story graph sedang diproses</strong>
              <p className="text-muted" style={{ margin: "4px 0 0" }}>
                Estimasi 10-120 detik tergantung antrean model.
              </p>
            </div>
          </div>

          {error ? (
            <div className="alert error" style={{ marginBottom: 14 }}>
              {error}
            </div>
          ) : null}

          <div className="loading-track">
            <div className="loading-indeterminate" />
          </div>

          <div className="loading-skeleton">
            <div className="loading-skeleton-line" style={{ width: "98%" }} />
            <div className="loading-skeleton-line" style={{ width: "92%" }} />
            <div className="loading-skeleton-line" style={{ width: "86%" }} />
          </div>

          <ul className="loading-steps">
            <li>Merangkai outline utama</li>
            <li>Membuat opsi kiri/kanan tiap decision</li>
            <li>Menjaga kesinambungan panel awal sampai akhir</li>
          </ul>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page-shell">
        <header className="page-header">
          <h1 className="page-title">Pilih Jalur Cerita</h1>
          <p className="page-subtitle">
            Story graph belum siap. Halaman ini tidak akan melanjutkan ke tahap berikutnya sebelum
            alur berhasil dimuat.
          </p>
        </header>
        {error ? <div className="alert error">{error}</div> : null}
        <section className="surface empty-state-panel">
          <h2>Alur Belum Berhasil Dimuat</h2>
          <p>
            Coba ambil ulang hasil story graph yang sedang atau sudah diproses di server.
          </p>
          <div className="inline-actions">
            <GlowButton
              tone="action"
              onClick={() => {
                setReloadToken((value) => value + 1);
              }}
            >
              Muat Ulang Alur
            </GlowButton>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <h1 className="page-title">Pilih Jalur Cerita</h1>
        <p className="page-subtitle">
          Setiap pilihan mengubah kelanjutan alur cerita. Progress decision:{" "}
          <span className="chip">{progressLabel}</span>
        </p>
      </header>

      <section className="surface section-stack">
        <strong>Ringkasan Alur Saat Ini</strong>
        <p>{data?.draftOutline}</p>
      </section>

      {error && <div className="alert error">{error}</div>}

      {!data?.isComplete && data?.currentDecision ? (
        <section className="surface section-stack">
          <p>
            <strong>Decision #{data.currentDecision.step}</strong>
          </p>
          <div className="choice-grid">
            <article className="card-choice">
              <div>
                <h3>Kiri: {data.currentDecision.left.title}</h3>
                <p>{data.currentDecision.left.consequence}</p>
              </div>
              <GlowButton disabled={submitting} onClick={() => void onChoose("left")} tone="action">
                Pilih Kiri
              </GlowButton>
            </article>

            <article className="card-choice">
              <div>
                <h3>Kanan: {data.currentDecision.right.title}</h3>
                <p>{data.currentDecision.right.consequence}</p>
              </div>
              <GlowButton
                disabled={submitting}
                onClick={() => void onChoose("right")}
                tone="action"
              >
                Pilih Kanan
              </GlowButton>
            </article>
          </div>
        </section>
      ) : (
        <section className="surface section-stack empty-state-panel">
          <h2>Semua Pilihan Selesai</h2>
          <p>Klik tombol berikut untuk mulai render output OmniClip.</p>
          <div className="inline-actions">
            <GlowButton disabled={starting} onClick={() => void onStartGeneration()} tone="action">
              {starting ? "Memulai..." : "Mulai Generate Panel"}
            </GlowButton>
          </div>
        </section>
      )}
    </main>
  );
}
