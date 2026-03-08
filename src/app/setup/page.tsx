import Link from "next/link";
import { SessionBuilderWizard } from "@/components/manga/session-builder-wizard";
import { GlowingEffect } from "@/components/ui/glowing-effect";

export default function SetupPage() {
  return (
    <main className="page-shell setup-shell">
      <section className="setup-topbar">
        <div>
          <p className="section-tag">Buat Sesi</p>
          <h1 className="page-title">Atur karakter, arah cerita, dan style visual.</h1>
          <p className="page-subtitle">
            Susun brief visual OmniClip dulu, lalu lanjut ke pemilihan jalur cerita sebelum render.
          </p>
        </div>
        <Link href="/" className="landing-primary-link glow-link-button glow-link-button-subtle">
          <GlowingEffect
            spread={30}
            glow
            disabled={false}
            proximity={48}
            inactiveZone={0.08}
            borderWidth={2}
          />
          <span className="glow-link-inner">Kembali</span>
        </Link>
      </section>

      <SessionBuilderWizard />
    </main>
  );
}
