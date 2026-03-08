"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GlowButton } from "@/components/ui/glow-button";
import { ImageUploadField } from "@/components/ui/image-upload-field";

const ART_STYLE_OPTIONS = [
  {
    value: "jujutsu_kaisen",
    label: "Jujutsu Kaisen",
    accent: "Kutukan, kontras keras, ekspresi tajam",
  },
  {
    value: "one_piece",
    label: "One Piece",
    accent: "Petualangan liar, framing enerjik",
  },
  {
    value: "naruto",
    label: "Naruto",
    accent: "Shonen klasik, ritme aksi cepat",
  },
  {
    value: "bleach",
    label: "Bleach",
    accent: "Siluet tegas, ruang kosong dramatis",
  },
  {
    value: "demon_slayer",
    label: "Demon Slayer",
    accent: "Gerak sinematik, aura intens",
  },
] as const;

const STORY_FLOW_OPTIONS = [
  {
    value: "ramadhan",
    label: "Tema Ramadhan",
    eyebrow: "Preset 01",
    title: "Mudik menjelang buka",
    description:
      "Cerita bergerak dari terminal padat, konflik di jalan, sampai payoff emosional saat hampir sampai rumah.",
  },
  {
    value: "liburan",
    label: "Tema Liburan",
    eyebrow: "Preset 02",
    title: "Trip kacau tapi seru",
    description:
      "Cerita berangkat dari rencana santai yang berubah jadi petualangan penuh kejutan, benturan, dan momen visual besar.",
  },
  {
    value: "custom",
    label: "Custom",
    eyebrow: "Prompt Box",
    title: "Tulis alur sendiri",
    description:
      "Kamu tentukan premis, konflik, vibe, dan payoff. Sistem akan mengubahnya jadi manga visual murni.",
  },
] as const;

const PANEL_COUNT_OPTIONS = [4, 6, 8, 10, 12] as const;
const WIZARD_STEPS = ["Identitas", "Cerita", "Visual"] as const;

type StoryFlow = (typeof STORY_FLOW_OPTIONS)[number]["value"];
type BaseTheme = "mudik_ramadhan" | "petualangan";

const RAMADHAN_BLUEPRINT =
  "Bangun alur visual bertema Ramadhan: terminal atau jalan pulang padat, senja menjelang buka, tekanan perjalanan, konflik di rute utama, lalu payoff emosional ketika karakter semakin dekat ke rumah. Fokus pada storytelling visual, ekspresi, komposisi panel, dan suasana Indonesia.";

const LIBURAN_BLUEPRINT =
  "Bangun alur visual bertema liburan: keberangkatan santai, lokasi baru yang memikat, insiden tak terduga, escalation yang seru, lalu resolusi yang terasa seperti petualangan pulang dengan kenangan besar. Fokus pada environment, ritme panel, dan momentum visual.";

