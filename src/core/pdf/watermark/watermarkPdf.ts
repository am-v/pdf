/**
 * Standalone Functional Core Module: Watermark PDF
 * Framework-independent pure TypeScript operation using pdf-lib.
 */

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  hexToRgb
} from '../../shared';
import type { WatermarkPdfOptions, WatermarkPdfResult } from './watermarkPdf.types';

/**
 * Stamps a centered, rotated, semi-transparent watermark onto PDF pages.
 *
 * @param options WatermarkPdfOptions configuring buffer, text, opacity, size, angle, etc.
 * @returns Promise resolving to WatermarkPdfResult.
 * @throws {PdfValidationError} If buffer is invalid or watermark text is empty.
 * @throws {PdfCorruptError} If document cannot be parsed or serialized.
 */
export async function watermarkPdf(options: WatermarkPdfOptions): Promise<WatermarkPdfResult> {
  const {
    buffer,
    text,
    opacity = 0.3,
    fontSize = 48,
    rotation = 45,
    colorHex = '#000000',
    pagesToWatermark,
    fileName = 'document',
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Watermark operation was cancelled.');
  }

  // 1. Validate binary input and parameters
  validatePdfBuffer(buffer, fileName);

  if (!text || text.trim().length === 0) {
    throw new PdfValidationError('Watermark text cannot be empty.');
  }

  if (fontSize <= 0 || !Number.isFinite(fontSize)) {
    throw new PdfValidationError('Font size must be a positive number.');
  }

  const clampedOpacity = Math.max(0, Math.min(1, opacity));

  if (onProgress) onProgress(10);

  // 2. Load PDF document
  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(buffer, { throwOnInvalidObject: false });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new PdfCorruptError(`"${fileName}" could not be opened (${msg}).`, err);
  }

  let totalDocPages: number;
  try {
    totalDocPages = pdfDoc.getPageCount();
  } catch (err: unknown) {
    throw new PdfCorruptError(`"${fileName}" pages could not be read (document index may be damaged).`, err);
  }

  if (totalDocPages === 0) {
    throw new PdfValidationError(`"${fileName}" contains no readable pages.`);
  }

  // 3. Embed font and parse color
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const colorComponents = hexToRgb(colorHex);
  const watermarkColor = rgb(colorComponents.r, colorComponents.g, colorComponents.b);

  if (onProgress) onProgress(30);

  // 4. Determine target pages
  const pageIndicesToStamp = new Set<number>();
  if (pagesToWatermark && pagesToWatermark.length > 0) {
    for (const pageNum of pagesToWatermark) {
      if (Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= totalDocPages) {
        pageIndicesToStamp.add(pageNum - 1);
      }
    }
  } else {
    for (let i = 0; i < totalDocPages; i++) {
      pageIndicesToStamp.add(i);
    }
  }

  const allPages = pdfDoc.getPages();
  let stampedCount = 0;

  for (let idx = 0; idx < totalDocPages; idx++) {
    if (signal?.aborted) {
      throw new PdfValidationError('Watermark operation was cancelled.');
    }

    if (!pageIndicesToStamp.has(idx)) {
      continue;
    }

    const page = allPages[idx];
    const { width, height } = page.getSize();

    // Center the text on the page: pdf-lib draws from the unrotated baseline start
    // and rotates about it. Offset by half the advance along the rotated axis
    // and negate angle to match visual clockwise-positive rotation preview.
    const tw = font.widthOfTextAtSize(text, fontSize);
    const rad = (-rotation * Math.PI) / 180;
    const cap = font.heightAtSize(fontSize) * 0.35;
    const x = width / 2 - (tw / 2) * Math.cos(rad) + cap * Math.sin(rad);
    const y = height / 2 - (tw / 2) * Math.sin(rad) - cap * Math.cos(rad);

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: watermarkColor,
      opacity: clampedOpacity,
      rotate: degrees(-rotation)
    });

    stampedCount++;

    if (onProgress && totalDocPages > 0) {
      const currentPct = Math.round(30 + ((idx + 1) / totalDocPages) * 50);
      onProgress(currentPct);
    }
  }

  if (onProgress) onProgress(85);

  // 5. Serialize output document
  let outputBytes: Uint8Array;
  try {
    outputBytes = await pdfDoc.save({ useObjectStreams: true });
  } catch (err) {
    throw new PdfCorruptError('Failed to serialize watermarked document.', err);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: outputBytes,
    pageCount: totalDocPages,
    watermarkedPageCount: stampedCount,
    byteLength: outputBytes.byteLength
  };
}
