"use client";

import Link from "next/link";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { ArrowRight, Sparkles, Wand2, Maximize } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center font-sans p-4 md:p-8">
      
      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center text-center gap-6 bg-[#fcf7ef] rounded-[28px] p-8 md:p-10 shadow-2xl border border-white/50 overflow-hidden">
        {/* Inner Light Orbs for the Card */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-[url('/noise.png')] bg-repeat opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-[#df6d2d]/15 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-30%] left-[-10%] w-[35rem] h-[35rem] bg-[#ffd6bc]/40 rounded-full blur-[120px]"></div>
        </div>

        <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-6 duration-700 relative z-10">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 border border-[#df6d2d]/20 text-[#8c2d0d] text-[10px] font-bold uppercase tracking-widest shadow-sm backdrop-blur-md">
            <Sparkles className="w-3 h-3" /> Next-Gen AI Storytelling
          </span>
          <h1 className="text-3xl md:text-4xl font-serif text-[#111216] tracking-tight leading-[1.1]" style={{ fontFamily: '"Noto Serif JP", serif' }}>
            Transformasikan Naskah Jadi <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#df6d2d] to-[#b8480d]">Mahakarya Visual.</span>
          </h1>
          <p className="text-sm md:text-base text-[#445a6b] max-w-xl leading-relaxed mt-1 font-medium">
            OmniClip adalah orchestration engine tingkat lanjut untuk para kreator. Cukup berikan narasi dasar, dan sistem kami menerjemahkannya menjadi panel manga berkualitas studio.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-700 delay-150 relative z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-black/5 shadow-sm text-xs font-bold text-[#111216] backdrop-blur-md">
            <Wand2 className="w-3.5 h-3.5 text-[#df6d2d]" /> Resolusi Artistik Tinggi
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-black/5 shadow-sm text-xs font-bold text-[#111216] backdrop-blur-md">
            <Maximize className="w-3.5 h-3.5 text-[#df6d2d]" /> Komposisi Dinamis
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-black/5 shadow-sm text-xs font-bold text-[#111216] backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#df6d2d]" /> Tanpa Balon Dialog
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 relative z-10">
          <Link 
            href="/setup" 
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full overflow-hidden text-sm font-bold transition-all duration-300 shadow-[0_6px_20px_rgba(223,109,45,0.25)] hover:shadow-[0_8px_30px_rgba(223,109,45,0.4)] hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #e8743a 0%, #d45a1e 50%, #c44d16 100%)' }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            
            <GlowingEffect
              spread={40}
              glow
              disabled={false}
              proximity={64}
              inactiveZone={0.05}
              borderWidth={3}
            />
            
            <span className="relative z-10 flex items-center gap-2 text-white text-sm font-semibold">
              Masuk ke Studio <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </Link>
          <p className="text-[11px] text-[#5a6f7e] mt-3 font-semibold tracking-wider uppercase">Tidak memerlukan prompt kompleks.</p>
        </div>
      </div>
    </main>
  );
}
