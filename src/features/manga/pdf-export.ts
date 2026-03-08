import { PDFDocument } from "pdf-lib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function isPng(buffer: Buffer) {
  return buffer.subarray(0, 8).equals(PNG_SIGNATURE);
}

export async function buildPanelsPdf(input: {
  files: Array<{ fileName: string; data: Buffer }>;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  for (const panel of input.files) {
    const image = isPng(panel.data)
      ? await pdfDoc.embedPng(panel.data)
      : await pdfDoc.embedJpg(panel.data);

    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
