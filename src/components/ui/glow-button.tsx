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
  return (
    <button
      type={type}
      className={cn("glow-button", `glow-button-${tone}`, active && "active", className)}
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
      <span className={cn("glow-button-inner", innerClassName)}>{children}</span>
    </button>
  );
}
