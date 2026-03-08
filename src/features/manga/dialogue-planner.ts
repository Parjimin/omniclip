import { Theme } from "./types";

function normalizeBeat(beat: string): string {
  return beat
    .replace(/\s+/g, " ")
    .replace(/\(.*?\)/g, "")
    .trim();
}

function shortBeat(beat: string): string {
  const cleaned = normalizeBeat(beat);
  if (cleaned.length <= 86) {
    return cleaned;
  }
  return `${cleaned.slice(0, 83).trimEnd()}...`;
}

function beatAnchor(beat: string): string {
  const cleaned = normalizeBeat(beat);
  if (!cleaned) {
    return "situasi utama panel ini";
  }
  const first = cleaned.split(/[.;:!?]/)[0]?.trim() ?? cleaned;
  if (first.length <= 58) {
    return first.toLowerCase();
  }
  return `${first.slice(0, 55).trimEnd()}...`.toLowerCase();
}

function stageLabel(panelIndex: number, panelCount: number): "awal" | "tengah" | "akhir" {
  if (panelIndex <= Math.max(2, Math.floor(panelCount * 0.25))) {
    return "awal";
  }
  if (panelIndex >= Math.max(3, Math.ceil(panelCount * 0.75))) {
    return "akhir";
  }
  return "tengah";
}

function pickBySeed(lines: string[], seed: number): string {
  if (lines.length === 0) {
    return "";
  }
  const index = Math.abs(seed) % lines.length;
  return lines[index];
}

function mudikLine(stage: "awal" | "tengah" | "akhir", order: number, seed: number): string {
  if (order === 1) {
    return pickBySeed(
      [
        "Bismillah, aku harus sampai rumah sebelum waktu berbuka habis.",
        "Perjalanan mudik ini harus tuntas, keluarga sudah menunggu.",
        "Aku gas sekarang, targetku tiba sebelum malam takbiran.",
      ],
      seed,
    );
  }

  if (order === 2) {
    if (stage === "awal") {
      return pickBySeed(
        [
          "Arus mulai padat, tapi aku masih pegang ritme.",
          "Macet mulai mengunci, aku cari celah tanpa panik.",
          "Jalur makin sempit, fokusku tetap di tujuan utama.",
        ],
        seed,
      );
    }

    if (stage === "tengah") {
      return pickBySeed(
        [
          "Tekanan naik, aku harus hemat tenaga dan tetap presisi.",
          "Rintangannya brutal, aku pindah taktik sekarang juga.",
          "Keadaan makin kacau, aku jaga kepala tetap dingin.",
        ],
        seed,
      );
    }

    return pickBySeed(
      [
        "Gerbang kampung sudah dekat, jangan kasih ruang buat gagal.",
        "Bagian akhir tinggal sedikit, aku kunci langkah terakhir.",
        "Ini penentuan, satu kesalahan bisa buyarkan semuanya.",
      ],
      seed,
    );
  }

  if (stage === "awal") {
    return pickBySeed(
      [
        "Aku ambil jalur alternatif, biar waktu nggak kebuang.",
        "Langkah berikutnya: pecah arus dan amankan posisi.",
        "Aku dorong tempo, jangan sampai terjebak lama di sini.",
      ],
      seed,
    );
  }

  if (stage === "tengah") {
    return pickBySeed(
      [
        "Satu dorongan lagi, rintangan ini harus runtuh.",
        "Momentum lagi bagus, aku tekan sampai jalannya kebuka.",
        "Nggak ada mundur, babak ini harus menang.",
      ],
      seed,
    );
  }

  return pickBySeed(
    [
      "Akhiri panel ini dengan nafas lega dan langkah mantap.",
      "Tutup babak ini, bawa suasana ke momen pulang.",
      "Selesai di sini, sisakan rasa syukur yang kuat.",
    ],
    seed,
  );
}

