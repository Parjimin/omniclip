import Link from "next/link";
import { SessionBuilderWizard } from "@/components/manga/session-builder-wizard";
import { ChevronLeft } from "lucide-react";

export default function SetupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-transparent relative overflow-hidden w-full text-[#111216] py-3 px-3 font-sans">
      <div className="relative z-10 w-full max-w-7xl flex flex-col gap-3 bg-[#fcf7ef] rounded-[16px] p-3 sm:p-4 shadow-2xl border border-white/20">
        {/* Topbar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#df6d2d]/15">
          <div className="flex flex-col gap-0.5">
            <span className="text-[#8c2d0d] font-bold text-[10px] uppercase tracking-widest">Buat Sesi</span>
            <h1 className="text-lg font-serif text-[#111216]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
              Atur karakter, cerita, dan visual.
            </h1>
            <p className="text-[#5a6f7e] text-xs">
              Susun brief visual dulu, lalu lanjut ke jalur cerita sebelum render.
            </p>
          </div>
          
          <Link 
            href="/" 
            className="group flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/80 border border-[#df6d2d]/20 hover:bg-white hover:border-[#df6d2d]/40 transition-all text-xs font-bold text-[#111216] backdrop-blur-md shadow-sm"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Kembali
          </Link>
        </header>

        {/* Wizard Component */}
        <SessionBuilderWizard />
      </div>
    </div>
  );
}