function compactText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function buildPromptAddon(input: {
  flow: StoryFlow;
  customPrompt: string;
  customBaseTheme: BaseTheme;
}) {
  const lines = [
    "Format akhir harus berupa manga/komik visual murni tanpa teks dialog di panel.",
  ];

  if (input.flow === "ramadhan") {
    lines.push("Tema utama: Ramadhan.");
    lines.push(RAMADHAN_BLUEPRINT);
  } else if (input.flow === "liburan") {
    lines.push("Tema utama: Liburan.");
    lines.push(LIBURAN_BLUEPRINT);
  } else {
    const baseThemeLabel =
      input.customBaseTheme === "mudik_ramadhan" ? "Ramadhan" : "Liburan";
    lines.push(`Tema dasar untuk arahan custom: ${baseThemeLabel}.`);
    lines.push(
      input.customBaseTheme === "mudik_ramadhan"
        ? RAMADHAN_BLUEPRINT
        : LIBURAN_BLUEPRINT,
    );
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
    artStyle: "jujutsu_kaisen",
    panelCount: 8,
    storyFlow: "ramadhan" as StoryFlow,
    customPrompt: "",
    customBaseTheme: "mudik_ramadhan" as BaseTheme,
  });

  useEffect(() => {
    const element = customPromptRef.current;
    if (!element) {
      return;
    }
    element.style.height = "0px";
    element.style.height = `${Math.max(132, element.scrollHeight)}px`;
  }, [form.customPrompt]);

  const derivedTheme = useMemo<BaseTheme>(() => {
    if (form.storyFlow === "ramadhan") {
      return "mudik_ramadhan";
    }
    if (form.storyFlow === "liburan") {
      return "petualangan";
    }
    return form.customBaseTheme;
  }, [form.customBaseTheme, form.storyFlow]);

  const promptAddon = useMemo(
    () =>
      buildPromptAddon({
        flow: form.storyFlow,
        customPrompt: form.customPrompt,
        customBaseTheme: form.customBaseTheme,
      }),
    [form.customBaseTheme, form.customPrompt, form.storyFlow],
  );

  const canMoveFromStep = (targetStep: number) => {
    if (targetStep <= step) {
      return true;
    }

    if (step === 0) {
      return form.name.trim().length >= 2;
    }

    if (step === 1) {
      return form.storyFlow !== "custom" || compactText(form.customPrompt).length >= 12;
    }

    return true;
  };

  const goNext = () => {
    if (!canMoveFromStep(step + 1)) {
      setError(
        step === 0
          ? "Isi nama karakter dulu."
          : "Isi arahan custom minimal beberapa kalimat pendek biar arahnya jelas.",
      );
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
      if (photo) {
        body.set("photo", photo);
      }

      const response = await fetch("/api/session/create", {
        method: "POST",
        body,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Gagal membuat sesi");
      }

      router.push(`/story/${payload.sessionId}`);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Terjadi error saat memulai sesi";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <form className="wizard-shell" onSubmit={onSubmit}>
      <div className="wizard-progress">
        {WIZARD_STEPS.map((label, index) => (
          <GlowButton
            key={label}
            tone="tab"
            className="wizard-step-tab"
            active={index === step}
            onClick={() => {
              if (canMoveFromStep(index)) {
                setError(null);
                setStep(index);
              }
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
          </GlowButton>
        ))}
      </div>

      <div className="wizard-frame surface">
        <div className="wizard-main">
          {step === 0 && (
            <section className="landing-section">
              <div className="landing-section-head">
                <div>
                  <p className="section-tag">Step 01</p>
                  <h2>Siapa tokoh utamanya?</h2>
                </div>
                <p className="landing-inline-note">Mulai dari identitas paling inti.</p>
              </div>

              <div className="field-grid">
                <label htmlFor="name">
                  Nama Karakter / Nama Kamu
                  <input
                    id="name"
                    value={form.name}
                    minLength={2}
                    maxLength={40}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="contoh: Findop"
                    required
                  />
                </label>

                <ImageUploadField
                  label="Foto Referensi (Opsional)"
                  onFileSelect={(file) => setPhoto(file)}
                />
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="landing-section">
              <div className="landing-section-head">
                <div>
                  <p className="section-tag">Step 02</p>
                  <h2>Pilih arah cerita yang memang akan terlihat di panel.</h2>
                </div>
                <p className="landing-inline-note">Tema dan premis, bukan pertanyaan abstrak.</p>
              </div>

              <div className="story-mode-grid">
                {STORY_FLOW_OPTIONS.map((option) => (
                  <GlowButton
                    key={option.value}
                    tone="card"
                    className="story-mode-card"
                    active={form.storyFlow === option.value}
                    onClick={() => setForm((prev) => ({ ...prev, storyFlow: option.value }))}
                    ariaPressed={form.storyFlow === option.value}
                  >
                    <span className="story-mode-eyebrow">{option.eyebrow}</span>
                    <strong>{option.title}</strong>
                    <p>{option.description}</p>
                  </GlowButton>
                ))}
              </div>

              {form.storyFlow === "custom" && (
                <div className="chat-composer">
                  <div className="chat-composer-head">
                    <div>
                      <p className="section-tag">Alur Custom</p>
                      <h3>Tulis brief singkatmu.</h3>
                    </div>
                    <div className="chat-theme-toggle" role="group" aria-label="tema dasar custom">
                      <GlowButton
                        tone="pill"
                        active={form.customBaseTheme === "mudik_ramadhan"}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, customBaseTheme: "mudik_ramadhan" }))
                        }
                      >
                        Ramadhan
                      </GlowButton>
                      <GlowButton
                        tone="pill"
                        active={form.customBaseTheme === "petualangan"}
                        onClick={() =>
                          setForm((prev) => ({ ...prev, customBaseTheme: "petualangan" }))
                        }
                      >
                        Liburan
                      </GlowButton>
                    </div>
                  </div>

                  <label htmlFor="customPrompt" className="chatbox-shell">
                    <span className="text-muted">
                      Jelaskan premis, konflik, lokasi, dan vibe visual yang kamu mau.
                    </span>
                    <textarea
                      id="customPrompt"
                      ref={customPromptRef}
                      value={form.customPrompt}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, customPrompt: event.target.value }))
                      }
                      placeholder="Contoh: Seorang mahasiswa pulang saat liburan, tapi bus yang ia tumpangi berhenti di rest area kosong yang terasa aneh. Setiap panel makin sunyi, makin ganjil, lalu meledak jadi pengejaran di malam hari."
                    />
                  </label>
                </div>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="landing-section">
              <div className="landing-section-head">
                <div>
                  <p className="section-tag">Step 03</p>
                  <h2>Tentukan style pack dan jumlah panel, lalu generate.</h2>
                </div>
                <p className="landing-inline-note">
                  Langkah terakhir. Tidak ada halaman review terpisah.
                </p>
              </div>

              <div className="style-grid">
                {ART_STYLE_OPTIONS.map((style) => (
                  <GlowButton
                    key={style.value}
                    tone="card"
                    className="style-card"
                    active={form.artStyle === style.value}
                    onClick={() => setForm((prev) => ({ ...prev, artStyle: style.value }))}
                    ariaPressed={form.artStyle === style.value}
                  >
                    <strong>{style.label}</strong>
                    <span>{style.accent}</span>
                  </GlowButton>
                ))}
              </div>

              <div className="panel-count-row" role="group" aria-label="jumlah panel">
                {PANEL_COUNT_OPTIONS.map((count) => (
                  <GlowButton
                    key={count}
                    tone="pill"
                    className="panel-count-chip"
                    active={form.panelCount === count}
                    onClick={() => setForm((prev) => ({ ...prev, panelCount: count }))}
                    ariaPressed={form.panelCount === count}
                  >
                    {count} panel
                  </GlowButton>
                ))}
              </div>
            </section>
          )}

          {error && <div className="alert error">{error}</div>}

          <div className="wizard-actions">
            <GlowButton
              type="button"
              tone="action"
              className="wizard-secondary"
              onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
              disabled={step === 0 || loading}
            >
              Kembali
            </GlowButton>

            {step < WIZARD_STEPS.length - 1 ? (
              <GlowButton type="button" tone="action" onClick={goNext} disabled={loading}>
                Lanjut
              </GlowButton>
            ) : (
              <GlowButton type="submit" tone="action" disabled={loading}>
                {loading ? "Membuat sesi..." : "Masuk ke Story Builder"}
              </GlowButton>
            )}
          </div>
        </div>

        <aside className="wizard-sidebar">
          <div className="wizard-sidebar-card">
            <p className="section-tag">Ringkasan</p>
            <h3>{form.name || "Karakter Utama"}</h3>
            <p>
              {derivedTheme === "mudik_ramadhan" ? "Ramadhan" : "Liburan"} •{" "}
              {ART_STYLE_OPTIONS.find((item) => item.value === form.artStyle)?.label}
            </p>
          </div>

          <div className="wizard-sidebar-card">
            <p className="section-tag">Output</p>
            <h3>{form.panelCount} Panel Visual</h3>
            <p>Fokus ke layout, continuity, ekspresi, dan impact visual.</p>
          </div>

          <div className="wizard-sidebar-card">
            <p className="section-tag">Arah Cerita</p>
            <h3>
              {STORY_FLOW_OPTIONS.find((item) => item.value === form.storyFlow)?.label}
            </h3>
            <p>{promptAddon}</p>
          </div>
        </aside>
      </div>
    </form>
  );
}
