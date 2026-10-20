/**
 * Test Utility: In-Memory Synthetic PDF Generator
 * Creates small, valid, spec-compliant PDF byte buffers for fast unit testing.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface SamplePdfOptions {
  pageCount?: number;
  title?: string;
  author?: string;
  width?: number;
  height?: number;
}

/**
 * Creates a valid PDF binary in memory without external assets.
 */
export async function createSamplePdf(options: SamplePdfOptions = {}): Promise<Uint8Array> {
  const {
    pageCount = 2,
    title = 'Test Document',
    author = 'pdf.com.in Test Harness',
    width = 400,
    height = 600
  } = options;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(title);
  pdfDoc.setAuthor(author);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([width, height]);
    page.drawText(`Page ${i} of ${pageCount}`, {
      x: 50,
      y: height - 100,
      size: 16,
      font,
      color: rgb(0.15, 0.39, 0.92) // Primary blue
    });
  }

  return await pdfDoc.save();
}
