"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import { cn } from "@/lib/utils";
import { Check, ArrowRight, Wand2, Moon, Compass, PenLine, Skull, Ship, Wind, Swords, Flame } from "lucide-react";
import AnimatedGenerateButton from "@/components/ui/animated-generate-button";

const ART_STYLE_OPTIONS = [
  { value: "jujutsu_kaisen", label: "Jujutsu Kaisen", accent: "Kutukan, kontras keras, ekspresi tajam" },
  { value: "one_piece", label: "One Piece", accent: "Petualangan liar, framing enerjik" },
  { value: "naruto", label: "Naruto", accent: "Shonen klasik, ritme aksi cepat" },
  { value: "bleach", label: "Bleach", accent: "Siluet tegas, ruang kosong dramatis" },
  { value: "demon_slayer", label: "Demon Slayer", accent: "Gerak sinematik, aura intens" },
] as const;

const STORY_FLOW_OPTIONS = [
  {
    value: "ramadhan", label: "Tema Ramadhan", eyebrow: "Preset 01", title: "Mudik menjelang buka",
    description: "Cerita bergerak dari terminal padat, konflik di jalan, sampai payoff emosional saat hampir sampai rumah.",
  },
  {
    value: "liburan", label: "Tema Liburan", eyebrow: "Preset 02", title: "Trip kacau tapi seru",
    description: "Cerita berangkat dari rencana santai yang berubah jadi petualangan penuh kejutan, benturan, dan momen visual besar.",
  },
  {
    value: "custom", label: "Custom", eyebrow: "Prompt Box", title: "Tulis alur sendiri",
    description: "Kamu tentukan premis, konflik, vibe, dan payoff. Sistem akan mengubahnya jadi manga visual murni.",
  },
] as const;

const PANEL_COUNT_OPTIONS = [4, 6, 8, 10, 12] as const;
const WIZARD_STEPS = ["Identitas", "Cerita", "Visual"] as const;

type StoryFlow = (typeof STORY_FLOW_OPTIONS)[number]["value"];
type BaseTheme = "mudik_ramadhan" | "petualangan";

const RAMADHAN_BLUEPRINT = "Bangun alur visual bertema Ramadhan: terminal atau jalan pulang padat, senja menjelang buka, tekanan perjalanan, konflik di rute utama, lalu payoff emosional ketika karakter semakin dekat ke rumah. Fokus pada storytelling visual, ekspresi, komposisi panel, dan suasana Indonesia.";
const LIBURAN_BLUEPRINT = "Bangun alur visual bertema liburan: keberangkatan santai, lokasi baru yang memikat, insiden tak terduga, escalation yang seru, lalu resolusi yang terasa seperti petualangan pulang dengan kenangan besar. Fokus pada environment, ritme panel, dan momentum visual.";

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildPromptAddon(input: { flow: StoryFlow; customPrompt: string; customBaseTheme: BaseTheme; }) {
  const lines = ["Format akhir harus berupa manga/komik visual murni tanpa teks dialog di panel."];
  if (input.flow === "ramadhan") {
    lines.push("Tema utama: Ramadhan.");
    lines.push(RAMADHAN_BLUEPRINT);
  } else if (input.flow === "liburan") {
    lines.push("Tema utama: Liburan.");
    lines.push(LIBURAN_BLUEPRINT);
  } else {
    const baseThemeLabel = input.customBaseTheme === "mudik_ramadhan" ? "Ramadhan" : "Liburan";
    lines.push(`Tema dasar untuk arahan custom: ${baseThemeLabel}.`);
    lines.push(input.customBaseTheme === "mudik_ramadhan" ? RAMADHAN_BLUEPRINT : LIBURAN_BLUEPRINT);
    lines.push(`Arahan custom user: ${compactText(input.customPrompt)}`);
  }
  return compactText(lines.join(" "));
}

