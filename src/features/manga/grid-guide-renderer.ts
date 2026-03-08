import { PanelSpec } from "./types";

type SharpFactory = ((input: Buffer | string) => {
  png(): { toBuffer(): Promise<Buffer> };
}) | null;

let sharpImportPromise: Promise<SharpFactory | null> | null = null;

async function loadSharp(): Promise<SharpFactory | null> {
  if (!sharpImportPromise) {
    sharpImportPromise = import("sharp")
      .then((module) => ((module as { default?: SharpFactory }).default ?? (module as unknown as SharpFactory)))
      .catch((error) => {
        console.warn("[grid-guide-renderer] sharp unavailable", error);
        return null;
      });
  }

  return sharpImportPromise;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function buildGridGuideSvg(panel: PanelSpec, width: number, height: number): string {
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />`,
    `<rect x="18" y="18" width="${width - 36}" height="${height - 36}" fill="none" stroke="#111111" stroke-width="8" rx="12" />`,
  ];

  for (const cell of panel.cellPlan) {
    const rect = cell.rect;
    if (!rect) {
      continue;
    }

    const x = Math.round(rect.x * width);
    const y = Math.round(rect.y * height);
    const w = Math.round(rect.w * width);
    const h = Math.round(rect.h * height);
    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#111111" stroke-width="6" rx="8" />`,
    );
  }

  parts.push("</svg>");
  return parts.join("");
}

export async function renderGridGuideImage(args: { panel: PanelSpec }): Promise<Buffer | null> {
  const sharpModule = await loadSharp();
  if (!sharpModule) {
    return null;
  }

  const svg = buildGridGuideSvg(args.panel, 1024, 1536);
  return sharpModule(Buffer.from(svg)).png().toBuffer();
}