function adventureLine(
  stage: "awal" | "tengah" | "akhir",
  order: number,
  seed: number,
): string {
  if (order === 1) {
    return pickBySeed(
      [
        "Misi dimulai sekarang, aku nggak boleh salah baca situasi.",
        "Babak ini dimulai, fokusku cuma satu: maju tanpa ragu.",
        "Target sudah terlihat, aku harus bergerak lebih dulu.",
      ],
      seed,
    );
  }

  if (order === 2) {
    if (stage === "awal") {
      return pickBySeed(
        [
          "Petunjuknya tipis, tapi polanya mulai kebaca.",
          "Situasi awal ini menipu, aku pecah kode gerak lawan.",
          "Aku baca medan dulu, baru lempar serangan pembuka.",
        ],
        seed,
      );
    }
    if (stage === "tengah") {
      return pickBySeed(
        [
          "Tekanan naik, sekarang waktunya adaptasi cepat.",
          "Lawan ubah pola, aku balas dengan ritme yang lebih tajam.",
          "Pertarungan makin liar, aku pindah mode ofensif.",
        ],
        seed,
      );
    }
    return pickBySeed(
      [
        "Bagian akhir tinggal sedikit, semua harus presisi.",
        "Ini fase penutup, aku jaga eksekusi biar bersih.",
        "Penentuan terakhir, jangan kasih celah balik.",
      ],
      seed,
    );
  }

  if (stage === "awal") {
    return pickBySeed(
      [
        "Gerak ke titik berikut, jangan kasih lawan jeda.",
        "Aku dorong tempo, kuasai arena sejak awal.",
        "Buka ruang serang, paksa lawan keluar dari ritmenya.",
      ],
      seed,
    );
  }
  if (stage === "tengah") {
    return pickBySeed(
      [
        "Balikkan momentum, jangan kasih ruang serangan balik.",
        "Putar keadaan sekarang, kendalikan pertarungan sampai akhir.",
        "Tekan terus, jangan biarkan lawan bangun ulang formasi.",
      ],
      seed,
    );
  }
  return pickBySeed(
    [
      "Tutup babak ini dengan resolusi yang jelas dan kuat.",
      "Akhiri panel ini dengan kemenangan yang tegas.",
      "Finalisasi adegan ini, sisakan impact yang besar.",
    ],
    seed,
  );
}

function thematicLine(
  theme: Theme,
  stage: "awal" | "tengah" | "akhir",
  order: number,
  seed: number,
): string {
  if (theme === "mudik_ramadhan") {
    return mudikLine(stage, order, seed);
  }
  return adventureLine(stage, order, seed);
}

const GENERIC_DIALOGUE_PATTERNS = [
  /situasi berubah/i,
  /aku harus ambil keputusan sekarang/i,
  /aku harus menyesuaikan strategi/i,
  /aku terus maju/i,
  /aku lanjutkan/i,
  /target belum tercapai/i,
  /ini belum selesai/i,
];

const GENERIC_ACTION_PATTERNS = [
  /^aksi cell/i,
  /^konsekuensi langsung/i,
  /^transisi aksi/i,
  /^aksi reaksi panel/i,
  /^kelanjutan aksi/i,
];

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function shouldRewriteDialogue(text: string | undefined): boolean {
  const normalized = normalizeText(text ?? "");
  if (normalized.length < 8) {
    return true;
  }
  return GENERIC_DIALOGUE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function shouldRewriteAction(text: string | undefined): boolean {
  const normalized = normalizeText(text ?? "");
  if (normalized.length < 12) {
    return true;
  }
  return GENERIC_ACTION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function buildCellDialogue(args: {
  beat: string;
  panelIndex: number;
  panelCount: number;
  order: number;
  theme: Theme;
}): string {
  const beatText = shortBeat(args.beat);
  const stage = stageLabel(args.panelIndex, args.panelCount);
  const seed = args.panelIndex * 97 + args.order * 13;

  if (args.order === 1) {
    return `${beatText}.`;
  }

  const line = thematicLine(args.theme, stage, args.order, seed);
  if (args.order === 2) {
    return line;
  }
  return line;
}

export function buildCellAction(args: {
  beat: string;
  panelIndex: number;
  panelCount: number;
  order: number;
  totalCells: number;
}): string {
  const beatText = shortBeat(args.beat);
  const anchor = beatAnchor(args.beat);
  if (args.order === 1) {
    return `Pembuka visual peristiwa utama: ${beatText}.`;
  }
  if (args.order === args.totalCells) {
    return `Gerak akhir yang menuntaskan momen ${anchor}.`;
  }
  return `Gerak lanjutan yang memperjelas momen ${anchor}.`;
}
