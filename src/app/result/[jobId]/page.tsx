"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Download, FileText, CheckCircle2, BookOpen } from "lucide-react";
import AnimatedDownloadButton from "@/components/ui/download-hover-button";
import { DynamicMangaReader } from "@/components/manga/dynamic-manga-reader";

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
        const data = (await response.json()) as GenerationResultPayload & { error?: string };
        setPayload(data);

        if (!response.ok) {
          setError(data.error ?? `Server error (${response.status})`);
          setLoading(false);
          return;
        }
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
      <main className="min-h-screen flex flex-col items-center justify-center bg-transparent text-[#111216] p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-[#df6d2d]/15 rounded-full blur-[100px] animate-pulse"></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-md">
          <div className="w-16 h-16 border-4 border-[#df6d2d]/20 border-t-[#df6d2d] rounded-full animate-spin"></div>
          <h1 className="text-3xl font-serif">Menyusun Visual...</h1>
          <div className="w-full bg-black/5 rounded-full h-2 overflow-hidden border border-black/5">
            <div 
              className="bg-gradient-to-r from-[#df6d2d] to-[#ffca89] h-full transition-all duration-300"
              style={{ width: `${payload?.progress?.value ?? 0}%` }}
            ></div>
          </div>
          <p className="text-[#445a6b] text-sm tracking-wide">
            {payload?.progress?.message ?? "Menyiapkan engine rendering"} ({payload?.progress?.value ?? 0}%)
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-transparent text-[#111216] p-6 relative">
        <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-md p-8 rounded-[24px] bg-[#ffd6d1]/80 border border-[#f2a59b] backdrop-blur-xl shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-2xl">⚠</div>
          <h1 className="text-3xl font-serif text-[#692118]">Gagal Memproses</h1>
          <p className="text-[#8c2d0d] text-sm leading-relaxed">{error}</p>
          <Link href="/setup" className="mt-4 px-6 py-2.5 rounded-full bg-white/80 border border-black/10 hover:bg-white transition-colors text-sm font-medium">
            Kembali ke Setup
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[#111216] overflow-x-hidden relative py-3 px-3 font-sans">
      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col gap-4 bg-[#fcf7ef] rounded-[16px] p-3 sm:p-4 shadow-2xl border border-white/20">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-3 border-b border-[#df6d2d]/20">
          <div className="flex flex-col gap-1.5 max-w-md">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#d7f2e4] border border-[#96d6b4] text-[#195333] text-[8px] font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-2.5 h-2.5" /> Render Selesai
              </span>
              <span className="text-[#8c2d0d] text-[9px] font-semibold tracking-wider">SKOR: {score}</span>
            </div>
            <h1 className="text-lg font-serif tracking-tight text-[#111216]">Karya OmniClip Anda.</h1>
            <p className="text-[#445a6b] text-[11px] leading-relaxed">
              Alur cerita divisualisasikan menjadi {panelCount} panel manga unik.
            </p>
          </div>
          
          <Link 
            href="/setup" 
            className="group flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 border border-[#df6d2d]/20 hover:bg-white hover:border-[#df6d2d]/40 transition-all text-[11px] font-bold text-[#111216] backdrop-blur-md shadow-sm w-max"
          >
            <ChevronLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            Buat Cerita Baru
          </Link>
        </header>

        {/* Dynamic Reader Section */}
        {payload?.result?.panels && (
          <section className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #141218, #1a1820)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.1)" }}>
              {/* Top accent stripe */}
              <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #df6d2d, transparent)" }} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4" style={{ color: "#df6d2d" }} /> Interactive Reader
                  </h2>
                  <span className="text-[10px] text-white/40 font-medium">{panelCount} panels</span>
                </div>
                <DynamicMangaReader panels={payload.result.panels} />
              </div>
            </div>
          </section>
        )}

        {/* Bottom Grid: Outline + Downloads */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
          {/* Outline Details — Dark Card */}
          <section className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #141218, #1a1820)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.1)" }}>
            <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #a855f7, transparent)" }} />
            <div className="p-5 flex flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "#a855f7" }}>
                <FileText className="w-4 h-4" /> Narasi Final
              </h3>
              <p className="text-white/70 leading-relaxed text-sm whitespace-pre-wrap">
                {payload?.result?.finalOutline}
              </p>
            </div>
          </section>

          {/* Download Module — Dark Card */}
          <section className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #141218, #1a1820)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.1)" }}>
            <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #10b981, transparent)" }} />
            <div className="p-5 flex flex-col gap-4 h-full">
              <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "#10b981" }}>
                <Download className="w-4 h-4" /> Export Assets
              </h3>
              
              <div className="flex flex-col gap-3">
                <AnimatedDownloadButton href={payload?.result?.pdfUrl} label="Download Komik (PDF)" />
                <AnimatedDownloadButton href={payload?.result?.zipUrl} label="Raw Panels (ZIP)" />
              </div>
              
              <div className="mt-auto pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[10px] text-white/35 text-center leading-relaxed">
                  Assets disediakan dalam resolusi tinggi. Gunakan ZIP untuk kebutuhan editing lanjutan.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
