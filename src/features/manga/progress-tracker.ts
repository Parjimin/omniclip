export const PROGRESS_STAGES = {
  preprocess: { start: 0, end: 10, label: "Preprocess input" },
  drafting: { start: 10, end: 30, label: "Menyusun outline dan prompt" },
  rendering: { start: 30, end: 90, label: "Generate panel" },
  packaging: { start: 90, end: 100, label: "Menyusun output" },
} as const;

export function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function panelRenderingProgress(current: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  const done = Math.max(0, Math.min(current, total));
  const slot = Math.max(1, Math.min(total, done + 1));
  return (slot / total) * 100;
}
