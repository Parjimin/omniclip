import { PanelCellPlan, PanelLayout, PanelSpec } from "./types";

interface TemplateCell {
  id: string;
  position: string;
  rect: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  bubble: {
    x: number;
    y: number;
    align: "left" | "right" | "center";
  };
}

export interface GridTemplate {
  id: string;
  name: string;
  cells: TemplateCell[];
}

const TEMPLATES: GridTemplate[] = [
  {
    id: "full_hero",
    name: "Single full panel",
    cells: [
      {
        id: "A",
        position: "full",
        rect: { x: 0.04, y: 0.04, w: 0.92, h: 0.92 },
        bubble: { x: 0.72, y: 0.14, align: "right" },
      },
    ],
  },
  {
    id: "duo_vertical",
    name: "Duo vertical split",
    cells: [
      {
        id: "A",
        position: "kanan",
        rect: { x: 0.04, y: 0.04, w: 0.44, h: 0.92 },
        bubble: { x: 0.36, y: 0.16, align: "right" },
      },
      {
        id: "B",
        position: "kiri",
        rect: { x: 0.52, y: 0.04, w: 0.44, h: 0.92 },
        bubble: { x: 0.68, y: 0.16, align: "left" },
      },
    ],
  },
  {
    id: "duo_horizontal",
    name: "Duo horizontal split",
    cells: [
      {
        id: "A",
        position: "atas",
        rect: { x: 0.04, y: 0.04, w: 0.92, h: 0.44 },
        bubble: { x: 0.72, y: 0.14, align: "right" },
      },
      {
        id: "B",
        position: "bawah",
        rect: { x: 0.04, y: 0.52, w: 0.92, h: 0.44 },
        bubble: { x: 0.28, y: 0.62, align: "left" },
      },
    ],
  },
  {
    id: "triple_stack",
    name: "Triple stack",
    cells: [
      {
        id: "A",
        position: "atas",
        rect: { x: 0.04, y: 0.04, w: 0.92, h: 0.28 },
        bubble: { x: 0.74, y: 0.1, align: "right" },
      },
      {
        id: "B",
        position: "tengah",
        rect: { x: 0.04, y: 0.36, w: 0.92, h: 0.28 },
        bubble: { x: 0.34, y: 0.42, align: "left" },
      },
      {
        id: "C",
        position: "bawah",
        rect: { x: 0.04, y: 0.68, w: 0.92, h: 0.28 },
        bubble: { x: 0.74, y: 0.74, align: "right" },
      },
    ],
  },
  {
    id: "quad_grid",
    name: "Quad grid",
    cells: [
      {
        id: "A",
        position: "kanan atas",
        rect: { x: 0.04, y: 0.04, w: 0.44, h: 0.44 },
        bubble: { x: 0.36, y: 0.12, align: "right" },
      },
      {
        id: "B",
        position: "kiri atas",
        rect: { x: 0.52, y: 0.04, w: 0.44, h: 0.44 },
        bubble: { x: 0.68, y: 0.12, align: "left" },
      },
      {
        id: "C",
        position: "kanan bawah",
        rect: { x: 0.04, y: 0.52, w: 0.44, h: 0.44 },
        bubble: { x: 0.34, y: 0.62, align: "right" },
      },
      {
        id: "D",
        position: "kiri bawah",
        rect: { x: 0.52, y: 0.52, w: 0.44, h: 0.44 },
        bubble: { x: 0.66, y: 0.62, align: "left" },
      },
    ],
  },
  {
    id: "asym_topwide",
    name: "Top wide + bottom duo",
    cells: [
      {
        id: "A",
        position: "atas penuh",
        rect: { x: 0.04, y: 0.04, w: 0.92, h: 0.42 },
        bubble: { x: 0.72, y: 0.12, align: "right" },
      },
      {
        id: "B",
        position: "kanan bawah",
        rect: { x: 0.04, y: 0.5, w: 0.44, h: 0.46 },
        bubble: { x: 0.34, y: 0.6, align: "right" },
      },
      {
        id: "C",
        position: "kiri bawah",
        rect: { x: 0.52, y: 0.5, w: 0.44, h: 0.46 },
        bubble: { x: 0.66, y: 0.6, align: "left" },
      },
    ],
  },
  {
    id: "asym_right_tall",
    name: "Right tall + left stack",
    cells: [
      {
        id: "A",
        position: "kanan tinggi",
        rect: { x: 0.04, y: 0.04, w: 0.46, h: 0.92 },
        bubble: { x: 0.34, y: 0.14, align: "right" },
      },
      {
        id: "B",
        position: "kiri atas",
        rect: { x: 0.54, y: 0.04, w: 0.42, h: 0.44 },
        bubble: { x: 0.68, y: 0.12, align: "left" },
      },
      {
        id: "C",
        position: "kiri bawah",
        rect: { x: 0.54, y: 0.52, w: 0.42, h: 0.44 },
        bubble: { x: 0.68, y: 0.62, align: "left" },
      },
    ],
  },
  {
    id: "comic_five",
    name: "Five cell comic",
    cells: [
      {
        id: "A",
        position: "kanan atas kecil",
        rect: { x: 0.04, y: 0.04, w: 0.3, h: 0.3 },
        bubble: { x: 0.24, y: 0.1, align: "right" },
      },
      {
        id: "B",
        position: "kiri atas lebar",
        rect: { x: 0.36, y: 0.04, w: 0.6, h: 0.3 },
        bubble: { x: 0.72, y: 0.1, align: "left" },
      },
      {
        id: "C",
        position: "tengah",
        rect: { x: 0.04, y: 0.36, w: 0.92, h: 0.28 },
        bubble: { x: 0.7, y: 0.42, align: "right" },
      },
      {
        id: "D",
        position: "kanan bawah",
        rect: { x: 0.04, y: 0.68, w: 0.44, h: 0.28 },
        bubble: { x: 0.34, y: 0.74, align: "right" },
      },
      {
        id: "E",
        position: "kiri bawah",
        rect: { x: 0.52, y: 0.68, w: 0.44, h: 0.28 },
        bubble: { x: 0.66, y: 0.74, align: "left" },
      },
    ],
  },
  {
    id: "cinematic_wide",
    name: "Cinematic wide focus",
    cells: [
      {
        id: "A",
        position: "atas tipis",
        rect: { x: 0.04, y: 0.04, w: 0.92, h: 0.22 },
        bubble: { x: 0.74, y: 0.08, align: "right" },
      },
      {
        id: "B",
        position: "tengah besar",
        rect: { x: 0.04, y: 0.3, w: 0.92, h: 0.44 },
        bubble: { x: 0.28, y: 0.36, align: "left" },
      },
      {
        id: "C",
        position: "bawah tipis",
        rect: { x: 0.04, y: 0.78, w: 0.92, h: 0.18 },
        bubble: { x: 0.72, y: 0.82, align: "right" },
      },
    ],
  },
  {
    id: "diagonal_energy",
    name: "Diagonal energy split",
    cells: [
      {
        id: "A",
        position: "atas kanan",
        rect: { x: 0.04, y: 0.04, w: 0.5, h: 0.44 },
        bubble: { x: 0.38, y: 0.12, align: "right" },
      },
      {
        id: "B",
        position: "atas kiri",
        rect: { x: 0.5, y: 0.04, w: 0.46, h: 0.34 },
        bubble: { x: 0.7, y: 0.12, align: "left" },
      },
      {
        id: "C",
        position: "bawah kanan",
        rect: { x: 0.04, y: 0.52, w: 0.42, h: 0.44 },
        bubble: { x: 0.3, y: 0.62, align: "right" },
      },
      {
        id: "D",
        position: "bawah kiri",
        rect: { x: 0.48, y: 0.42, w: 0.48, h: 0.54 },
        bubble: { x: 0.7, y: 0.5, align: "left" },
      },
    ],
  },
];

