/**
 * Standalone Functional Core Module: Page Numbers
 * Framework-independent pure TypeScript operation using pdf-lib.
 */

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import {
  validatePdfBuffer,
  PdfValidationError,
  PdfCorruptError,
  hexToRgb
} from '../../shared';
import type { PageNumberOptions, PageNumberResult } from './pageNumbers.types';

/**
 * Stamps page numbers onto a PDF document with configurable format, position, margin, and typography.
 *
 * @param options PageNumberOptions configuring buffer, format, position, font, etc.
 * @returns Promise resolving to PageNumberResult.
 * @throws {PdfValidationError} If buffer is invalid or format is malformed.
 * @throws {PdfCorruptError} If document cannot be parsed or written.
 */
export async function pageNumbers(options: PageNumberOptions): Promise<PageNumberResult> {
  const {
    buffer,
    format = 'Page {n} of {total}',
    position = 'bottom-center',
    startFrom = 1,
    fontSize = 12,
    colorHex = '#6B7280',
    margin = 30,
    pagesToNumber,
    fileName = 'document',
    onProgress,
    signal
  } = options;

  if (signal?.aborted) {
    throw new PdfValidationError('Page numbering operation was cancelled.');
  }

  // 1. Validate binary input
  validatePdfBuffer(buffer, fileName);

  if (fontSize <= 0 || !Number.isFinite(fontSize)) {
    throw new PdfValidationError('Font size must be a positive number.');
  }

  if (margin < 0 || !Number.isFinite(margin)) {
    throw new PdfValidationError('Margin must be a non-negative number.');
  }

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
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const colorComponents = hexToRgb(colorHex);
  const textColor = rgb(colorComponents.r, colorComponents.g, colorComponents.b);

  if (onProgress) onProgress(30);

  // 4. Determine which pages to stamp
  const pageIndicesToStamp = new Set<number>();
  if (pagesToNumber && pagesToNumber.length > 0) {
    for (const pageNum of pagesToNumber) {
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
  const totalCountForFormat = totalDocPages + (startFrom - 1);

  for (let idx = 0; idx < totalDocPages; idx++) {
    if (signal?.aborted) {
      throw new PdfValidationError('Page numbering operation was cancelled.');
    }

    if (!pageIndicesToStamp.has(idx)) {
      continue;
    }

    const page = allPages[idx];
    const { width, height } = page.getSize();
    const currentNumber = idx + startFrom;

    const label = format
      .replace(/\{n\}/g, currentNumber.toString())
      .replace(/\{total\}/g, totalCountForFormat.toString());

    const textWidth = font.widthOfTextAtSize(label, fontSize);

    // Compute standard coordinates
    let x = width / 2 - textWidth / 2;
    let y = margin;

    if (position.includes('left')) {
      x = margin;
    } else if (position.includes('right')) {
      x = width - textWidth - margin;
    }

    if (position.includes('top')) {
      y = height - margin - fontSize;
    }

    // Check page rotation
    const rotation = page.getRotation();
    const angle = ((Math.round(rotation.angle) % 360) + 360) % 360;

    if (angle === 0) {
      page.drawText(label, {
        x,
        y,
        size: fontSize,
        font,
        color: textColor
      });
    } else {
      // For rotated pages, draw with rotation angle
      page.drawText(label, {
        x,
        y,
        size: fontSize,
        font,
        color: textColor,
        rotate: degrees(angle)
      });
    }

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
    throw new PdfCorruptError('Failed to serialize document with page numbers.', err);
  }

  if (onProgress) onProgress(100);

  return {
    buffer: outputBytes,
    pageCount: totalDocPages,
    numberedPageCount: stampedCount,
    byteLength: outputBytes.byteLength
  };
}
