import JSZip from "jszip";

export async function buildPanelsZip(input: {
  files: Array<{ fileName: string; data: Buffer }>;
}): Promise<Buffer> {
  const zip = new JSZip();

  for (const file of input.files) {
    zip.file(file.fileName, file.data);
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
