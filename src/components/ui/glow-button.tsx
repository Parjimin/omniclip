"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

type Tone = "action" | "card" | "pill" | "tab";

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
  tone?: Tone;
  innerClassName?: string;
  ariaPressed?: boolean;
}

export function GlowButton({
  children,
  className,
  active = false,
  tone = "card",
  innerClassName,
  type = "button",
  ariaPressed,
  ...props
}: GlowButtonProps) {
  
  // Base styling for different tones using Tailwind
  const toneClasses = {
    action: cn(
      "min-h-[50px] px-6 py-3 rounded-xl shadow-md transition-all duration-300",
      active 
        ? "bg-gradient-to-r from-[#df6d2d] to-[#ffca89] text-[#111] shadow-[#df6d2d]/40" 
        : "bg-[#111216] text-white hover:scale-[1.02] hover:shadow-lg"
    ),
    card: cn(
      "relative flex flex-col gap-2 p-5 min-h-[120px] rounded-2xl border transition-all duration-300 text-left overflow-hidden",
      active 
        ? "bg-gradient-to-b from-[#fffaf4] to-[#fcebda] border-[#df6d2d] shadow-md text-[#111]" 
        : "bg-white/60 border-black/5 text-gray-900 hover:bg-white hover:border-[#df6d2d]/30"
    ),
    pill: cn(
      "inline-flex items-center justify-center min-h-[40px] px-5 py-2 rounded-full border text-sm font-bold transition-all duration-300",
      active 
        ? "bg-[#111216] text-white border-[#111216] shadow-md shadow-black/20" 
        : "bg-white/60 border-black/5 text-[#445a6b] hover:text-gray-900 hover:border-black/20"
    ),
    tab: cn(
      "relative flex items-center gap-2 px-5 py-3 min-h-[50px] rounded-xl text-sm font-medium transition-all duration-300",
      active 
        ? "bg-white shadow-sm text-gray-900 border border-black/5" 
        : "bg-transparent text-[#445a6b] border border-transparent hover:text-gray-900 hover:bg-white/50"
    ),
  };

  return (
    <button
      type={type}
      className={cn(
        "relative isolate group outline-none", 
        tone !== 'tab' && "disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale",
        toneClasses[tone],
        className
      )}
      aria-pressed={ariaPressed}
      {...props}
    >
      <GlowingEffect
        spread={tone === "pill" ? 26 : 34}
        glow
        disabled={false}
        proximity={tone === "pill" ? 36 : 64}
        inactiveZone={0.06}
        borderWidth={tone === "action" ? 3 : 2}
      />
      
      <span className={cn("relative z-10 w-full", innerClassName)}>
        {children}
      </span>
    </button>
  );
}
