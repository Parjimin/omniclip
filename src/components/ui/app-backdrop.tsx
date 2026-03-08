"use client";

import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";

export function AppBackdrop() {
  return (
    <div className="app-backdrop" aria-hidden="true">
      <div className="app-backdrop-orb app-backdrop-orb-left" />
      <div className="app-backdrop-orb app-backdrop-orb-right" />
      <div className="app-backdrop-orb app-backdrop-orb-bottom" />
      <AnimatedGridPattern
        numSquares={38}
        maxOpacity={0.16}
        duration={3.8}
        repeatDelay={0.8}
        className="app-backdrop-grid"
      />
      <div className="app-backdrop-vignette" />
    </div>
  );
}
