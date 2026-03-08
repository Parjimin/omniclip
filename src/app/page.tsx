"use client";

import Link from "next/link";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export default function HomePage() {
  return (
    <main className="page-shell landing-shell">
      <section className="landing-hero landing-hero-compact landing-hero-single">
        <div className="landing-hero-copy">
          <p className="landing-kicker">OmniClip</p>
          <h1 className="landing-title">Bangun halaman manga visual dari satu brief yang rapi.</h1>
          <p className="landing-subtitle">
            OmniClip mengubah karakter, tema, dan style pilihanmu menjadi halaman manga visual
            yang konsisten, bersih, dan langsung siap di-render.
          </p>

          <div className="landing-benefits" aria-label="fitur utama">
            <span className="landing-benefit">Panel manga murni</span>
            <span className="landing-benefit">Karakter lebih konsisten</span>
            <span className="landing-benefit">Tanpa teks dialog di artwork</span>
          </div>

          <div className="landing-cta-row">
            <Link href="/setup" className="landing-primary-link glow-link-button">
              <GlowingEffect
                spread={30}
                glow
                disabled={false}
                proximity={56}
                inactiveZone={0.08}
                borderWidth={3}
              />
              <span className="glow-link-inner">Mulai dengan OmniClip</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