const classicGridRotation = ["duo_vertical", "duo_horizontal", "triple_stack", "quad_grid"];
const dynamicGridRotation = ["comic_five", "asym_topwide", "asym_right_tall", "diagonal_energy", "quad_grid"];
const cinematicGridRotation = ["cinematic_wide", "full_hero", "asym_topwide", "duo_horizontal"];

function templateById(templateId: string): GridTemplate | undefined {
  return TEMPLATES.find((item) => item.id === templateId);
}

export function getGridTemplate(templateId: string): GridTemplate {
  return templateById(templateId) ?? TEMPLATES[0];
}

function pickTemplateId(index: number, panelLayout: PanelLayout): string {
  const offset = Math.max(0, index - 1);
  if (panelLayout === "classic_grid") {
    return classicGridRotation[offset % classicGridRotation.length];
  }
  if (panelLayout === "cinematic_wide") {
    return cinematicGridRotation[offset % cinematicGridRotation.length];
  }
  return dynamicGridRotation[offset % dynamicGridRotation.length];
}

function shortBeat(beat: string): string {
  const cleaned = beat.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 74) {
    return cleaned;
  }
  return `${cleaned.slice(0, 71).trimEnd()}...`;
}

function fallbackCellText(panel: PanelSpec, order: number) {
  const beat = shortBeat(panel.beat);
  if (order === 1) {
    return `${beat}.`;
  }
  if (order === 2) {
    return `Respons langsung karakter terhadap: ${beat.toLowerCase()}.`;
  }
  return "Gerak akhir yang menuntaskan adegan ini.";
}

function normalizeDialogue(text: string | undefined, fallback: string): string {
  const normalized = text?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export function applyGridTemplate(args: {
  panel: PanelSpec;
  panelLayout: PanelLayout;
}): PanelSpec {
  const templateId =
    args.panel.templateId?.trim() ||
    pickTemplateId(args.panel.index, args.panelLayout);
  const template = getGridTemplate(templateId);
  const sourceCells = [...(args.panel.cellPlan ?? [])].sort((a, b) => a.order - b.order);

  const normalizedCells: PanelCellPlan[] = template.cells.map((cell, idx) => {
    const source = sourceCells[idx];
    const fallbackDialogue = fallbackCellText(args.panel, idx + 1);
    return {
      order: idx + 1,
      cellId: cell.id,
      position: source?.position ?? cell.position,
      shot: source?.shot ?? (idx === 0 ? "close-up" : idx % 2 === 0 ? "wide" : "medium"),
      action:
        source?.action ??
        `Aksi cell ${cell.id} menyorot beat utama: ${shortBeat(args.panel.beat)}.`,
      expression: source?.expression ?? args.panel.emotion,
      dialogue: normalizeDialogue(source?.dialogue, fallbackDialogue),
      rect: cell.rect,
      bubble: cell.bubble,
    };
  });

  return {
    ...args.panel,
    templateId: template.id,
    layoutGuide: template.name,
    readingOrder: "right_to_left",
    cellPlan: normalizedCells,
  };
}
