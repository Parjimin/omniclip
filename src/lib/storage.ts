import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

export function sessionDir(sessionId: string) {
  return path.join(STORAGE_ROOT, "sessions", sessionId);
}

export function jobDir(jobId: string) {
  return path.join(STORAGE_ROOT, "jobs", jobId);
}

export async function ensureDir(dirPath: string) {
  await mkdir(dirPath, { recursive: true });
}

export async function saveBinaryFile(
  filePath: string,
  data: Uint8Array | Buffer,
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, data);
}

export async function readBinaryFile(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

export function stylePackDir(artStyle: string) {
  const folder = artStyle.replace(/_/g, "-");
  return path.join(process.cwd(), "public", "style-packs", folder);
}

export function gameAssetsDir() {
  return path.join(process.cwd(), "public", "game-assets");
}