export function SessionBuilderWizard() {
  const router = useRouter();
  const customPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [form, setForm] = useState({
    name: "",
    artStyle: "",
    panelCount: 0,
    storyFlow: "ramadhan" as StoryFlow,
    customPrompt: "",
    customBaseTheme: "mudik_ramadhan" as BaseTheme,
  });

  useEffect(() => {
    const element = customPromptRef.current;
    if (!element) return;
    element.style.height = "0px";
    element.style.height = `${Math.max(132, element.scrollHeight)}px`;
  }, [form.customPrompt]);

  const derivedTheme = useMemo<BaseTheme>(() => {
    if (form.storyFlow === "ramadhan") return "mudik_ramadhan";
    if (form.storyFlow === "liburan") return "petualangan";
    return form.customBaseTheme;
  }, [form.customBaseTheme, form.storyFlow]);

  const promptAddon = useMemo(() => buildPromptAddon({
    flow: form.storyFlow, customPrompt: form.customPrompt, customBaseTheme: form.customBaseTheme,
  }), [form.customBaseTheme, form.customPrompt, form.storyFlow]);

  const canMoveFromStep = (targetStep: number) => {
    if (targetStep <= step) return true;
    if (step === 0) return form.name.trim().length >= 2;
    if (step === 1) return form.storyFlow !== "custom" || compactText(form.customPrompt).length >= 12;
    return true;
  };

  const goNext = () => {
    if (!canMoveFromStep(step + 1)) {
      setError(step === 0 ? "Isi nama karakter dulu minimal 2 huruf." : "Isi arahan custom minimal beberapa kalimat pendek biar arahnya jelas.");
      return;
    }
    setError(null);
    setStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.storyFlow === "custom" && compactText(form.customPrompt).length < 12) {
      setError("Isi alur custom minimal beberapa kalimat pendek biar arahnya jelas.");
      setStep(1);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body = new FormData();
      body.set("name", form.name);
      body.set("theme", derivedTheme);
      body.set("artStyle", form.artStyle);
      body.set("panelCount", String(form.panelCount));
      body.set("promptAddon", promptAddon);
      if (photo) body.set("photo", photo);

      const response = await fetch("/api/session/create", {
        method: "POST",
        body,
        headers: { "x-user-id": "anonymous" },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Gagal membuat sesi");

      router.push(`/story/${payload.sessionId}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Terjadi error saat memulai sesi");
      setLoading(false);
    }
  };

  return (
    <form className="w-full relative flex flex-col gap-3" onSubmit={onSubmit}>
      {/* Tab Progress */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/80 border border-[#df6d2d]/10 backdrop-blur-md w-full sm:w-max mx-auto md:mx-0 shadow-sm overflow-x-auto">
        {WIZARD_STEPS.map((label, index) => {
          const isActive = index === step;
          const isPas = index < step;
          const isAccessible = canMoveFromStep(index);
          
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (isAccessible) {
                  setError(null);
                  setStep(index);
                }
              }}
              className={cn(
                "relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-300 whitespace-nowrap",
                isActive ? "bg-white shadow-sm text-gray-900 border border-black/5" 
                         : "text-[#445a6b] border border-transparent hover:bg-white/50 hover:text-gray-900",
                !isAccessible && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-[#445a6b]"
              )}
              disabled={!isAccessible}
            >
              <span className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold transition-all",
                isActive ? "bg-gradient-to-br from-[#e8743a] to-[#d45a1e] text-white shadow-sm shadow-orange-500/20" : isPas ? "bg-[#1f7a49] text-white" : "bg-black/5 text-[#5a6f7e]"
              )}>
                {isPas ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-3 items-start">
        {/* Main Interface Content */}
        <div className="flex flex-col rounded-[18px] bg-white/60 border border-[#df6d2d]/15 backdrop-blur-xl shadow-xl flex-1 w-full relative overflow-hidden">
          
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#df6d2d]/30 to-transparent"></div>

          <div className="p-3.5 lg:p-4 flex flex-col flex-1">
            
            {step === 0 && (
              <section className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-[#df6d2d]/10 pb-2">
                  <span className="text-[#8c2d0d] text-[10px] font-bold uppercase tracking-widest">Step 01</span>
                  <h2 className="text-base font-serif text-[#111216] mt-0.5">Siapa tokoh utamanya?</h2>
                  <p className="text-[#5a6f7e] mt-0.5 text-xs">Identitas inti yang akan muncul di manga.</p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <label htmlFor="name" className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-[#111216]">Nama Karakter / Nama Kamu</span>
                    <input
                      id="name"
                      value={form.name}
                      minLength={2}
                      maxLength={40}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="contoh: Findop"
                      required
                      className="w-full px-4 py-2.5 rounded-lg bg-white/80 border border-[#df6d2d]/20 text-[#111216] placeholder-[#8c9bab] text-xs focus:outline-none focus:ring-1 focus:ring-[#df6d2d] focus:border-[#df6d2d] transition-all"
                    />
                  </label>

                  <div className="bg-white/40 border border-[#df6d2d]/10 rounded-lg p-3">
                    <ImageUploadField label="Foto Referensi Wajah (Opsional)" onFileSelect={setPhoto} />
                  </div>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-[#df6d2d]/10 pb-2">
                  <span className="text-[#8c2d0d] text-[10px] font-bold uppercase tracking-widest">Step 02</span>
                  <h2 className="text-base font-serif text-[#111216] mt-0.5">Pilih arah cerita.</h2>
                  <p className="text-[#5a6f7e] mt-0.5 text-xs">Pilih preset atau tulis sendiri narasi utama.</p>
                </div>

                {/* Dark container for cards */}
                <div className="rounded-2xl p-3 -mx-1" style={{ background: "linear-gradient(135deg, #141218, #1a1820)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.1)" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {STORY_FLOW_OPTIONS.map((option, idx) => {
                    const isActive = form.storyFlow === option.value;
                    const icons = [Moon, Compass, PenLine];
                    const IconComp = icons[idx];
                    const themes = [
                      { bg: "#1a1028", accent: "#a855f7", glow: "rgba(168,85,247,0.4)" },
                      { bg: "#0f1d2b", accent: "#06b6d4", glow: "rgba(6,182,212,0.4)" },
                      { bg: "#291a0a", accent: "#f59e0b", glow: "rgba(245,158,11,0.4)" },
                    ];
                    const t = themes[idx];
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, storyFlow: option.value }))}
                        className={cn(
                          "group relative text-left rounded-2xl transition-all duration-400 overflow-hidden",
                          isActive
                            ? "scale-[1.03]"
                            : "hover:scale-[1.02] hover:shadow-xl"
                        )}
                        style={{
                          background: t.bg,
                          boxShadow: isActive ? `0 8px 30px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.08)` : "inset 0 1px 0 rgba(255,255,255,0.05)",
                          ...(isActive ? { outline: `2px solid ${t.accent}`, outlineOffset: "1px" } : {}),
                        }}
                      >
                        {/* Top accent stripe */}
                        <div className="absolute top-0 inset-x-0 h-[2px]" style={{
                          background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
                          opacity: isActive ? 1 : 0.3,
                        }} />

                        {/* Ambient glow */}
                        {isActive && (
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full animate-pulse pointer-events-none" style={{
                            background: `radial-gradient(circle, ${t.glow}, transparent 70%)`,
                          }} />
                        )}

                        <div className="relative p-4 flex flex-col gap-2.5 h-full">
                          {/* Icon + Check row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-400" style={{
                              background: isActive ? t.accent : `${t.accent}20`,
                              boxShadow: isActive ? `0 0 16px ${t.glow}` : "none",
                            }}>
                              <IconComp className="w-4.5 h-4.5 text-white transition-transform duration-400 group-hover:scale-110" />
                            </div>

                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                              isActive ? "border-transparent" : "border-white/15 group-hover:border-white/30"
                            )} style={isActive ? { background: t.accent, boxShadow: `0 0 8px ${t.glow}` } : undefined}>
                              {isActive && <Check className="w-3 h-3 text-white animate-in zoom-in-50 duration-200" />}
                            </div>
                          </div>

                          {/* Eyebrow */}
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isActive ? t.accent : `${t.accent}99` }}>
                            {option.eyebrow}
                          </span>

                          {/* Title */}
                          <h4 className="text-white font-bold text-sm leading-tight -mt-1">{option.title}</h4>

                          {/* Description */}
                          <p className="text-white/60 text-[11px] leading-relaxed group-hover:text-white/75 transition-colors">{option.description}</p>
                        </div>
                      </button>
                    )
                  })}
                  </div>

                  {form.storyFlow === "custom" && (
                    <div className="rounded-xl overflow-hidden mt-3" style={{
                      background: "#1f1a0e",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}>
                      {/* Top accent stripe */}
                      <div className="h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }} />
                      
                      <div className="p-4 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="text-xs font-bold text-white">Tulis brief singkatmu.</h3>
                            <p className="text-[11px] text-white/50 mt-0.5">Prompt box untuk instruksi manga.</p>
                          </div>
                          
                          {/* Theme toggle */}
                          <div className="flex p-1 rounded-xl w-max" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <button
                              type="button"
                              onClick={() => setForm(p => ({ ...p, customBaseTheme: "mudik_ramadhan" }))}
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                                form.customBaseTheme === "mudik_ramadhan"
                                  ? "text-white shadow-md"
                                  : "text-white/40 hover:text-white/70"
                              )}
                              style={form.customBaseTheme === "mudik_ramadhan" ? {
                                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                                boxShadow: "0 2px 10px rgba(245,158,11,0.4)",
                              } : undefined}
                            >
                              Ramadhan
                            </button>
                            <button
                              type="button"
                              onClick={() => setForm(p => ({ ...p, customBaseTheme: "petualangan" }))}
                              className={cn(
                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-300",
                                form.customBaseTheme === "petualangan"
                                  ? "text-white shadow-md"
                                  : "text-white/40 hover:text-white/70"
                              )}
                              style={form.customBaseTheme === "petualangan" ? {
                                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                                boxShadow: "0 2px 10px rgba(245,158,11,0.4)",
                              } : undefined}
                            >
                              Liburan
                            </button>
                          </div>
                        </div>

                        <textarea
                          id="customPrompt"
                          ref={customPromptRef}
                          value={form.customPrompt}
                          onChange={(e) => setForm(p => ({ ...p, customPrompt: e.target.value }))}
                          placeholder="Contoh: Seorang mahasiswa pulang saat liburan, tapi bus yang ia tumpangi berhenti di rest area kosong yang terasa aneh..."
                          className="w-full px-4 py-3 rounded-xl text-white placeholder-white/25 text-xs focus:outline-none transition-all resize-none min-h-[90px] leading-relaxed"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "rgba(245,158,11,0.5)";
                            e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.2), 0 0 0 2px rgba(245,158,11,0.15)";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                            e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.2)";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="border-b border-[#df6d2d]/10 pb-2">
                  <span className="text-[#8c2d0d] text-[10px] font-bold uppercase tracking-widest">Step 03</span>
                  <h2 className="text-base font-serif text-[#111216] mt-0.5">Resolusi akhir, visual styling.</h2>
                  <p className="text-[#5a6f7e] mt-0.5 text-xs">Estetik visual dan target panel output.</p>
                </div>

                {/* Dark container for cards */}
                <div className="rounded-2xl p-3 -mx-1" style={{ background: "linear-gradient(135deg, #141218, #1a1820)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.1)" }}>
                  {/* ── Art Style Section ── */}
                  <div className="flex flex-col gap-2.5">
                    <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Art Style Model</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {ART_STYLE_OPTIONS.map((style, idx) => {
                      const isSelected = form.artStyle === style.value;
                      const artIcons = [Skull, Ship, Wind, Swords, Flame];
                      const ArtIcon = artIcons[idx];
                      const themes = [
                        { bg: "#1e1033", accent: "#a855f7", glow: "rgba(168,85,247,0.4)" },
                        { bg: "#2a1215", accent: "#ef4444", glow: "rgba(239,68,68,0.4)" },
                        { bg: "#2c1a0e", accent: "#f97316", glow: "rgba(249,115,22,0.4)" },
                        { bg: "#0c1929", accent: "#3b82f6", glow: "rgba(59,130,246,0.4)" },
                        { bg: "#0b1f17", accent: "#10b981", glow: "rgba(16,185,129,0.4)" },
                      ];
                      const t = themes[idx];
                      return (
                        <button
                          key={style.value}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, artStyle: style.value }))}
                          className={cn(
                            "group relative text-left rounded-2xl transition-all duration-400 overflow-hidden",
                            isSelected
                              ? "scale-[1.04] ring-2"
                              : "hover:scale-[1.03] hover:shadow-xl ring-0"
                          )}
                          style={{
                            background: t.bg,
                            boxShadow: isSelected ? `0 8px 30px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.08)` : "inset 0 1px 0 rgba(255,255,255,0.05)",
                            ...(isSelected ? { outline: `2px solid ${t.accent}`, outlineOffset: "1px" } : {}),
                          }}
                        >
                          {/* Top accent stripe */}
                          <div className="absolute top-0 inset-x-0 h-[2px]" style={{
                            background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
                            opacity: isSelected ? 1 : 0.3,
                          }} />
                          
                          {/* Ambient glow */}
                          {isSelected && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full animate-pulse pointer-events-none" style={{
                              background: `radial-gradient(circle, ${t.glow}, transparent 70%)`,
                            }} />
                          )}

                          <div className="relative p-3 flex flex-col gap-2 h-full">
                            {/* Icon row */}
                            <div className="flex items-center justify-between">
                              <div className={cn(
                                "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-400",
                              )} style={{
                                background: isSelected ? t.accent : `${t.accent}20`,
                                boxShadow: isSelected ? `0 0 16px ${t.glow}` : "none",
                              }}>
                                <ArtIcon className="w-4 h-4 text-white transition-transform duration-400 group-hover:scale-110" />
                              </div>
                              
                              {/* Check */}
                              <div className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                                isSelected ? "border-transparent" : "border-white/15 group-hover:border-white/30"
                              )} style={isSelected ? { background: t.accent, boxShadow: `0 0 8px ${t.glow}` } : undefined}>
                                {isSelected && <Check className="w-3 h-3 text-white animate-in zoom-in-50 duration-200" />}
                              </div>
                            </div>

                            {/* Text */}
                            <div>
                              <strong className="text-white text-xs font-bold block leading-tight">{style.label}</strong>
                              <span className="text-[10px] leading-snug block mt-0.5" style={{ color: `${t.accent}cc` }}>{style.accent}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  </div>

                  {/* ── Panel Count Section ── */}
                  <div className="flex flex-col gap-2.5 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Target Render Panel</h3>
                    <div className="flex flex-wrap gap-2">
                      {PANEL_COUNT_OPTIONS.map((count) => {
                        const isSelected = form.panelCount === count;
                        return (
                          <button
                            key={count}
                            type="button"
                            onClick={() => setForm(p => ({ ...p, panelCount: count }))}
                            className={cn(
                              "group relative flex items-center gap-2 rounded-xl transition-all duration-300 overflow-hidden",
                              isSelected
                                ? "scale-105"
                                : "hover:scale-[1.03]"
                            )}
                            style={{
                              padding: isSelected ? "8px 16px" : "8px 14px",
                              background: isSelected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                              border: isSelected ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                              boxShadow: isSelected ? "0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
                            }}
                          >
                            {/* Number badge */}
                            <span className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-black transition-all",
                              isSelected ? "bg-white/20 text-white" : "bg-white/[0.06] text-white/50 group-hover:bg-white/10 group-hover:text-white/70"
                            )}>
                              {count}
                            </span>
                            <span className={cn(
                              "text-xs font-bold transition-colors",
                              isSelected ? "text-white" : "text-white/50 group-hover:text-white/70"
                            )}>
                              Panel
                            </span>
                            {/* Active shimmer */}
                            {isSelected && <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/[0.07] to-white/0 animate-pulse pointer-events-none" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs animate-in fade-in zoom-in-95">
                <div className="p-1 rounded-full bg-red-100">⚠</div>
                {error}
              </div>
            )}

            <div className="mt-auto pt-3 flex items-center isolate justify-between border-t border-[#df6d2d]/10">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                disabled={step === 0 || loading}
                className="px-4 py-2 rounded-lg border border-black/8 bg-white/70 text-[#3d5264] text-xs font-medium hover:text-[#111216] hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200"
              >
                Kembali
              </button>

              {step < WIZARD_STEPS.length - 1 ? (
                <button 
                  type="button" 
                  onClick={goNext} 
                  disabled={loading}
                  className="group relative flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-[#1a1d23] to-[#2d3138] text-white text-xs font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 overflow-hidden disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10 flex items-center gap-2">Lanjut <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" /></span>
                </button>
              ) : (
                <AnimatedGenerateButton
                  type="submit"
                  labelIdle="Story Builder"
                  labelActive="Membuat sesi"
                  generating={loading}
                  highlightHueDeg={25}
                  disabled={loading || !form.artStyle || !form.panelCount}
                />
              )}
            </div>
          </div>
        </div>

        {/* Floating Ticket Sidebar */}
        <div className="flex flex-col rounded-[14px] bg-gradient-to-b from-[#fffdf8] to-[#faf2e6] border border-[#df6d2d]/15 shadow-xl p-3 lg:p-3.5 w-full lg:w-[200px] sticky top-4">
          <div className="flex items-center gap-2 border-b border-[#df6d2d]/10 pb-3 mb-3">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-[#df6d2d] to-[#ffca89] shadow-md shadow-[#df6d2d]/30">
              <Wand2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-[#8c2d0d] font-bold uppercase tracking-widest">Sesi Draft</p>
              <h3 className="text-[#111216] font-serif text-xs leading-none mt-0.5">OmniClip</h3>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] text-[#5a6f7e] font-bold uppercase tracking-widest mb-0.5">Identitas</p>
              <h3 className="text-[#111216] font-medium text-xs truncate">{form.name || "Menunggu input..."}</h3>
              <p className="text-[#6b7f8e] text-[11px] mt-0.5">
                {derivedTheme === "mudik_ramadhan" ? "Ramadhan" : "Liburan"} Ext.
              </p>
            </div>

            <div className="w-full h-[1px] bg-gradient-to-r from-black/5 via-black/10 to-transparent"></div>

            <div>
              <p className="text-[10px] text-[#5a6f7e] font-bold uppercase tracking-widest mb-0.5">Manga Output</p>
              <h3 className="text-[#111216] font-medium text-xs">{form.panelCount ? `${form.panelCount} Panel` : "Belum ditentukan"}</h3>
              <p className="text-[#6b7f8e] text-[11px] mt-0.5">
                Visual Art: {ART_STYLE_OPTIONS.find((i) => i.value === form.artStyle)?.label || "?"}
              </p>
            </div>

            <div className="w-full h-[1px] bg-gradient-to-r from-black/5 via-black/10 to-transparent"></div>

            <div>
              <p className="text-[10px] text-[#5a6f7e] font-bold uppercase tracking-widest mb-0.5">Arah Timeline</p>
              <h3 className="text-[#111216] font-medium text-xs leading-tight">
                {STORY_FLOW_OPTIONS.find((i) => i.value === form.storyFlow)?.title}
              </h3>
              <p className="text-[#6b7f8e] text-[11px] mt-1 leading-relaxed line-clamp-3">{promptAddon}</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
